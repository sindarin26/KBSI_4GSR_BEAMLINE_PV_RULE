#!/usr/bin/env node
// Build outputs/<beamline>/_work/review_queue.json and per-source source_lists.
//
// Extraction strategy:
//   .json  → deterministic: parse items array, tag sourceLabel: deterministic_json
//   .xml   → deterministic: parse motor/axis elements, tag sourceLabel: deterministic_xml
//   .md    → deterministic for Markdown table rows (| pv | ... |), tag deterministic_md_table
//            non-table .md lines and all .txt → read from raw_extracted_pvs.yaml, tag agent_extraction
//   Merge per-source rows, assign seq 1-N, save queue + source_lists.

const fs = require("fs");
const path = require("path");
const {
  rel,
  posixRel,
  listFiles,
  loadRegistry,
  loadRawExtraction,
  loadExceptionFrontmatters,
} = require("./lib/pv_workbench");

const beamline = process.argv[2];
// --rebuild: recognized flag for headless CI use; behavior is identical to a normal run
const isRebuild = process.argv.includes("--rebuild");
if (!beamline || process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error("Usage: node scripts/build_review_queue.js <beamline> [--rebuild]");
  process.exit(2);
}
if (isRebuild) {
  console.log(`Rebuilding review queue for ${beamline} (headless mode)...`);
}

const reviewDir = rel("reviews", beamline);
const decisionsPath = path.join(reviewDir, "review_decisions.json");
const workDir = rel("outputs", beamline, "_work");
const sourceListsDir = path.join(workDir, "source_lists");
const queuePath = path.join(workDir, "review_queue.json");

const REVIEW_STATUSES = [
  "needs_input", "accepted", "approved", "edited",
  "exception", "skipped", "proposal", "fixed",
];

// ── Load all inputs ────────────────────────────────────────────────────────────

let registry;
try {
  registry = loadRegistry(beamline).data;
} catch {
  registry = { pvs: [] };
}

const raw = loadRawExtraction(beamline).data;
if (!raw || !Array.isArray(raw.entries)) {
  console.error(`FAIL: missing or invalid outputs/${beamline}/_work/raw_extracted_pvs.yaml`);
  process.exit(1);
}

const registryByRaw = new Map();
for (const entry of registry.pvs || []) {
  const rawId = entry.source_trace && entry.source_trace.raw_id;
  if (rawId) registryByRaw.set(rawId, entry);
}

const exceptionIdsByRaw = new Map();
for (const exception of loadExceptionFrontmatters(beamline)) {
  const data = exception.data || {};
  for (const rawId of data.raw_ids || []) {
    if (!exceptionIdsByRaw.has(rawId)) exceptionIdsByRaw.set(rawId, []);
    exceptionIdsByRaw.get(rawId).push(data.id || path.basename(exception.path, ".md"));
  }
}

const existingByRaw = new Map();
if (fs.existsSync(decisionsPath)) {
  try {
    const saved = JSON.parse(fs.readFileSync(decisionsPath, "utf8"));
    if (Array.isArray(saved)) {
      for (const row of saved) {
        if (row.rawId) existingByRaw.set(row.rawId, row);
      }
    }
  } catch {
    // non-fatal; existing decisions are optional
  }
}

// ── Build rows from raw_extracted_pvs.yaml ────────────────────────────────────

const rawRows = raw.entries.map((rawEntry, index) => {
  const registryEntry = registryByRaw.get(rawEntry.raw_id);
  const exceptionIds = exceptionIdsByRaw.get(rawEntry.raw_id) || [];
  const base = defaultRow(index + 1, rawEntry, registryEntry, exceptionIds);
  const existing = existingByRaw.get(rawEntry.raw_id);
  const merged = existing ? { ...base, ...existing, orphan: false } : { ...base, orphan: false };
  return normalizeRow(merged, index);
});

// ── Overlay deterministic extraction for structured sources ───────────────────
// Re-extract .json/.xml/.md-table sources and tag matching rows with
// sourceLabel to distinguish deterministic vs agent-extracted rows.
// Matching is by (sourceId, source PV string) which is unique within a source.

for (const source of raw.extracted_from || []) {
  if (source.source_state !== "included") continue;
  const absPath = rel(...source.source_id.split("/"));
  if (!fs.existsSync(absPath)) continue;

  const ext = path.extname(source.source_id).toLowerCase();
  if (ext === ".json") {
    overlayDeterministic(source.source_id, extractFromJson(absPath, source.source_id), rawRows);
  } else if (ext === ".xml") {
    overlayDeterministic(source.source_id, extractFromXml(absPath, source.source_id), rawRows);
  } else if (ext === ".md") {
    overlayDeterministic(source.source_id, extractFromMdTables(absPath, source.source_id), rawRows);
  }
}

