#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const {
  rel,
  posixRel,
  loadRegistry,
  loadRawExtraction,
  loadExceptionFrontmatters,
} = require("./lib/pv_workbench");
const {
  DURABLE_REVIEW_STATUSES,
  loadPool,
  mergeRows,
} = require("./database_pool_pilot/database_pool");
const {
  blockingAbbreviationIssues,
  loadRegistry: loadAbbreviationRegistry,
  validateRegistry: validateAbbreviationRegistry,
} = require("./abbreviation_registry_pilot/abbreviation_registry");

const cli = parseCli(process.argv.slice(2));
if (cli.help || cli.error) {
  if (cli.error && cli.error !== "missing beamline") console.error(`FAIL: ${cli.error}`);
  printUsage();
  process.exit(2);
}

const mode = cli.databasePoolIds.length > 0 ? "database_pool" : "legacy_output";
const beamline = mode === "legacy_output" ? cli.beamline : "";
const databasePoolIds = cli.databasePoolIds;
const port = cli.port;
const host = cli.host;

const reviewDir = mode === "legacy_output" ? rel("reviews", beamline) : "";
const decisionsPath = mode === "legacy_output" ? path.join(reviewDir, "review_decisions.json") : "";
const acceptedPath = mode === "legacy_output" ? path.join(reviewDir, "accepted_decisions.json") : "";
const fixedPath = mode === "legacy_output" ? path.join(reviewDir, "fixed_decisions.json") : "";
const queuePath = mode === "legacy_output" ? rel("outputs", beamline, "_work", "review_queue.json") : "";
const activeRulebookVersion = mode === "legacy_output" ? "SEO_v2" : "SEO_V3";
const activeRulebookLabel = mode === "legacy_output" ? "SEO_V2" : "SEO_V3";
const seedDataset = mode === "legacy_output" ? "SEO_v2" : "";
const seedFixturesDir = mode === "legacy_output" ? rel("fixtures", seedDataset) : "";
const seedDecisionsPath = mode === "legacy_output" ? path.join(seedFixturesDir, "review_decisions.json") : "";
const abbreviationRegistryPath = rel("fixtures", "seo_v3_pilot", "abbreviation_registry.json");
let cachedAbbreviationRegistry = null;
let cachedRows = [];
let cachedLoadedAt = "";

const LEGACY_REVIEW_STATUSES = [
  "needs_input",
  "accepted",
  "approved",
  "edited",
  "exception",
  "skipped",
  "proposal",
  "fixed",
];
const DATABASE_POOL_REVIEW_STATUSES = [...DURABLE_REVIEW_STATUSES];
const REVIEW_STATUSES = mode === "legacy_output" ? LEGACY_REVIEW_STATUSES : DATABASE_POOL_REVIEW_STATUSES;
const ACCEPTED_STATUSES = new Set(["accepted", "approved", "edited", "fixed"]);

reloadStateCache();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  if (req.method === "GET" && url.pathname === "/") return sendHtml(res);
  if (req.method === "GET" && url.pathname === "/api/state") {
    return sendState(res);
  }
  if (req.method === "POST" && url.pathname === "/api/decisions") {
    return readJsonBody(req, res, (body) => saveDecisionRows(res, body));
  }
  sendJson(res, 404, { error: "not_found" });
});

server.listen(port, host, () => {
  if (mode === "legacy_output") {
    console.log(`Review server for ${beamline}: http://${host}:${port}/`);
    const queueExists = fs.existsSync(queuePath);
    console.log(`Reading queue from: ${posixRel(queueExists ? queuePath : rel("outputs", beamline, "_work", "raw_extracted_pvs.yaml"))}${queueExists ? "" : " (fallback — run build_review_queue.js to generate review_queue.json)"}`);
    console.log(`Saving decisions to ${posixRel(decisionsPath)}`);
  } else {
    console.log(`Review server for database pools ${databasePoolIds.join(", ")}: http://${host}:${port}/`);
    console.log("Server-side pool auto-discovery is disabled; loaded only explicit --database-pool arguments.");
    console.log("Saving database-pool decisions to database_pool/<pool_id>/decisions/workbench.decisions.json");
  }
});

server.on("error", (err) => {
  console.error(`FAIL: cannot start review server on ${host}:${port}: ${err.message}`);
  process.exit(1);
});

function parseCli(args) {
  const result = {
    beamline: "",
    databasePoolIds: [],
    host: "127.0.0.1",
    port: 8212,
    help: false,
    error: "",
  };
  const positionals = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }
    if (arg === "--host") {
      result.host = args[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--port") {
      const value = Number(args[index + 1]);
      if (!Number.isFinite(value)) result.error = "--port requires a numeric value";
      else result.port = value;
      index += 1;
      continue;
    }
    if (arg === "--database-pool") {
      const poolId = args[index + 1];
      if (!poolId || poolId.startsWith("--")) {
        result.error = "--database-pool requires a pool id";
      } else {
        result.databasePoolIds.push(poolId);
      }
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) {
      result.error = `unknown option: ${arg}`;
      continue;
    }
    positionals.push(arg);
  }
  if (result.help) return result;
  if (positionals.length > 0 && result.databasePoolIds.length > 0) {
    result.error = "legacy beamline argument cannot be mixed with --database-pool";
    return result;
  }
  if (result.databasePoolIds.length === 0) {
    if (positionals.length !== 1) {
      result.error = "missing beamline";
      return result;
    }
    result.beamline = positionals[0];
  }
  if (!result.host) result.error = "--host requires a value";
  return result;
}

function printUsage() {
  console.error("Usage:");
  console.error("  node scripts/review_server.js <beamline> [--host 127.0.0.1] [--port 8212]");
  console.error("  node scripts/review_server.js --database-pool <pool_id> [--database-pool <pool_id> ...] [--host 127.0.0.1] [--port 8212]");
}

function sendHtml(res) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(HTML);
}

function reloadStateCache() {
  cachedRows = mode === "legacy_output" ? buildDecisionRows() : buildDatabasePoolRows();
  cachedLoadedAt = new Date().toISOString();
}

function sendState(res) {
  try {
    reloadStateCache();
    sendJson(res, 200, {
      mode,
      beamline: mode === "legacy_output" ? beamline : databasePoolIds.join(","),
      poolIds: mode === "database_pool" ? databasePoolIds : [],
      activeRulebookVersion,
      activeRulebookLabel,
      seedDataset,
      queueSource: mode === "legacy_output"
        ? fs.existsSync(queuePath)
          ? posixRel(queuePath)
          : posixRel(rel("outputs", beamline, "_work", "raw_extracted_pvs.yaml"))
        : databasePoolIds.map((poolId) => posixRel(rel("database_pool", poolId))).join(", "),
      loadedAt: cachedLoadedAt,
      paths: mode === "legacy_output" ? {
        reviewDecisions: posixRel(decisionsPath),
        acceptedDecisions: posixRel(acceptedPath),
        fixedDecisions: posixRel(fixedPath),
        seedDecisions: posixRel(seedDecisionsPath),
      } : databasePoolPaths(),
      abbreviationRegistry: mode === "database_pool" ? abbreviationRegistrySummary() : null,
      reviewStatuses: REVIEW_STATUSES,
      rows: cachedRows,
    });
  } catch (err) {
    sendJson(res, 500, { error: "state_error", message: err.message });
  }
}

