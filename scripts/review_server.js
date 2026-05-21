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

const beamline = process.argv[2];
const port = numberArg("--port", 8765);
const host = stringArg("--host", "127.0.0.1");

if (!beamline || process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error("Usage: node scripts/review_server.js <beamline> [--host 127.0.0.1] [--port 8765]");
  process.exit(2);
}

const reviewDir = rel("reviews", beamline);
const decisionsPath = path.join(reviewDir, "review_decisions.json");
const acceptedPath = path.join(reviewDir, "accepted_decisions.json");
const fixedPath = path.join(reviewDir, "fixed_decisions.json");
const queuePath = rel("outputs", beamline, "_work", "review_queue.json");
const activeRulebookVersion = "SEO_v2";
const activeRulebookLabel = "SEO_V2";
const seedDataset = "SEO_v2";
const seedFixturesDir = rel("fixtures", seedDataset);
const seedDecisionsPath = path.join(seedFixturesDir, "review_decisions.json");
let cachedRows = [];
let cachedLoadedAt = "";

const REVIEW_STATUSES = [
  "needs_input",
  "accepted",
  "approved",
  "edited",
  "exception",
  "skipped",
  "proposal",
  "fixed",
];
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
  console.log(`Review server for ${beamline}: http://${host}:${port}/`);
  const queueExists = fs.existsSync(queuePath);
  console.log(`Reading queue from: ${posixRel(queueExists ? queuePath : rel("outputs", beamline, "_work", "raw_extracted_pvs.yaml"))}${queueExists ? "" : " (fallback — run build_review_queue.js to generate review_queue.json)"}`);
  console.log(`Saving decisions to ${posixRel(decisionsPath)}`);
});

server.on("error", (err) => {
  console.error(`FAIL: cannot start review server on ${host}:${port}: ${err.message}`);
  process.exit(1);
});

function numberArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

function stringArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function sendHtml(res) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(HTML);
}

function reloadStateCache() {
  cachedRows = buildDecisionRows();
  cachedLoadedAt = new Date().toISOString();
}

function sendState(res) {
  try {
    reloadStateCache();
    sendJson(res, 200, {
      beamline,
      activeRulebookVersion,
      activeRulebookLabel,
      seedDataset,
      queueSource: fs.existsSync(queuePath) ? posixRel(queuePath) : posixRel(rel("outputs", beamline, "_work", "raw_extracted_pvs.yaml")),
      loadedAt: cachedLoadedAt,
      paths: {
        reviewDecisions: posixRel(decisionsPath),
        acceptedDecisions: posixRel(acceptedPath),
        fixedDecisions: posixRel(fixedPath),
        seedDecisions: posixRel(seedDecisionsPath),
      },
      reviewStatuses: REVIEW_STATUSES,
      rows: cachedRows,
    });
  } catch (err) {
    sendJson(res, 500, { error: "state_error", message: err.message });
  }
}

function saveDecisionRows(res, body) {
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
          <p class="subtitle">SEO_V2 registry review queue와 historical SEO fixed/approved seed를 같은 DB-style row browser에서 검토합니다.</p>
        </div>
        <div class="meta">
          <div><strong>Dataset</strong>: <span class="code" id="beamlineName">loading</span></div>
          <div><strong>Rule</strong>: <span class="code">BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]</span></div>
          <div><strong>Queue</strong>: <span class="code" id="queueSource">loading</span></div>
          <div><strong>Seed</strong>: <span class="code">fixtures/SEO_v2</span></div>
        </div>
      </div>
    </header>

    <nav class="tabs" aria-label="review views">
      <button class="tab-btn active" type="button" data-view="all">All Rows</button>
      <button class="tab-btn" type="button" data-view="beamline">Beamline Review</button>
      <button class="tab-btn" type="button" data-view="seed">Fixed Seed</button>
      <button class="tab-btn" type="button" data-view="attention">Needs Input</button>
      <button class="tab-btn" type="button" data-view="fixed">Fixed/Approved</button>
    </nav>

    <section class="section">
      <h2>Review Registry</h2>
      <div class="cards" id="statsCards">
        <div class="card"><span class="label">Total</span><div class="value" id="statTotal">0</div><div class="desc">loaded rows</div></div>
        <div class="card"><span class="label">Visible</span><div class="value" id="statVisible">0</div><div class="desc">current filter</div></div>
        <div class="card"><span class="label">Review Queue</span><div class="value" id="statBeamline">0</div><div class="desc">active beamline rows</div></div>
        <div class="card"><span class="label">SEO Seed</span><div class="value" id="statSeed">0</div><div class="desc">fixed/approved rows</div></div>
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
              <th class="review">Fixed</th>
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

    function renderPaths() {
      const paths = state.paths || {};
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
        if (activeView === "beamline" && row.dataset !== state.beamline) return false;
        if (activeView === "seed" && row.dataset !== appConfig.seedDataset) return false;
        if (activeView === "attention" && !["needs_input", "exception", "proposal"].includes(row.reviewStatus) && !row.orphan) return false;
        if (activeView === "fixed" && !acceptedStatuses.includes(row.reviewStatus)) return false;
        if (filters.dataset !== "All" && row.dataset !== filters.dataset) return false;
        if (filters.status !== "All" && row.reviewStatus !== filters.status) return false;
        if (filters.port !== "All" && row.port !== filters.port) return false;
        if (filters.area !== "All" && row.area !== filters.area) return false;
        if (filters.dev !== "All" && row.dev !== filters.dev) return false;
        return !filters.search || searchText(row).includes(filters.search);
      });
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
      const beamlineRows = rows.filter(function(row) { return row.dataset === state.beamline; }).length;
      const needs = rows.filter(function(row) {
        return ["needs_input", "exception", "proposal"].includes(row.reviewStatus);
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
        formatNumber(rows.length) + "</strong>. Accepted/fixed: <strong>" +
        formatNumber(accepted) + "</strong>, fixed only: <strong>" + formatNumber(fixed) + "</strong>.";
    }

    function renderRow(row) {
      const tr = document.createElement("tr");
      tr.className = "row-" + (row.reviewStatus || "").replace(/[^a-z0-9_]/gi, "") + (row.orphan ? " row-orphan" : "");
      tr.appendChild(seqCell(row));
      tr.appendChild(datasetCell(row));
      tr.appendChild(rawCell(row));
      tr.appendChild(statusCell(row));
      tr.appendChild(checkCell(row, "accepted"));
      tr.appendChild(checkCell(row, "fixed"));
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

    async function saveRows() {
      setStatus("Saving decisions...");
      try {
        const rowsToSave = rows.filter(function(row) {
          return row.dataset !== appConfig.seedDataset;
        });
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
          "Saved " + formatNumber(data.rowCount) + " beamline rows. Fixed: " +
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