// ── Add orphan rows ────────────────────────────────────────────────────────────

for (const [rawId, existing] of existingByRaw.entries()) {
  if (!rawRows.some((row) => row.rawId === rawId)) {
    rawRows.push(normalizeRow({ ...existing, orphan: true }, rawRows.length));
  }
}

// ── Re-sequence and write source_lists ────────────────────────────────────────

fs.mkdirSync(sourceListsDir, { recursive: true });

const bySource = new Map();
for (const row of rawRows) {
  const sourceId = row.sourceId || "__unknown__";
  if (!bySource.has(sourceId)) bySource.set(sourceId, []);
  bySource.get(sourceId).push(row);
}

let seq = 0;
const allRows = [];
for (const [sourceId, sourceRows] of bySource.entries()) {
  const resequenced = sourceRows.map((row) => {
    seq += 1;
    return { ...row, seq };
  });
  allRows.push(...resequenced);
  const basename = path.basename(sourceId).replace(/[^A-Za-z0-9._-]/g, "_");
  fs.writeFileSync(
    path.join(sourceListsDir, `${basename}.rows.json`),
    `${JSON.stringify(resequenced, null, 2)}\n`,
  );
}

// ── Write review_queue.json ────────────────────────────────────────────────────

fs.writeFileSync(queuePath, `${JSON.stringify(allRows, null, 2)}\n`);

console.log(`Built review queue for ${beamline}: ${allRows.length} rows`);
console.log(`  → ${posixRel(queuePath)}`);
console.log(`  → ${posixRel(sourceListsDir)}/ (${bySource.size} source file(s))`);

// ── Deterministic extractors ───────────────────────────────────────────────────

function extractFromJson(filePath, sourceId) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.warn(`WARN: cannot parse ${sourceId}: ${err.message}`);
    return [];
  }
  const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  return items.map((item, index) => ({
    anchor: `item:${index + 1}`,
    sourceLabel: "deterministic_json",
    rawPv: String(item.pv || ""),
    rawGroup: item.group || null,
    egu: String(item.egu || ""),
    ioc: String(item.ioc || ""),
  }));
}

function extractFromXml(filePath, sourceId) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.warn(`WARN: cannot read ${sourceId}: ${err.message}`);
    return [];
  }
  const results = [];
  let index = 0;
  const motorRe = /<(?:motor|axis)\s+([^>]+?)\/>/gi;
  for (const match of text.matchAll(motorRe)) {
    index += 1;
    const attrs = parseXmlAttrs(match[1]);
    if (!attrs.pv) continue;
    results.push({
      anchor: `element:${index}`,
      sourceLabel: "deterministic_xml",
      rawPv: attrs.pv,
      rawGroup: attrs.group || null,
      egu: attrs.egu || "",
      ioc: attrs.ioc || "",
    });
  }
  return results;
}

function extractFromMdTables(filePath, sourceId) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.warn(`WARN: cannot read ${sourceId}: ${err.message}`);
    return [];
  }
  const results = [];
  const lines = text.split(/\r?\n/);
  let tableIndex = 0;
  let headers = null;
  let pvColIndex = -1;
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      headers = null;
      pvColIndex = -1;
      inTable = false;
      continue;
    }
    const cells = trimmed.split("|").map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    if (!inTable) {
      const isHeader = cells.some((c) => /^pv$/i.test(c) || /^old pv$/i.test(c));
      if (isHeader) {
        headers = cells.map((c) => c.toLowerCase().replace(/\s+/g, "_"));
        pvColIndex = headers.findIndex((h) => h === "pv" || h === "old_pv");
        inTable = true;
      }
      continue;
    }
    if (/^[|\s:-]+$/.test(trimmed)) continue; // separator row
    if (pvColIndex < 0 || pvColIndex >= cells.length) continue;
    const pvVal = cells[pvColIndex];
    if (!pvVal || pvVal === "pv" || pvVal === "old pv") continue;
    tableIndex += 1;
    const eGuIdx = headers ? headers.indexOf("egu") : -1;
    const iocIdx = headers ? headers.indexOf("ioc") : -1;
    results.push({
      anchor: `table_row:${tableIndex}`,
      sourceLabel: "deterministic_md_table",
      rawPv: pvVal,
      rawGroup: null,
      egu: eGuIdx >= 0 && eGuIdx < cells.length ? cells[eGuIdx] : "",
      ioc: iocIdx >= 0 && iocIdx < cells.length ? cells[iocIdx] : "",
    });
  }
  return results;
}