function saveDecisionRows(res, body) {
  if (mode === "database_pool") {
    return saveDatabasePoolDecisionRows(res, body);
  }
  try {
    const rows = normalizeRows(Array.isArray(body.rows) ? body.rows : body);
    const beamlineRows = rows.filter((row) => row.dataset !== seedDataset);
    const seedRows = rows.filter((row) => row.dataset === seedDataset);
    if (rows.length > 0 && beamlineRows.length === 0) {
      sendJson(res, 400, {
        error: "seed_only_write_rejected",
        message: "seed fixture rows are read-only; POST must contain beamline decision rows",
      });
      return;
    }
    if (beamlineRows.length === 0 && fs.existsSync(decisionsPath)) {
      sendJson(res, 400, {
        error: "empty_write_rejected",
        message: `POST contains 0 beamline rows but ${posixRel(decisionsPath)} already exists — send at least one row or delete the file first`,
      });
      return;
    }
    const acceptedRows = beamlineRows.filter((row) => ACCEPTED_STATUSES.has(row.reviewStatus));
    const fixedRows = beamlineRows.filter((row) => row.reviewStatus === "fixed");
    fs.mkdirSync(reviewDir, { recursive: true });
    writeJson(decisionsPath, beamlineRows);
    writeJson(acceptedPath, acceptedRows);
    writeJson(fixedPath, fixedRows);
    reloadStateCache();
    cachedLoadedAt = new Date().toISOString();
    sendJson(res, 200, {
      ok: true,
      rowCount: beamlineRows.length,
      acceptedRows: acceptedRows.length,
      fixedRows: fixedRows.length,
      seedRowsIgnored: seedRows.length,
      stateRows: cachedRows,
      loadedAt: cachedLoadedAt,
      paths: {
        reviewDecisions: posixRel(decisionsPath),
        acceptedDecisions: posixRel(acceptedPath),
        fixedDecisions: posixRel(fixedPath),
        seedDecisions: posixRel(seedDecisionsPath),
      },
    });
  } catch (err) {
    sendJson(res, 400, { error: "save_error", message: err.message });
  }
}

function saveDatabasePoolDecisionRows(res, body) {
  try {
    const rows = Array.isArray(body.rows) ? body.rows : body;
    if (!Array.isArray(rows)) throw new Error("expected a JSON array or { rows: [...] }");

    const validPools = new Set(databasePoolIds);
    const decisionsByPool = new Map(databasePoolIds.map((poolId) => [poolId, []]));
    const currentRowKeys = databasePoolCurrentRowKeys();
    for (const row of rows) {
      const poolId = stringValue(row.poolId || row.dataset);
      const uid = stringValue(row.uid || row.rowId || row.rawId);
      if (!validPools.has(poolId)) {
        throw new Error(`row ${uid || "unknown"} belongs to unloaded pool: ${poolId || "(empty)"}`);
      }
      if (!currentRowKeys.has(databasePoolRowKey(poolId, uid))) {
        throw new Error(`row ${uid || "unknown"} does not belong to pool ${poolId}`);
      }
      decisionsByPool.get(poolId).push(normalizeDatabasePoolDecision(row));
    }

    const paths = {};
    let rowCount = 0;
    for (const [poolId, decisions] of decisionsByPool.entries()) {
      if (decisions.length === 0) continue;
      const file = databasePoolDecisionPath(poolId);
      const existing = readDatabasePoolDecisionFile(file, poolId);
      const byUid = new Map(existing.decisions.map((decision) => [decision.uid, decision]));
      for (const decision of decisions) {
        byUid.set(decision.uid, {
          ...(byUid.get(decision.uid) || {}),
          ...decision,
        });
      }
      const next = {
        poolId,
        decisions: [...byUid.values()].sort((a, b) => a.uid.localeCompare(b.uid)),
      };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      writeJson(file, next);
      paths[poolId] = posixRel(file);
      rowCount += decisions.length;
    }

    reloadStateCache();
    cachedLoadedAt = new Date().toISOString();
    sendJson(res, 200, {
      ok: true,
      mode,
      rowCount,
      acceptedRows: cachedRows.filter((row) => row.reviewStatus === "accepted" || row.reviewStatus === "approved").length,
      fixedRows: 0,
      stateRows: cachedRows,
      loadedAt: cachedLoadedAt,
      paths: {
        ...databasePoolPaths(),
        writtenDecisionFiles: paths,
      },
    });
  } catch (err) {
    sendJson(res, 400, { error: "database_pool_save_error", message: err.message });
  }
}

function normalizeDatabasePoolDecision(row) {
  const uid = stringValue(row.uid || row.rowId || row.rawId);
  if (!uid) throw new Error("database-pool decision row missing uid");
  const reviewStatus = stringValue(row.reviewStatus || "needs_input");
  if (!DURABLE_REVIEW_STATUSES.has(reviewStatus)) {
    throw new Error(`database-pool decision ${uid} has invalid reviewStatus: ${reviewStatus}`);
  }
  const decision = {
    uid,
    reviewStatus,
    updatedAt: new Date().toISOString(),
  };
  const optionalStrings = {
    reviewNote: row.reviewNote,
    section: row.section,
    port: row.port,
    area: row.area,
    device: row.device || row.dev,
    subdevice: row.subdevice || row.subdev,
    signal: row.signal,
    standardPv: row.standardPv,
    sourcePv: row.sourcePv || row.source,
    note: row.note,
  };
  for (const [key, value] of Object.entries(optionalStrings)) {
    const text = stringValue(value);
    if (text) decision[key] = key === "signal" || key === "reviewNote" || key === "standardPv" || key === "sourcePv" || key === "note"
      ? text
      : text.toUpperCase();
  }
  return decision;
}

function databasePoolCurrentRowKeys() {
  const keys = new Set();
  for (const poolId of databasePoolIds) {
    const pool = loadPool(rel("database_pool", poolId));
    const decisions = loadDecisionRowsWithSources(pool.decisionFiles, poolId);
    const merged = mergeRows(pool.sourceRows, decisions);
    for (const row of merged.rows) {
      const rowPoolId = row.sourceRow && row.sourceRow.poolId ? row.sourceRow.poolId : row.poolId || poolId;
      keys.add(databasePoolRowKey(rowPoolId, row.uid));
    }
  }
  return keys;
}

