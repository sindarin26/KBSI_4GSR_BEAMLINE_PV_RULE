#!/usr/bin/env node
// Apply accepted/fixed review decisions to pv_registry.yaml.
//
// Reads:  reviews/<beamline>/review_decisions.json
//         outputs/<beamline>/pv_registry.yaml (existing registry)
//         outputs/<beamline>/_work/raw_extracted_pvs.yaml (metadata lookup, optional)
// Writes: outputs/<beamline>/pv_registry.yaml  (--write only)
//         outputs/<beamline>/PV_REFERENCE.md    (--write only)
//
// Default mode is dry-run: prints a summary of what would change without
// modifying any files. Pass --write to commit the changes.
//
// Exit codes:
//   0  success (dry-run passed, or write completed with no fatal errors)
//   1  fatal error (missing required files, parse failures, write error)
//   2  usage error

const fs = require("fs");
const path = require("path");
const {
  rel,
  posixRel,
  loadRegistry,
  loadRawExtraction,
  loadOutputStatus,
  renderReference,
} = require("./lib/pv_workbench");
const { serializeYaml } = require("./lib/yaml_subset");

const beamline = process.argv[2];
const isWrite = process.argv.includes("--write");
const isDryRun = !isWrite;

if (!beamline || process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error(
    "Usage: node scripts/apply_decisions.js <beamline> [--write]\n" +
    "  Default: dry-run (print diff, do not modify files)\n" +
    "  --write: materialize entries into pv_registry.yaml and re-render PV_REFERENCE.md",
  );
  process.exit(2);
}

// ── Load decisions ─────────────────────────────────────────────────────────────

const decisionsPath = rel("reviews", beamline, "review_decisions.json");
if (!fs.existsSync(decisionsPath)) {
  console.error(`FAIL: missing ${posixRel(decisionsPath)}`);
  process.exit(1);
}

let allDecisions;
try {
  allDecisions = JSON.parse(fs.readFileSync(decisionsPath, "utf8"));
  if (!Array.isArray(allDecisions)) throw new Error("not an array");
} catch (err) {
  console.error(`FAIL: cannot parse ${posixRel(decisionsPath)}: ${err.message}`);
  process.exit(1);
}

// ── Load existing registry ─────────────────────────────────────────────────────

let registryData;
try {
  registryData = loadRegistry(beamline).data;
} catch {
  registryData = null;
}
const existingPvs = registryData ? (registryData.pvs || []) : [];
const existingByRawId = new Map();
const existingPvSet = new Set();
for (const entry of existingPvs) {
  if (entry.source_trace && entry.source_trace.raw_id) {
    existingByRawId.set(entry.source_trace.raw_id, entry);
  }
  if (entry.pv) existingPvSet.add(entry.pv);
}

// ── Load raw extraction for metadata enrichment (optional) ────────────────────

let rawData = null;
let rawByRawId = new Map();
try {
  rawData = loadRawExtraction(beamline).data;
  if (rawData && Array.isArray(rawData.entries)) {
    for (const entry of rawData.entries) {
      if (entry.raw_id) rawByRawId.set(entry.raw_id, entry);
    }
  }
} catch {
  // non-fatal; metadata enrichment from raw is optional
}

// ── Filter candidate rows ──────────────────────────────────────────────────────

const PROMOTABLE_STATUSES = new Set(["accepted", "fixed"]);

const candidates = allDecisions.filter(
  (row) =>
    row.dataset === beamline &&
    PROMOTABLE_STATUSES.has(row.reviewStatus) &&
    !row.orphan,
);

if (candidates.length === 0) {
  console.log(`No accepted/fixed rows for ${beamline} in ${posixRel(decisionsPath)}.`);
  process.exit(0);
}

// ── Validate source-trace presence ────────────────────────────────────────────