function overlayDeterministic(sourceId, detItems, rows) {
  const byPv = new Map();
  for (const row of rows) {
    if (row.sourceId === sourceId && row.source) {
      byPv.set(row.source, row);
    }
  }
  for (const item of detItems) {
    if (item.rawPv) {
      const row = byPv.get(item.rawPv);
      if (row) row.sourceLabel = item.sourceLabel;
    }
  }
}

// ── Row builders (mirrors review_server.js) ───────────────────────────────────

function defaultRow(seq, rawEntry, registryEntry, exceptionIds) {
  const trace = rawEntry.source_trace || {};
  const metadata = rawEntry.raw_metadata || {};
  const reviewStatus = registryEntry
    ? "accepted"
    : rawEntry.status === "skipped"
      ? "skipped"
      : exceptionIds.length > 0
        ? "exception"
        : "needs_input";
  const section = registryEntry ? registryEntry.section : "BL";
  const port = registryEntry ? registryEntry.port : "";
  const area = registryEntry ? registryEntry.area : rawEntry.raw_area || "";
  const dev = registryEntry ? registryEntry.device : rawEntry.raw_device || "";
  const subdev = registryEntry ? registryEntry.subdevice : rawEntry.raw_subdevice || "";
  const signal = registryEntry
    ? registryEntry.signal
    : rawEntry.raw_signal || rawEntry.raw_axis_or_function || "";
  const note =
    registryEntry && Array.isArray(registryEntry.notes)
      ? registryEntry.notes.join("; ")
      : [
          metadata.source_text || "",
          exceptionIds.length > 0 ? `exception: ${exceptionIds.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("; ");
  return {
    seq,
    rawId: rawEntry.raw_id,
    dataset: beamline,
    reviewStatus,
    section,
    port,
    area,
    dev,
    subdev,
    signal,
    standardPv: registryEntry
      ? registryEntry.pv
      : renderPv(section, port, area, dev, subdev, signal),
    source: registryEntry
      ? registryEntry.source_pv || rawEntry.raw_source_pv || rawEntry.raw_pv || ""
      : rawEntry.raw_source_pv || rawEntry.raw_pv || "",
    note,
    sourceId: trace.source_id || "",
    sourceLine: trace.source_line === undefined ? null : trace.source_line,
    sourceAnchor: trace.source_anchor || "",
    sourceLabel: "agent_extraction",
    reviewNote: "",
    exceptionIds,
    orphan: false,
    egu: metadata.egu || "",
    ioc: metadata.ioc || "",
  };
}

function normalizeRow(row, index) {
  const normalized = {
    seq: Number.isFinite(Number(row.seq)) ? Number(row.seq) : index + 1,
    rawId: stringValue(row.rawId),
    dataset: stringValue(row.dataset || beamline),
    reviewStatus: REVIEW_STATUSES.includes(row.reviewStatus) ? row.reviewStatus : "needs_input",
    section: upperValue(row.section || "BL"),
    port: upperValue(row.port),
    area: upperValue(row.area),
    dev: upperValue(row.dev),
    subdev: upperValue(row.subdev),
    signal: stringValue(row.signal),
    standardPv: stringValue(row.standardPv),
    source: stringValue(row.source),
    note: stringValue(row.note),
    sourceId: stringValue(row.sourceId),
    sourceLine: row.sourceLine === undefined ? null : row.sourceLine,
    sourceAnchor: stringValue(row.sourceAnchor),
    sourceLabel: row.sourceLabel === undefined ? null : row.sourceLabel,
    reviewNote: stringValue(row.reviewNote),
    exceptionIds: Array.isArray(row.exceptionIds) ? row.exceptionIds.map(String) : [],
    orphan: Boolean(row.orphan),
    legacyStandardPv: stringValue(row.legacyStandardPv),
    egu: stringValue(row.egu),
    ioc: stringValue(row.ioc),
    updatedAt: row.updatedAt || new Date().toISOString(),
  };
  const rendered = renderPv(
    normalized.section, normalized.port, normalized.area,
    normalized.dev, normalized.subdev, normalized.signal,
  );
  if (rendered) normalized.standardPv = rendered;
  return normalized;
}

function renderPv(section, port, area, dev, subdev, signal) {
  if (![section, port, area, dev, subdev, signal].every(Boolean)) return "";
  return `${section}-${port}:${area}-${dev}-${subdev}:${signal}`;
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value);
}

function upperValue(value) {
  return stringValue(value).toUpperCase();
}

function parseXmlAttrs(attrsStr) {
  const attrs = {};
  const re = /(\w+)\s*=\s*"([^"]*)"/g;
  for (const match of attrsStr.matchAll(re)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}