function databasePoolRowKey(poolId, uid) {
  return `${poolId}\0${uid}`;
}

function databasePoolDecisionPath(poolId) {
  return rel("database_pool", poolId, "decisions", "workbench.decisions.json");
}

function readDatabasePoolDecisionFile(file, poolId) {
  if (!fs.existsSync(file)) return { poolId, decisions: [] };
  const data = readJsonObject(file);
  if (data.poolId && data.poolId !== poolId) {
    throw new Error(`${posixRel(file)} poolId ${data.poolId} does not match ${poolId}`);
  }
  return {
    poolId,
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
  };
}

function buildDatabasePoolRows() {
  const rows = [];
  const registry = getAbbreviationRegistry();
  for (const poolId of databasePoolIds) {
    const poolDir = rel("database_pool", poolId);
    const pool = loadPool(poolDir);
    const decisions = loadDecisionRowsWithSources(pool.decisionFiles, poolId);
    const merged = mergeRows(pool.sourceRows, decisions);
    for (const row of merged.rows) {
      rows.push(normalizeDatabasePoolUiRow(row, rows.length, poolId, registry));
    }
  }
  return rows;
}

function loadDecisionRowsWithSources(files, expectedPoolId) {
  const decisionsByUid = new Map();
  for (const file of orderDecisionFilesByPrecedence(files)) {
    const data = readJsonObject(file);
    if (data.poolId && data.poolId !== expectedPoolId) {
      throw new Error(`${posixRel(file)} poolId ${data.poolId} does not match ${expectedPoolId}`);
    }
    const decisionSource = path.basename(file);
    for (const decision of data.decisions || []) {
      if (!decision.uid) throw new Error(`${posixRel(file)} decision missing uid`);
      if (!DURABLE_REVIEW_STATUSES.has(decision.reviewStatus)) {
        throw new Error(`${posixRel(file)} decision ${decision.uid} has invalid reviewStatus: ${decision.reviewStatus}`);
      }
      if (decision.poolId && decision.poolId !== expectedPoolId) {
        throw new Error(`${posixRel(file)} decision ${decision.uid} poolId ${decision.poolId} does not match ${expectedPoolId}`);
      }
      const { poolId, ...decisionPayload } = decision;
      decisionsByUid.set(decision.uid, {
        ...decisionPayload,
        decisionSource,
      });
    }
  }
  return [...decisionsByUid.values()];
}

function orderDecisionFilesByPrecedence(files) {
  // Apply sorted curated decisions first, then workbench.decisions.json last so
  // the workbench-owned overlay wins for duplicate uid values.
  return [...files].sort((a, b) => {
    const aWorkbench = path.basename(a) === "workbench.decisions.json";
    const bWorkbench = path.basename(b) === "workbench.decisions.json";
    if (aWorkbench !== bWorkbench) return aWorkbench ? 1 : -1;
    return path.basename(a).localeCompare(path.basename(b));
  });
}

function normalizeDatabasePoolUiRow(row, index, fallbackPoolId, registry) {
  const trace = row.sourceTrace || {};
  const poolId = row.sourceRow && row.sourceRow.poolId ? row.sourceRow.poolId : row.poolId || fallbackPoolId;
  const abbreviationIssues = row.orphan ? [] : blockingAbbreviationIssues(row, registry).map((issue) => ({
    field: issue.field,
    kind: issue.kind,
    code: issue.code,
    status: issue.status,
    reason: issue.reason,
  }));
  return {
    seq: index + 1,
    uid: stringValue(row.uid),
    rowId: stringValue(row.uid || row.rowId),
    rawId: stringValue(row.uid || row.rowId),
    dataset: stringValue(poolId),
    poolId: stringValue(poolId),
    reviewStatus: REVIEW_STATUSES.includes(row.reviewStatus) ? row.reviewStatus : "needs_input",
    section: upperValue(row.section || "BL"),
    port: upperValue(row.port),
    area: upperValue(row.area),
    dev: upperValue(row.device || row.dev),
    subdev: upperValue(row.subdevice || row.subdev),
    device: upperValue(row.device || row.dev),
    subdevice: upperValue(row.subdevice || row.subdev),
    signal: stringValue(row.signal),
    standardPv: stringValue(row.standardPv),
    source: stringValue(row.sourcePv || trace.sourceLabel || row.source || ""),
    sourcePv: stringValue(row.sourcePv),
    note: stringValue(row.note),
    sourceId: stringValue(row.sourceId || trace.sourceId),
    sourceLine: trace.sourceLine === undefined ? row.sourceLine || null : trace.sourceLine,
    sourceAnchor: stringValue(row.sourceAnchor || trace.sourceAnchor),
    sourceLabel: trace.sourceLabel === undefined ? null : trace.sourceLabel,
    sourceTrace: trace,
    reviewNote: stringValue(row.reviewNote),
    exceptionIds: Array.isArray(row.exceptionIds) ? row.exceptionIds.map(String) : [],
    orphan: Boolean(row.orphan),
    legacyStandardPv: stringValue(row.legacyStandardPv),
    decisionSource: stringValue(row.decisionSource || ""),
    computed: {
      ...(row.computed || {}),
      abbreviationIssues,
    },
    egu: stringValue(row.egu),
    ioc: stringValue(row.ioc),
    updatedAt: new Date().toISOString(),
  };
}

function getAbbreviationRegistry() {
  if (mode !== "database_pool") return null;
  if (!cachedAbbreviationRegistry) {
    cachedAbbreviationRegistry = loadAbbreviationRegistry(abbreviationRegistryPath);
    const errors = validateAbbreviationRegistry(cachedAbbreviationRegistry);
    if (errors.length > 0) {
      throw new Error(`abbreviation registry validation failed: ${errors.join("; ")}`);
    }
  }
  return cachedAbbreviationRegistry;
}

function abbreviationRegistrySummary() {
  const registry = getAbbreviationRegistry();
  return {
    path: posixRel(abbreviationRegistryPath),
    schemaVersion: registry.schemaVersion || "",
    source: registry.source || "",
    entryCount: Array.isArray(registry.entries) ? registry.entries.length : 0,
  };
}

function databasePoolPaths() {
  const decisions = {};
  for (const poolId of databasePoolIds) {
    decisions[poolId] = posixRel(databasePoolDecisionPath(poolId));
  }
  return {
    databasePools: databasePoolIds.map((poolId) => posixRel(rel("database_pool", poolId))),
    abbreviationRegistry: posixRel(abbreviationRegistryPath),
    workbenchDecisions: decisions,
  };
}