const traceErrors = [];
for (const [index, row] of candidates.entries()) {
  const loc = `review_decisions[${index}] (rawId: ${row.rawId || "??"})`;
  if (!row.rawId) traceErrors.push(`${loc} missing rawId — source traceability required`);
  if (!row.sourceId) traceErrors.push(`${loc} missing sourceId — source traceability required`);
  if (!row.sourceAnchor) traceErrors.push(`${loc} missing sourceAnchor — source traceability required`);
}

if (traceErrors.length > 0) {
  for (const e of traceErrors) console.error(`FAIL: ${e}`);
  console.error(`\nSource-trace validation failed: ${traceErrors.length} row(s) are missing`);
  console.error("required traceability fields. Fix the decision rows before applying.");
  process.exit(1);
}

// ── Classify candidates ────────────────────────────────────────────────────────

const alreadyInRegistry = [];
const missingFields = [];
const duplicatePv = [];
const toApply = [];

const newPvSet = new Set(); // PVs from toApply candidates (dedup within batch)

const REQUIRED_FIELDS = ["port", "area", "dev", "subdev", "signal"];

for (const row of candidates) {
  if (existingByRawId.has(row.rawId)) {
    alreadyInRegistry.push(row);
    continue;
  }

  const missing = REQUIRED_FIELDS.filter((f) => !row[f]);
  if (missing.length > 0) {
    missingFields.push({ row, missing });
    continue;
  }

  if (existingPvSet.has(row.standardPv) || newPvSet.has(row.standardPv)) {
    duplicatePv.push(row);
    continue;
  }

  newPvSet.add(row.standardPv);
  toApply.push(row);
}

// ── Print summary ──────────────────────────────────────────────────────────────

const mode = isDryRun ? "DRY-RUN" : "WRITE";
console.log(`\napply_decisions ${mode} for ${beamline}`);
console.log(`  Total candidates (accepted/fixed): ${candidates.length}`);
console.log(`  Already in registry (skip):        ${alreadyInRegistry.length}`);
console.log(`  Missing required fields (conflict): ${missingFields.length}`);
console.log(`  Duplicate rendered PV (conflict):  ${duplicatePv.length}`);
console.log(`  New entries to apply:               ${toApply.length}`);

if (missingFields.length > 0) {
  console.log("\nConflict — missing fields:");
  for (const { row, missing } of missingFields) {
    console.log(`  rawId=${row.rawId}  missing: ${missing.join(", ")}`);
  }
}

if (duplicatePv.length > 0) {
  console.log("\nConflict — duplicate rendered PV:");
  for (const row of duplicatePv) {
    console.log(`  rawId=${row.rawId}  pv=${row.standardPv}`);
  }
}

if (toApply.length > 0) {
  console.log(`\nNew entries (${toApply.length}):`);
  for (const row of toApply) {
    console.log(`  ${row.rawId}  →  ${row.standardPv}`);
  }
}

if (isDryRun) {
  if (toApply.length > 0) {
    console.log(`\nDry-run complete. Pass --write to apply ${toApply.length} new entries.`);
  } else {
    console.log("\nDry-run complete. Nothing to apply.");
  }
  process.exit(0);
}

// ── Apply (--write) ────────────────────────────────────────────────────────────

if (toApply.length === 0) {
  console.log("\nNothing to apply.");
  process.exit(0);
}

const newEntries = toApply.map((row) => buildRegistryEntry(row));
const updatedPvs = [...existingPvs, ...newEntries];
const updatedRegistry = {
  beamline: resolveRegistryBeamline(),
  rulebook_version: "SEO_v2",
  pvs: updatedPvs,
};

const registryPath = rel("outputs", beamline, "pv_registry.yaml");
try {
  fs.writeFileSync(registryPath, `${serializeYaml(updatedRegistry)}\n`);
  console.log(`\nWrote ${posixRel(registryPath)} (+${newEntries.length} entries, total ${updatedPvs.length})`);
} catch (err) {
  console.error(`FAIL: cannot write ${posixRel(registryPath)}: ${err.message}`);
  process.exit(1);
}