function buildDecisionRows() {
  const existingByRaw = new Map();
  for (const row of readJsonArray(decisionsPath)) {
    if (row.rawId) existingByRaw.set(row.rawId, row);
  }

  const rows = fs.existsSync(queuePath)
    ? buildFromQueue(existingByRaw)
    : buildFromRawExtraction(existingByRaw);

  for (const [rawId, existing] of existingByRaw.entries()) {
    if (!rows.some((row) => row.rawId === rawId)) {
      rows.push(normalizeRow({ ...existing, orphan: true }, rows.length));
    }
  }
  return [...rows, ...loadSeedRows(rows.length)];
}

function buildFromQueue(existingByRaw) {
  return readJsonArray(queuePath).map((queueRow, index) => {
    const existing = existingByRaw.get(queueRow.rawId);
    return existing
      ? normalizeRow({ ...queueRow, ...existing, orphan: false }, index)
      : normalizeRow({ ...queueRow, orphan: false }, index);
  });
}

function buildFromRawExtraction(existingByRaw) {
  const registry = loadRegistry(beamline).data;
  const raw = loadRawExtraction(beamline).data;
  if (!raw || !Array.isArray(raw.entries)) {
    throw new Error(`missing or invalid outputs/${beamline}/_work/raw_extracted_pvs.yaml`);
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

  return raw.entries.map((rawEntry, index) => {
    const registryEntry = registryByRaw.get(rawEntry.raw_id);
    const exceptionIds = exceptionIdsByRaw.get(rawEntry.raw_id) || [];
    const base = defaultRow(index + 1, rawEntry, registryEntry, exceptionIds);
    const existing = existingByRaw.get(rawEntry.raw_id);
    return existing
      ? normalizeRow({ ...base, ...existing, orphan: false }, index)
      : normalizeRow({ ...base, orphan: false }, index);
  });
}

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
    standardPv: registryEntry ? registryEntry.pv : renderPv(section, port, area, dev, subdev, signal),
    source: registryEntry
      ? registryEntry.source_pv || rawEntry.raw_source_pv || rawEntry.raw_pv || ""
      : rawEntry.raw_source_pv || rawEntry.raw_pv || "",
    note: defaultNote(rawEntry, registryEntry, exceptionIds),
    sourceId: trace.source_id || "",
    sourceLine: trace.source_line === undefined ? null : trace.source_line,
    sourceAnchor: trace.source_anchor || "",
    sourceLabel: trace.source_label || null,
    reviewNote: "",
    exceptionIds,
    egu: metadata.egu || "",
    ioc: metadata.ioc || "",
  };
}

function loadSeedRows(offset) {
  const rows = readJsonArray(seedDecisionsPath);
  return rows.map((row, index) =>
    normalizeRow(
      {
        ...row,
        dataset: seedDataset,
        seq: offset + index + 1,
      },
      offset + index,
    ),
  );
}

function defaultNote(rawEntry, registryEntry, exceptionIds) {
  if (registryEntry && Array.isArray(registryEntry.notes)) return registryEntry.notes.join("; ");
  const metadata = rawEntry.raw_metadata || {};
  const parts = [];
  if (metadata.source_text) parts.push(metadata.source_text);
  if (exceptionIds.length > 0) parts.push(`exception: ${exceptionIds.join(", ")}`);
  return parts.join("; ");
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) throw new Error("expected a JSON array or { rows: [...] }");
  return rows.map(normalizeRow);
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
    updatedAt: new Date().toISOString(),
  };
  const rendered = renderPv(
    normalized.section,
    normalized.port,
    normalized.area,
    normalized.dev,
    normalized.subdev,
    normalized.signal,
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

function readJsonArray(file) {
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${posixRel(file)} must contain a JSON array`);
  return parsed;
}

function readJsonObject(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${posixRel(file)} must contain a JSON object`);
  }
  return parsed;
}

function writeJson(file, rows) {
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
}

function readJsonBody(req, res, callback) {
  let text = "";
  req.on("data", (chunk) => {
    text += chunk;
    if (text.length > 10 * 1024 * 1024) {
      sendJson(res, 413, { error: "payload_too_large" });
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      callback(text ? JSON.parse(text) : {});
    } catch (err) {
      sendJson(res, 400, { error: "bad_json", message: err.message });
    }
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

const HTML = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>4GSR PV Review Workbench</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f7fb;
      --card: #ffffff;
      --text: #203040;
      --muted: #5f6f82;
      --line: #d7e0ea;
      --primary: #1f5aa6;
      --primary-2: #15437f;
      --accent: #0f766e;
      --warn: #b45309;
      --danger: #b42318;
      --shadow: 0 12px 28px rgba(31, 90, 166, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(31, 90, 166, 0.12), transparent 30%),
        linear-gradient(180deg, #f9fbff 0%, var(--bg) 100%);
      font-family: "Inter", "Segoe UI", "Malgun Gothic", Arial, sans-serif;
      line-height: 1.5;
    }
    .page { max-width: 1540px; margin: 0 auto; padding: 22px; }
    .hero {
      color: white;
      background: linear-gradient(135deg, #12345f 0%, #1f5aa6 58%, #2f7ad4 100%);
      border-radius: 20px;
      padding: 28px 30px;
      box-shadow: var(--shadow);
    }
    .hero-top {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    h1 { margin: 0 0 8px; font-size: 30px; line-height: 1.2; }
    .subtitle { margin: 0; max-width: 980px; color: rgba(255, 255, 255, 0.86); }
    .hero .meta { color: rgba(255, 255, 255, 0.86); text-align: right; }
    .code, code {
      font-family: "Cascadia Code", "Consolas", monospace;
      background: #fff1f5;
      border: 1px solid #fbcfe8;
      color: #9f1239;
      border-radius: 8px;
      padding: 2px 6px;
      white-space: nowrap;
      font-size: 12px;
    }
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 18px 0 22px;
      padding: 8px;
      width: fit-content;
      background: rgba(255, 255, 255, 0.58);
      border: 1px solid rgba(255, 255, 255, 0.88);
      border-radius: 16px;
      backdrop-filter: blur(8px);
    }
    button, select, input, textarea {
      font: inherit;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--text);
      border-radius: 12px;
    }
    button { cursor: pointer; }
    .tab-btn {
      border: 0;
      padding: 10px 16px;
      font-weight: 800;
      color: var(--muted);
      background: transparent;
    }
    .tab-btn.active {
      background: linear-gradient(135deg, var(--primary), #2d6fd0);
      color: white;
      box-shadow: 0 6px 16px rgba(31, 90, 166, 0.22);
    }
    .section {
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 22px;
      box-shadow: var(--shadow);
      margin-bottom: 18px;
    }
    .section h2 {
      margin: 0 0 14px;
      font-size: 22px;
      color: var(--primary-2);
      border-left: 5px solid var(--primary);
      padding-left: 12px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 16px;
      background: linear-gradient(180deg, #fff, #f8fbff);
      padding: 16px;
    }
    .card .label {
      display: block;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .card .value { font-size: 30px; font-weight: 900; color: var(--primary-2); }
    .card .desc { margin-top: 6px; color: var(--muted); font-size: 13px; }
    .toolbar {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
      margin: 14px 0 12px;
    }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .field input, .field select { width: 100%; padding: 11px 12px; }
    .toolbar-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin: 0 0 12px;
    }
    .btn {
      border: 0;
      padding: 11px 14px;
      color: white;
      background: linear-gradient(135deg, var(--primary), #2d6fd0);
      font-weight: 800;
    }
    .btn.secondary {
      color: var(--primary-2);
      background: #eef4fb;
      border: 1px solid #c7d7eb;
    }
    .status { min-height: 20px; color: var(--muted); font-size: 13px; }
    .status.error { color: var(--danger); }
    .status.ok { color: #116329; }
    .countline { color: var(--muted); font-size: 13px; }
    .countline strong { color: var(--primary-2); }
    .pager {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      color: var(--muted);
      font-size: 13px;
    }
    .pager button {
      padding: 7px 10px;
      border-radius: 9px;
      color: var(--primary-2);
      background: #eef4fb;
      border: 1px solid #c7d7eb;
      font-weight: 800;
    }
    .pager button:disabled {
      cursor: not-allowed;
      opacity: 0.48;
    }
    .paths {
      display: grid;
      gap: 6px;
      margin-top: 12px;
      color: var(--muted);
      font-size: 13px;
    }
    .table-wrap {
      overflow: auto;
      max-height: 72vh;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: white;
    }
    table { width: 100%; min-width: 1880px; border-collapse: collapse; font-size: 13px; }
    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #eef4fb;
      color: #375579;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-size: 12px;
      white-space: nowrap;
    }
    tr:hover td { background: #fafcff; }
    td input, td select, td textarea { width: 100%; }
    td input { padding: 7px 8px; border-radius: 8px; }
    td select { padding: 7px 8px; border-radius: 8px; }
    textarea { min-height: 54px; resize: vertical; padding: 7px 8px; border-radius: 8px; }
    input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary); }
    .seq { width: 72px; }
    .dataset { width: 96px; }
    .raw { width: 170px; }
    .review { width: 88px; text-align: center; }
    .status-col { width: 132px; }
    .narrow { width: 92px; }
    .signal { width: 150px; }
    .pv { width: 310px; }
    .note { width: 280px; }
    .source { width: 260px; }
    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 800;
      background: #edf4ff;
      color: var(--primary-2);
      border: 1px solid #cadcf6;
      white-space: nowrap;
    }
    .pill.good { background: #e6fffb; color: var(--accent); border-color: #bff0ea; }
    .pill.warn { background: #fff7ed; color: var(--warn); border-color: #fed7aa; }
    .pill.seed { background: #f4f0ff; color: #5b21b6; border-color: #ddd6fe; }
    .hidden { display: none !important; }
    .trace { color: var(--muted); font-size: 12px; }
    .row-exception td { background: #fffaf0; }
    .row-fixed td { background: #f0fff4; }
    .row-approved td, .row-accepted td { background: #f8fffb; }
    .row-needs_input td { background: #fff; }
    .row-orphan td { background: #fff0f0; outline: 1px solid #fca5a5; }
    .pill.orphan { background: #fff0f0; color: var(--danger); border-color: #fca5a5; }
    @media (max-width: 1200px) {
      .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .toolbar { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .page { padding: 12px; }
      .hero { padding: 20px; border-radius: 16px; }
      h1 { font-size: 24px; }
      .hero .meta { text-align: left; }
      .cards { grid-template-columns: 1fr; }
      .toolbar { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="hero">
      <div class="hero-top">
        <div>
          <h1>4GSR PV Review Workbench</h1>
          <p class="subtitle" id="heroSubtitle">${mode === "database_pool" ? "Database-pool source rows와 human decision overlays를 shared review UI에서 검토합니다." : "Legacy SEO_v2 generated-output review rows를 compatibility view에서 검토합니다."}</p>
        </div>
        <div class="meta">
          <div><strong>Dataset</strong>: <span class="code" id="beamlineName">loading</span></div>
          <div><strong>Rule</strong>: <span class="code" id="ruleShape">${mode === "database_pool" ? "[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]" : "BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]"}</span></div>
          <div><strong>Queue</strong>: <span class="code" id="queueSource">loading</span></div>
          <div id="seedMeta"><strong id="seedMetaLabel">${mode === "database_pool" ? "Registry" : "Seed"}</strong>: <span class="code" id="seedMetaPath">${mode === "database_pool" ? "fixtures/seo_v3_pilot/abbreviation_registry.json" : "fixtures/SEO_v2"}</span></div>
        </div>
      </div>
    </header>

    <nav class="tabs" aria-label="review views">
      <button class="tab-btn active" type="button" data-view="all">All Rows</button>
      <button class="tab-btn" id="beamlineTab" type="button" data-view="beamline">${mode === "database_pool" ? "Review Queue" : "Beamline Review"}</button>
      ${mode === "database_pool"
        ? '<button class="tab-btn hidden" id="seedTab" type="button" data-view="seed"></button>'
        : '<button class="tab-btn" id="seedTab" type="button" data-view="seed">Fixed Seed</button>'}
      <button class="tab-btn" type="button" data-view="attention">Needs Input</button>
      <button class="tab-btn" id="fixedTab" type="button" data-view="fixed">${mode === "database_pool" ? "Accepted/Approved" : "Fixed/Approved"}</button>
    </nav>

    <section class="section">
      <h2>Review Registry</h2>
      <div class="cards" id="statsCards">
        <div class="card"><span class="label">Total</span><div class="value" id="statTotal">0</div><div class="desc">loaded rows</div></div>
        <div class="card"><span class="label">Visible</span><div class="value" id="statVisible">0</div><div class="desc">current filter</div></div>
        <div class="card"><span class="label">Review Queue</span><div class="value" id="statBeamline">0</div><div class="desc">active beamline rows</div></div>
        ${mode === "database_pool"
          ? '<div class="card hidden" id="statSeedCard"><div class="value" id="statSeed">0</div></div>'
          : '<div class="card" id="statSeedCard"><span class="label">SEO Seed</span><div class="value" id="statSeed">0</div><div class="desc">fixed/approved rows</div></div>'}
        <div class="card"><span class="label">Decision Required</span><div class="value" id="statNeeds">0</div><div class="desc">needs_input / exception / proposal</div></div>
      </div>

      <div class="toolbar">
        <div class="field">
          <label for="datasetFilter">Dataset</label>
          <select id="datasetFilter"></select>
        </div>
        <div class="field">
          <label for="statusFilter">Status</label>
          <select id="statusFilter"></select>
        </div>
        <div class="field">
          <label for="portFilter">PORT</label>
          <select id="portFilter"></select>
        </div>
        <div class="field">
          <label for="areaFilter">AREA</label>
          <select id="areaFilter"></select>
        </div>
        <div class="field">
          <label for="devFilter">DEV</label>
          <select id="devFilter"></select>
        </div>
        <div class="field">
          <label for="search">Search</label>
          <input id="search" type="search" placeholder="PV / signal / source / note / raw id">
        </div>
      </div>

      <div class="toolbar-actions">
        <button id="reload" class="btn secondary" type="button">Reload</button>
        <button id="reset" class="btn secondary" type="button">Reset filters</button>
        <button id="save" class="btn" type="button">Save decisions</button>
        <span class="pager">
          <button id="prevPage" type="button">Prev</button>
          <span id="pageInfo"></span>
          <button id="nextPage" type="button">Next</button>
        </span>
        <span id="countline" class="countline"></span>
      </div>
      <div id="status" class="status"></div>
      <div id="paths" class="paths"></div>

      <div class="table-wrap" id="tableWrap">
        <table>
          <thead>
            <tr>
              <th class="seq">Seq</th>
              <th class="dataset">Dataset</th>
              <th class="raw">Raw / Trace</th>
              <th class="status-col">Status</th>
              <th class="review">Accept</th>
              <th class="review" id="fixedHeader">${mode === "database_pool" ? "Approved" : "Fixed"}</th>
              <th class="narrow">Section</th>
              <th class="narrow">Port</th>
              <th class="narrow">Area</th>
              <th class="narrow">DEV</th>
              <th class="narrow">SUBDEV</th>
              <th class="signal">Signal</th>
              <th class="pv">Standard PV</th>
              <th class="source">Source</th>
              <th class="note">Note</th>
              <th class="note">Review Note</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </section>
  </div>

  <script>
    let state = null;
    let rows = [];
    let activeView = "all";
    let pageIndex = 0;
    let hasLoadedState = false;
    const pageSize = 250;
    let renderQueued = false;
    const editableFields = ["section", "port", "area", "dev", "subdev", "signal", "standardPv", "source", "note", "reviewNote"];
    const acceptedStatuses = ["accepted", "approved", "edited", "fixed"];
    const filterIds = ["datasetFilter", "statusFilter", "portFilter", "areaFilter", "devFilter", "search"];

    const appConfig = {
      mode: ${JSON.stringify(mode)},
      seedDataset: ${JSON.stringify(seedDataset)},
      activeRulebookLabel: ${JSON.stringify(activeRulebookLabel)}
    };

    document.getElementById("reload").addEventListener("click", function() { loadState(); });
    document.getElementById("reset").addEventListener("click", resetFilters);
    document.getElementById("save").addEventListener("click", saveRows);
    document.getElementById("prevPage").addEventListener("click", function() {
      if (pageIndex > 0) {
        pageIndex -= 1;
        renderRows();
      }
    });
    document.getElementById("nextPage").addEventListener("click", function() {
      pageIndex += 1;
      renderRows();
    });
    filterIds.forEach(function(id) {
      document.getElementById(id).addEventListener(id === "search" ? "input" : "change", function() {
        pageIndex = 0;
        scheduleRenderRows();
      });
    });
    document.querySelectorAll(".tab-btn").forEach(function(button) {
      button.addEventListener("click", function() {
        activeView = button.dataset.view || "all";
        pageIndex = 0;
        document.querySelectorAll(".tab-btn").forEach(function(el) { el.classList.remove("active"); });
        button.classList.add("active");
        renderRows();
      });
    });

    loadState();

    async function loadState() {
      setStatus("Loading review state...");
      try {
        const response = await fetch("/api/state");
        const data = await response.json();
        if (!response.ok) {
          setStatus(data.message || "Failed to load state", true);
          return;
        }
        const firstLoad = !hasLoadedState;
        state = data;
        rows = data.rows || [];
        pageIndex = 0;
        document.getElementById("beamlineName").textContent = state.beamline || "";
        document.getElementById("queueSource").textContent = state.queueSource || "unknown";
        applyModeUi();
        setupFilters();
        if (firstLoad) resetFilterControls();
        hasLoadedState = true;
        renderPaths();
        renderRows();
        setStatus(
          "Loaded " + formatNumber(rows.length) + " rows into RAM" +
          (state.loadedAt ? " at " + new Date(state.loadedAt).toLocaleTimeString("ko-KR") : "") + ".",
          false,
          true
        );
      } catch (err) {
        setStatus(err.message || "Failed to load state", true);
      }
    }

    function setupFilters() {
      setOptions("datasetFilter", ["All"].concat(unique(rows.map(function(row) { return row.dataset || ""; }))));
      setOptions("statusFilter", ["All"].concat(state.reviewStatuses || []));
      setOptions("portFilter", ["All"].concat(unique(rows.map(function(row) { return row.port || ""; }))));
      setOptions("areaFilter", ["All"].concat(unique(rows.map(function(row) { return row.area || ""; }))));
      setOptions("devFilter", ["All"].concat(unique(rows.map(function(row) { return row.dev || ""; }))));
    }

    function isDatabasePoolMode() {
      return (state && state.mode === "database_pool") || appConfig.mode === "database_pool";
    }

    function applyModeUi() {
      const dbMode = isDatabasePoolMode();
      document.getElementById("heroSubtitle").textContent = dbMode
        ? "Database-pool source rows와 human decision overlays를 shared review UI에서 검토합니다."
        : "Legacy SEO_v2 generated-output review rows를 compatibility view에서 검토합니다.";
      document.getElementById("ruleShape").textContent = dbMode
        ? "[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]"
        : "BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]";
      document.getElementById("seedMetaLabel").textContent = dbMode ? "Registry" : "Seed";
      document.getElementById("seedMetaPath").textContent = dbMode
        ? ((state.paths && state.paths.abbreviationRegistry) || "fixtures/seo_v3_pilot/abbreviation_registry.json")
        : "fixtures/SEO_v2";
      document.getElementById("seedTab").classList.toggle("hidden", dbMode);
      document.getElementById("statSeedCard").classList.toggle("hidden", dbMode);
      document.getElementById("beamlineTab").textContent = dbMode ? "Review Queue" : "Beamline Review";
      document.getElementById("fixedHeader").textContent = dbMode ? "Approved" : "Fixed";
      document.getElementById("fixedTab").textContent = dbMode ? "Accepted/Approved" : "Fixed/Approved";
      if (dbMode && activeView === "seed") activeView = "all";
    }

    function setOptions(id, values) {
      const select = document.getElementById(id);
      const current = select.value || "All";
      const cleanValues = values.filter(function(value, index, array) {
        return value && array.indexOf(value) === index;
      });
      select.innerHTML = cleanValues.map(function(value) {
        return "<option value=\\"" + escapeAttr(value) + "\\">" + escapeHtml(value) + "</option>";
      }).join("");
      select.value = cleanValues.includes(current) ? current : "All";
    }

    function unique(values) {
      return Array.from(new Set(values.filter(Boolean))).sort();
    }

    function codeList(values) {
      return values.length
        ? values.map(function(value) { return "<code>" + escapeHtml(value) + "</code>"; }).join(" | ")
        : "<code></code>";
    }

    function renderPaths() {
      const paths = state.paths || {};
      if (isDatabasePoolMode()) {
        const decisionPaths = paths.workbenchDecisions || {};
        document.getElementById("paths").innerHTML =
          "<div><strong>Database pools</strong>: " + codeList(paths.databasePools || []) + "</div>" +
          "<div><strong>Workbench decisions</strong>: " + codeList(Object.values(decisionPaths)) + "</div>" +
          "<div><strong>Abbreviation registry</strong>: <code>" + escapeHtml(paths.abbreviationRegistry || "") + "</code></div>";
        return;
      }
      document.getElementById("paths").innerHTML =
        "<div><strong>Beamline writes</strong>: <code>" + escapeHtml(paths.reviewDecisions || "") + "</code> | <code>" +
        escapeHtml(paths.acceptedDecisions || "") + "</code> | <code>" + escapeHtml(paths.fixedDecisions || "") + "</code></div>" +
        "<div><strong>Seed</strong>: <code>" + escapeHtml(paths.seedDecisions || "") + "</code></div>";
    }

    function currentFilters() {
      return {
        dataset: document.getElementById("datasetFilter").value,
        status: document.getElementById("statusFilter").value,
        port: document.getElementById("portFilter").value,
        area: document.getElementById("areaFilter").value,
        dev: document.getElementById("devFilter").value,
        search: document.getElementById("search").value.trim().toLowerCase(),
      };
    }

    function visibleRows() {
      const filters = currentFilters();
      return rows.filter(function(row) {
        if (activeView === "beamline") {
          if (isDatabasePoolMode()) {
            if (!isReviewQueueRow(row)) return false;
          } else if (row.dataset !== state.beamline) return false;
        }
        if (activeView === "seed" && (isDatabasePoolMode() || row.dataset !== appConfig.seedDataset)) return false;
        if (activeView === "attention" && !hasAttentionIssue(row)) return false;
        if (activeView === "fixed" && !acceptedStatuses.includes(row.reviewStatus)) return false;
        if (filters.dataset !== "All" && row.dataset !== filters.dataset) return false;
        if (filters.status !== "All" && row.reviewStatus !== filters.status) return false;
        if (filters.port !== "All" && row.port !== filters.port) return false;
        if (filters.area !== "All" && row.area !== filters.area) return false;
        if (filters.dev !== "All" && row.dev !== filters.dev) return false;
        return !filters.search || searchText(row).includes(filters.search);
      });
    }

    function isReviewQueueRow(row) {
      return !["accepted", "approved", "rejected", "deprecated", "skipped", "orphan"].includes(row.reviewStatus);
    }

    function hasAttentionIssue(row) {
      const issues = row.computed && Array.isArray(row.computed.abbreviationIssues) ? row.computed.abbreviationIssues : [];
      return ["needs_input", "exception", "proposal"].includes(row.reviewStatus) || row.orphan || issues.length > 0;
    }

    function searchText(row) {
      return [
        row.seq,
        row.dataset,
        row.rawId,
        row.reviewStatus,
        row.section,
        row.port,
        row.area,
        row.dev,
        row.subdev,
        row.signal,
        row.standardPv,
        row.legacyStandardPv,
        row.source,
        row.note,
        row.reviewNote,
        row.sourceId,
        row.sourceAnchor,
        row.sourceLabel,
        (row.exceptionIds || []).join(" "),
      ].join(" ").toLowerCase();
    }

    function scheduleRenderRows() {
      if (renderQueued) return;
      renderQueued = true;
      window.requestAnimationFrame(function() {
        renderQueued = false;
        renderRows();
      });
    }

    function renderRows() {
      const tbody = document.getElementById("rows");
      const visible = visibleRows();
      const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
      if (pageIndex >= pageCount) pageIndex = pageCount - 1;
      const start = pageIndex * pageSize;
      const pageRows = visible.slice(start, start + pageSize);
      tbody.innerHTML = "";
      const fragment = document.createDocumentFragment();
      pageRows.forEach(function(row) {
        fragment.appendChild(renderRow(row));
      });
      tbody.appendChild(fragment);
      updateStats(visible, pageRows, start, pageCount);
    }

    function updateStats(visible, pageRows, start, pageCount) {
      const seedRows = rows.filter(function(row) { return row.dataset === appConfig.seedDataset; }).length;
      const dbMode = isDatabasePoolMode();
      const beamlineRows = dbMode
        ? rows.filter(function(row) {
            return !["accepted", "approved", "rejected", "deprecated", "skipped", "orphan"].includes(row.reviewStatus);
          }).length
        : rows.filter(function(row) { return row.dataset === state.beamline; }).length;
      const needs = rows.filter(function(row) {
        const issues = row.computed && Array.isArray(row.computed.abbreviationIssues) ? row.computed.abbreviationIssues : [];
        return ["needs_input", "exception", "proposal"].includes(row.reviewStatus) || issues.length > 0;
      }).length;
      const fixed = rows.filter(function(row) { return row.reviewStatus === "fixed"; }).length;
      const accepted = rows.filter(function(row) { return acceptedStatuses.includes(row.reviewStatus); }).length;
      document.getElementById("statTotal").textContent = formatNumber(rows.length);
      document.getElementById("statVisible").textContent = formatNumber(visible.length);
      document.getElementById("statBeamline").textContent = formatNumber(beamlineRows);
      document.getElementById("statSeed").textContent = formatNumber(seedRows);
      document.getElementById("statNeeds").textContent = formatNumber(needs);
      document.getElementById("prevPage").disabled = pageIndex <= 0;
      document.getElementById("nextPage").disabled = pageIndex >= pageCount - 1;
      document.getElementById("pageInfo").textContent = "Page " + formatNumber(pageIndex + 1) + " / " + formatNumber(pageCount);
      const firstShown = pageRows.length === 0 ? 0 : start + 1;
      const end = start + pageRows.length;
      document.getElementById("countline").innerHTML =
        "Showing <strong>" + formatNumber(firstShown) + "-" + formatNumber(end) + "</strong> of <strong>" +
        formatNumber(visible.length) + "</strong> filtered rows out of <strong>" +
        formatNumber(rows.length) + "</strong>. " +
        (dbMode
          ? "Accepted/approved: <strong>" + formatNumber(accepted) + "</strong>."
          : "Accepted/fixed: <strong>" + formatNumber(accepted) + "</strong>, fixed only: <strong>" + formatNumber(fixed) + "</strong>.");
    }

    function renderRow(row) {
      const tr = document.createElement("tr");
      tr.className = "row-" + (row.reviewStatus || "").replace(/[^a-z0-9_]/gi, "") + (row.orphan ? " row-orphan" : "");
      tr.appendChild(seqCell(row));
      tr.appendChild(datasetCell(row));
      tr.appendChild(rawCell(row));
      tr.appendChild(statusCell(row));
      tr.appendChild(checkCell(row, "accepted"));
      tr.appendChild(checkCell(row, isDatabasePoolMode() ? "approved" : "fixed"));
      editableFields.forEach(function(field) {
        tr.appendChild(inputCell(row, field));
      });
      return tr;
    }

    function seqCell(row) {
      const td = document.createElement("td");
      td.className = "seq";
      td.innerHTML = "<strong>" + escapeHtml(row.seq) + "</strong>";
      return td;
    }

    function datasetCell(row) {
      const td = document.createElement("td");
      td.className = "dataset";
      td.innerHTML = "<span class=\\"pill " + (row.dataset === appConfig.seedDataset ? "seed" : "good") + "\\">" + escapeHtml(row.dataset) + "</span>";
      return td;
    }

    function rawCell(row) {
      const td = document.createElement("td");
      td.className = "raw trace";
      const exceptions = (row.exceptionIds || []).join(", ");
      td.innerHTML =
        "<strong>" + escapeHtml(row.rawId) + "</strong><br>" +
        "<code>" + escapeHtml(row.sourceId || "") + "</code><br>" +
        escapeHtml(row.sourceAnchor || "") +
        (row.sourceLabel ? "<br>" + escapeHtml(row.sourceLabel) : "") +
        (row.legacyStandardPv ? "<br><span class=\\"pill warn\\">legacy</span> " + escapeHtml(row.legacyStandardPv) : "") +
        (exceptions ? "<br><span class=\\"pill warn\\">" + escapeHtml(exceptions) + "</span>" : "") +
        (row.orphan ? "<br><span class=\\"pill orphan\\">orphan</span>" : "");
      return td;
    }

    function statusCell(row) {
      const td = document.createElement("td");
      td.className = "status-col";
      const select = document.createElement("select");
      (state.reviewStatuses || []).forEach(function(status) {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        select.appendChild(option);
      });
      select.value = row.reviewStatus;
      select.disabled = row.dataset === appConfig.seedDataset;
      select.addEventListener("change", function() {
        row.reviewStatus = select.value;
        markDirty(row);
        row.updatedAt = new Date().toISOString();
        renderRows();
      });
      td.appendChild(select);
      return td;
    }

    function checkCell(row, value) {
      const td = document.createElement("td");
      td.className = "review";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = row.reviewStatus === value;
      input.disabled = row.dataset === appConfig.seedDataset;
      input.addEventListener("change", function() {
        if (input.checked) row.reviewStatus = value;
        else if (row.reviewStatus === value) row.reviewStatus = "needs_input";
        markDirty(row);
        row.updatedAt = new Date().toISOString();
        renderRows();
      });
      td.appendChild(input);
      return td;
    }

    function inputCell(row, field) {
      const td = document.createElement("td");
      td.className =
        field === "standardPv" ? "pv" :
        field === "source" ? "source" :
        ["note", "reviewNote"].includes(field) ? "note" :
        field === "signal" ? "signal" : "narrow";
      const input = ["note", "reviewNote"].includes(field) ? document.createElement("textarea") : document.createElement("input");
      input.dataset.field = field;
      input.value = row[field] || "";
      input.readOnly = field === "standardPv" || row.dataset === appConfig.seedDataset;
      input.addEventListener("input", function() {
        row[field] = input.value;
        markDirty(row);
        row.updatedAt = new Date().toISOString();
        if (["section", "port", "area", "dev", "subdev", "signal"].includes(field)) {
          row[field] = field === "signal" ? input.value : input.value.toUpperCase();
          input.value = row[field];
          row.standardPv = renderPv(row);
          const pvInput = input.closest("tr").querySelector('[data-field="standardPv"]');
          if (pvInput) pvInput.value = row.standardPv;
        }
      });
      td.appendChild(input);
      return td;
    }

    function renderPv(row) {
      if (!row.section || !row.port || !row.area || !row.dev || !row.subdev || !row.signal) return "";
      if (isDatabasePoolMode()) {
        return row.section + row.port + "-" + row.area + ":" + row.dev + "-" + row.subdev + ":" + row.signal;
      }
      return row.section + "-" + row.port + ":" + row.area + "-" + row.dev + "-" + row.subdev + ":" + row.signal;
    }

    function resetFilterControls() {
      ["datasetFilter", "statusFilter", "portFilter", "areaFilter", "devFilter"].forEach(function(id) {
        document.getElementById(id).value = "All";
      });
      document.getElementById("search").value = "";
      activeView = "all";
      pageIndex = 0;
      document.querySelectorAll(".tab-btn").forEach(function(el) {
        el.classList.toggle("active", el.dataset.view === "all");
      });
    }

    function resetFilters() {
      resetFilterControls();
      renderRows();
    }

    function markDirty(row) {
      if (isDatabasePoolMode()) row.__dirty = true;
    }

    async function saveRows() {
      setStatus("Saving decisions...");
      try {
        const rowsToSave = rows.filter(function(row) {
          return isDatabasePoolMode() ? row.__dirty : row.dataset !== appConfig.seedDataset;
        });
        if (isDatabasePoolMode() && rowsToSave.length === 0) {
          setStatus("No database-pool row changes to save.", false, true);
          return;
        }
        const response = await fetch("/api/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rowsToSave })
        });
        const data = await response.json();
        if (!response.ok) {
          setStatus(data.message || "Save failed", true);
          return;
        }
        setStatus(
          isDatabasePoolMode()
            ? "Saved " + formatNumber(data.rowCount) + " database-pool decision rows to workbench overlays."
            : "Saved " + formatNumber(data.rowCount) + " beamline rows. Fixed: " +
              formatNumber(data.fixedRows || 0) + ". Seed fixture rows are read-only.",
          false,
          true
        );
        if (Array.isArray(data.stateRows)) {
          rows = data.stateRows;
          if (data.loadedAt) state.loadedAt = data.loadedAt;
          setupFilters();
          renderRows();
        }
      } catch (err) {
        setStatus(err.message || "Save failed", true);
      }
    }

    function setStatus(message, isError, isOk) {
      const status = document.getElementById("status");
      status.textContent = message || "";
      status.className = "status" + (isError ? " error" : isOk ? " ok" : "");
    }

    function formatNumber(value) {
      return Number(value || 0).toLocaleString("en-US");
    }

    function escapeHtml(value) {
      return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function escapeAttr(value) {
      return escapeHtml(value).replace(/'/g, "&#39;");
    }
  </script>
</body>
</html>`;