// Re-render PV_REFERENCE.md
const referencePath = rel("outputs", beamline, "PV_REFERENCE.md");
try {
  const rendered = renderReference(updatedRegistry);
  fs.writeFileSync(referencePath, rendered);
  console.log(`Wrote ${posixRel(referencePath)}`);
} catch (err) {
  console.error(`WARN: cannot render ${posixRel(referencePath)}: ${err.message}`);
}

console.log(`\napply_decisions complete for ${beamline}: ${toApply.length} entr${toApply.length === 1 ? "y" : "ies"} applied.`);
if (missingFields.length + duplicatePv.length > 0) {
  console.log(`${missingFields.length + duplicatePv.length} conflict(s) skipped — resolve manually.`);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildRegistryEntry(row) {
  const rawEntry = rawByRawId.get(row.rawId);
  const rawMeta = (rawEntry && rawEntry.raw_metadata) ? rawEntry.raw_metadata : {};

  const notes = buildNotes(row);
  const metadata = buildMetadata(row, rawMeta);

  const entry = {
    rulebook_version: "SEO_v2",
    source_trace: {
      raw_id: row.rawId || null,
      source_id: row.sourceId || "",
      source_line: row.sourceLine === undefined ? null : row.sourceLine,
      source_anchor: row.sourceAnchor || "",
      source_label: row.sourceLabel || null,
    },
    section: row.section || "BL",
    port: row.port || "",
    area: row.area || "",
    device: row.dev || "",
    subdevice: row.subdev || "",
    signal: row.signal || "",
    pv: row.standardPv || "",
    ...(row.source ? { source_pv: row.source } : {}),
    status: "reviewed",
    notes,
  };

  if (Object.keys(metadata).length > 0) entry.metadata = metadata;

  return entry;
}

function buildNotes(row) {
  const parts = [];
  if (row.note) {
    for (const part of row.note.split(/;\s+/)) {
      const trimmed = part.trim();
      if (trimmed) parts.push(trimmed);
    }
  }
  if (row.reviewNote && row.reviewNote.trim()) {
    parts.push(row.reviewNote.trim());
  }
  if (parts.length === 0) {
    parts.push(`promoted from review (${row.reviewStatus})`);
  }
  return parts;
}

function buildMetadata(row, rawMeta) {
  const meta = {};
  // Carry raw metadata fields that are commonly useful
  const rawFields = ["raw_group", "raw_device", "raw_axis_or_function", "init", "low", "high", "velocity"];
  for (const f of rawFields) {
    if (rawMeta[f] !== undefined && rawMeta[f] !== null && rawMeta[f] !== "") {
      meta[f] = String(rawMeta[f]);
    }
  }
  if (row.egu) meta.egu = row.egu;
  else if (rawMeta.egu) meta.egu = String(rawMeta.egu);
  if (row.ioc) meta.ioc = row.ioc;
  else if (rawMeta.ioc) meta.ioc = String(rawMeta.ioc);
  return meta;
}

function resolveRegistryBeamline() {
  const candidates = [];
  if (registryData && registryData.beamline) candidates.push(["registry", registryData.beamline]);
  if (rawData && rawData.beamline) candidates.push(["raw extraction", rawData.beamline]);
  try {
    const status = loadOutputStatus(beamline).data;
    if (status && status.beamline) candidates.push(["status", status.beamline]);
  } catch {
    // non-fatal; status.yaml is optional for resolving an existing registry
  }

  for (const [source, value] of candidates) {
    if (/^BL-[0-9]{2}[A-Z]$/.test(String(value))) return String(value);
    console.error(`FAIL: ${source} beamline value is invalid for SEO_v2 registry: ${value}`);
    process.exit(1);
  }

  console.error(
    `FAIL: cannot determine registry beamline for ${beamline}; create outputs/${beamline}/status.yaml or raw_extracted_pvs.yaml with a valid beamline such as BL-10C`,
  );
  process.exit(1);
}
