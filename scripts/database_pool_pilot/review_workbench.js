#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");

const {
  DURABLE_REVIEW_STATUSES,
  loadPool,
  mergeRows,
} = require("./database_pool");
const {
  REGISTRY_KINDS,
  REGISTRY_STATUSES,
  blockingAbbreviationIssues,
  loadRegistry,
  updateRegistryEntry,
  validateRegistry,
} = require("../abbreviation_registry_pilot/abbreviation_registry");
const { importDatabasePool } = require("./importer");

const DEFAULT_REGISTRY_PATH = path.join("fixtures", "seo_v3_pilot", "abbreviation_registry.json");

function listPoolIds(rootDir) {
  const poolRoot = path.join(rootDir, "database_pool");
  if (!fs.existsSync(poolRoot)) return [];
  return fs
    .readdirSync(poolRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(poolRoot, entry.name, "manifest.yaml")))
    .map((entry) => entry.name)
    .sort();
}

function loadWorkbenchState(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const registryPath = path.resolve(rootDir, options.registryPath || DEFAULT_REGISTRY_PATH);
  const poolIds = options.poolIds && options.poolIds.length ? options.poolIds : listPoolIds(rootDir);
  const registry = loadRegistry(registryPath);
  const registryErrors = validateRegistry(registry);
  if (registryErrors.length > 0) {
    throw new Error(`abbreviation registry validation failed: ${registryErrors.join("; ")}`);
  }

  const pools = poolIds.map((poolId) => {
    const poolDir = path.join(rootDir, "database_pool", poolId);
    const pool = loadPool(poolDir);
    return { poolId, poolDir, pool };
  });

  const rows = [];
  for (const { poolId, pool } of pools) {
    const merged = mergeRows(pool.sourceRows, pool.decisions);
    for (const row of merged.rows) {
      rows.push(normalizeWorkbenchRow(row, poolId, registry));
    }
  }

  return {
    loadedAt: new Date().toISOString(),
    poolIds,
    rows,
    registry,
    reviewStatuses: [...DURABLE_REVIEW_STATUSES],
    registryKinds: [...REGISTRY_KINDS],
    registryStatuses: [...REGISTRY_STATUSES],
    filterOptions: buildFilterOptions(rows),
    stats: computeStats(rows, rows),
    paths: {
      registry: slash(path.relative(rootDir, registryPath)),
    },
  };
}

function normalizeWorkbenchRow(row, poolId, registry) {
  const normalized = {
    ...row,
    poolId: row.poolId || poolId,
    rowId: row.rowId || row.standardPv || row.uid,
    sourceId: row.sourceId || "",
    sourceAnchor: row.sourceAnchor || "",
    reviewStatus: row.reviewStatus || "draft",
    reviewNote: row.reviewNote || "",
  };
  const prefix = renderPrefix(normalized);
  const abbreviationIssues = normalized.orphan
    ? []
    : blockingAbbreviationIssues(normalized, registry).map((issue) => ({
        field: issue.field,
        kind: issue.kind,
        code: issue.code,
        status: issue.status,
        reason: issue.reason,
      }));
  const conflict = Boolean(normalized.computed && normalized.computed.conflict);
  const approved = normalized.reviewStatus === "accepted" || normalized.reviewStatus === "approved";
  const closed = new Set(["rejected", "deprecated", "skipped", "orphan"]).has(normalized.reviewStatus);
  const needsInput = normalized.reviewStatus === "needs_input" || abbreviationIssues.length > 0;
  const pending =
    normalized.reviewStatus === "draft" &&
    !normalized.orphan &&
    !conflict &&
    abbreviationIssues.length === 0;
  normalized.computed = {
    ...(normalized.computed || {}),
    abbreviationIssues,
    approved,
    conflict,
    needsInput,
    pending,
    prefix,
    reviewQueue: !approved && !closed,
  };
  return normalized;
}

function renderPrefix(row) {
  if (!row.section || !row.port || !row.area) return "";
  return `${row.section}${row.port}-${row.area}`;
}

function computeStats(rows, visibleRows) {
  return {
    total: rows.length,
    visible: visibleRows.length,
    reviewQueue: rows.filter((row) => row.computed.reviewQueue).length,
    pending: rows.filter((row) => row.computed.pending).length,
    needsInput: rows.filter((row) => row.computed.needsInput).length,
    conflicts: rows.filter((row) => row.computed.conflict).length,
    approved: rows.filter((row) => row.computed.approved).length,
  };
}

function buildFilterOptions(rows) {
  return {
    poolId: unique(rows.map((row) => row.poolId)),
    sourceId: unique(rows.map((row) => row.sourceId)),
    reviewStatus: unique(rows.map((row) => row.reviewStatus)),
    section: unique(rows.map((row) => row.section)),
    port: unique(rows.map((row) => row.port)),
    area: unique(rows.map((row) => row.area)),
    device: unique(rows.map((row) => row.device)),
    subdevice: unique(rows.map((row) => row.subdevice)),
    prefix: unique(rows.map((row) => row.computed.prefix)),
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function filterRows(rows, filters = {}) {
  const search = norm(filters.search);
  return rows.filter((row) => {
    if (filters.poolId && row.poolId !== filters.poolId) return false;
    if (filters.sourceId && row.sourceId !== filters.sourceId) return false;
    if (filters.reviewStatus && row.reviewStatus !== filters.reviewStatus) return false;
    if (filters.section && row.section !== filters.section) return false;
    if (filters.port && row.port !== filters.port) return false;
    if (filters.area && row.area !== filters.area) return false;
    if (filters.device && row.device !== filters.device) return false;
    if (filters.subdevice && row.subdevice !== filters.subdevice) return false;
    if (filters.prefix && row.computed.prefix !== filters.prefix) return false;
    if (!search) return true;
    return norm(
      [
        row.uid,
        row.rowId,
        row.standardPv,
        row.sourcePv,
        row.sourceId,
        row.sourceAnchor,
        row.note,
        row.reviewNote,
      ].join(" "),
    ).includes(search);
  });
}

function norm(value) {
  return String(value || "").toLowerCase();
}

function stateWithVisible(options = {}, filters = {}) {
  const state = loadWorkbenchState(options);
  const visibleRows = filterRows(state.rows, filters);
  return {
    ...state,
    visibleRows,
    stats: computeStats(state.rows, visibleRows),
  };
}

function saveRowDecision(options, uid, patch) {
  const rootDir = options.rootDir || process.cwd();
  const state = loadWorkbenchState(options);
  const row = state.rows.find((item) => item.uid === uid);
  if (!row) throw new Error(`unknown row uid: ${uid}`);
  const reviewStatus = patch.reviewStatus || row.reviewStatus;
  if (!DURABLE_REVIEW_STATUSES.has(reviewStatus)) {
    throw new Error(`invalid reviewStatus: ${reviewStatus}`);
  }
  const decisionPath = decisionFileForPool(rootDir, row.poolId);
  const data = readDecisionFile(decisionPath, row.poolId);
  const existingIndex = data.decisions.findIndex((decision) => decision.uid === uid);
  const nextDecision = {
    ...(existingIndex >= 0 ? data.decisions[existingIndex] : { uid }),
    reviewStatus,
    reviewNote:
      patch.reviewNote === undefined
        ? stringValue(existingIndex >= 0 ? data.decisions[existingIndex].reviewNote : "")
        : stringValue(patch.reviewNote),
    updatedAt: new Date().toISOString(),
  };
  if (patch.locked !== undefined) nextDecision.locked = Boolean(patch.locked);
  if (patch.useAsExample !== undefined) nextDecision.useAsExample = Boolean(patch.useAsExample);
  if (existingIndex >= 0) data.decisions[existingIndex] = nextDecision;
  else data.decisions.push(nextDecision);
  writeJson(decisionPath, data);
  return stateWithVisible(options);
}

function saveAbbreviationDecision(options, patch) {
  const rootDir = options.rootDir || process.cwd();
  const registryPath = path.resolve(rootDir, options.registryPath || DEFAULT_REGISTRY_PATH);
  const registry = loadRegistry(registryPath);
  const scope = patch.scope || "global";
  const kind = patch.kind;
  const code = patch.code;
  const status = patch.status;
  if (!REGISTRY_KINDS.has(kind)) throw new Error(`invalid abbreviation kind: ${kind}`);
  if (!REGISTRY_STATUSES.has(status)) throw new Error(`invalid abbreviation status: ${status}`);
  if (!code) throw new Error("abbreviation code is required");

  const existing = registry.entries.find(
    (entry) => entry.scope === scope && entry.kind === kind && entry.code === code,
  );
  if (existing) {
    registry.entries = updateRegistryEntry(registry.entries, kind, code, {
      status,
      meaning: patch.meaning === undefined ? existing.meaning : stringValue(patch.meaning),
    }, scope);
  } else {
    registry.entries.push({
      code,
      kind,
      meaning: stringValue(patch.meaning || code),
      status,
      scope,
      source: stringValue(patch.source || "manual_review"),
    });
  }
  registry.entries.sort((a, b) =>
    `${a.scope}:${a.kind}:${a.code}`.localeCompare(`${b.scope}:${b.kind}:${b.code}`),
  );
  writeJson(registryPath, registry);
  return stateWithVisible(options);
}

function bulkApproveVisible(options, visibleUids, approveCandidateAbbreviations = false) {
  const uidSet = new Set(visibleUids || []);
  if (uidSet.size === 0) return { approvedCount: 0, blockedCount: 0, state: stateWithVisible(options) };

  if (approveCandidateAbbreviations) {
    approveExistingCandidateEntries(options, uidSet);
  }

  const state = loadWorkbenchState(options);
  const approvalTargets = state.rows.filter((row) => uidSet.has(row.uid) && row.computed.pending);
  for (const row of approvalTargets) {
    saveRowDecision(options, row.uid, {
      reviewStatus: "approved",
      reviewNote: "Bulk approved from visible pending rows.",
    });
  }
  const nextState = stateWithVisible(options);
  return {
    approvedCount: approvalTargets.length,
    blockedCount: uidSet.size - approvalTargets.length,
    state: nextState,
  };
}

function previewImport(options, body = {}) {
  return importDatabasePool(importOptions(options, body, false));
}

function saveImport(options, body = {}) {
  const summary = importDatabasePool(importOptions(options, body, true));
  if (summary.errors.length > 0) {
    return {
      summary,
      state: null,
    };
  }
  return {
    summary,
    state: stateWithVisible(optionsWithImportedPool(options, summary.poolId)),
  };
}

function importOptions(options, body, write) {
  const input = stringValue(body.inputDir || body.input || "").trim();
  const pool = stringValue(body.poolId || body.pool || "").trim();
  if (!input) throw new Error("inputDir is required");
  if (!pool) throw new Error("poolId is required");
  return {
    rootDir: options.rootDir || process.cwd(),
    input,
    pool,
    section: stringValue(body.section || "").trim() || undefined,
    port: stringValue(body.port || "").trim() || undefined,
    overwrite: Boolean(body.overwrite),
    write,
  };
}

function optionsWithImportedPool(options, poolId) {
  if (!options.poolIds || options.poolIds.includes(poolId)) return options;
  return {
    ...options,
    poolIds: [...options.poolIds, poolId].sort(),
  };
}

function approveExistingCandidateEntries(options, uidSet) {
  const state = loadWorkbenchState(options);
  const rootDir = options.rootDir || process.cwd();
  const registryPath = path.resolve(rootDir, options.registryPath || DEFAULT_REGISTRY_PATH);
  let registry = state.registry;
  const selectedRows = state.rows.filter((row) => uidSet.has(row.uid));
  for (const row of selectedRows) {
    for (const issue of row.computed.abbreviationIssues) {
      if (issue.status !== "candidate") continue;
      registry.entries = updateRegistryEntry(registry.entries, issue.kind, issue.code, {
        status: "approved",
      });
    }
  }
  writeJson(registryPath, registry);
}

function decisionFileForPool(rootDir, poolId) {
  const decisionDir = path.join(rootDir, "database_pool", poolId, "decisions");
  fs.mkdirSync(decisionDir, { recursive: true });
  const existing = fs
    .readdirSync(decisionDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".decisions.json"))
    .map((entry) => path.join(decisionDir, entry.name))
    .sort();
  return existing[0] || path.join(decisionDir, "workbench.decisions.json");
}

function readDecisionFile(filePath, poolId) {
  if (!fs.existsSync(filePath)) return { poolId, decisions: [] };
  const data = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  return {
    poolId: data.poolId || poolId,
    decisions: Array.isArray(data.decisions) ? data.decisions : [],
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value);
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function createServer(options = {}) {
  const runtimeOptions = {
    rootDir: options.rootDir || process.cwd(),
    registryPath: options.registryPath || DEFAULT_REGISTRY_PATH,
    poolIds: options.poolIds || null,
  };

  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "127.0.0.1"}`);
    if (req.method === "GET" && url.pathname === "/") return sendHtml(res);
    if (req.method === "GET" && url.pathname === "/api/state") {
      try {
        return sendJson(res, 200, stateWithVisible(runtimeOptions, Object.fromEntries(url.searchParams)));
      } catch (error) {
        return sendJson(res, 500, { error: "state_error", message: error.message });
      }
    }
    if (req.method === "POST" && url.pathname === "/api/row-decision") {
      return readJsonBody(req, res, (body) => {
        sendJson(res, 200, saveRowDecision(runtimeOptions, body.uid, body));
      });
    }
    if (req.method === "POST" && url.pathname === "/api/abbreviation") {
      return readJsonBody(req, res, (body) => {
        sendJson(res, 200, saveAbbreviationDecision(runtimeOptions, body));
      });
    }
    if (req.method === "POST" && url.pathname === "/api/bulk-approve") {
      return readJsonBody(req, res, (body) => {
        sendJson(
          res,
          200,
          bulkApproveVisible(runtimeOptions, body.uids || [], Boolean(body.approveCandidateAbbreviations)),
        );
      });
    }
    if (req.method === "POST" && url.pathname === "/api/import-preview") {
      return readJsonBody(req, res, (body) => {
        sendJson(res, 200, previewImport(runtimeOptions, body));
      });
    }
    if (req.method === "POST" && url.pathname === "/api/import-save") {
      return readJsonBody(req, res, (body) => {
        const result = saveImport(runtimeOptions, body);
        sendJson(res, result.summary.errors.length > 0 ? 409 : 200, result);
      });
    }
    sendJson(res, 404, { error: "not_found" });
  });
}

function readJsonBody(req, res, callback) {
  let text = "";
  req.on("data", (chunk) => {
    text += chunk;
    if (text.length > 5 * 1024 * 1024) {
      sendJson(res, 413, { error: "payload_too_large" });
      req.destroy();
    }
  });
  req.on("end", () => {
    try {
      callback(text ? JSON.parse(text) : {});
    } catch (error) {
      sendJson(res, 400, { error: "bad_request", message: error.message });
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

function sendHtml(res) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(HTML);
}

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

function poolArg() {
  const value = stringArg("--pools", "");
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : null;
}

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PV Database Pool Review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7fa;
      --panel: #ffffff;
      --line: #d9e0e8;
      --text: #17212f;
      --muted: #667386;
      --blue: #1f5a9d;
      --green: #177245;
      --amber: #9a5b00;
      --red: #a8342b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .app { max-width: 1760px; margin: 0 auto; padding: 18px; }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    h1 { margin: 0; font-size: 22px; font-weight: 760; letter-spacing: 0; }
    .status { color: var(--muted); min-height: 20px; }
    .status.ok { color: var(--green); }
    .status.err { color: var(--red); }
    .stats {
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .metric {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .metric b { display: block; font-size: 22px; line-height: 1.1; }
    .metric span { color: var(--muted); font-size: 12px; text-transform: uppercase; }
    .tabs, .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    button, select, input {
      border: 1px solid var(--line);
      border-radius: 7px;
      background: #fff;
      color: var(--text);
      font: inherit;
    }
    button {
      padding: 8px 11px;
      cursor: pointer;
      font-weight: 650;
    }
    button.primary { border-color: var(--blue); background: var(--blue); color: #fff; }
    button.tab.active { border-color: var(--blue); color: #fff; background: var(--blue); }
    .filters {
      display: grid;
      grid-template-columns: repeat(10, minmax(120px, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    .filters select, .filters input { min-width: 0; padding: 8px 9px; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }
    .scroll { overflow: auto; max-height: 68vh; }
    table { width: 100%; border-collapse: collapse; min-width: 1500px; }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #edf2f7;
      color: #435064;
      font-size: 12px;
      text-transform: uppercase;
    }
    td input, td select { width: 100%; padding: 6px 7px; }
    code {
      font-family: "Cascadia Code", Consolas, monospace;
      font-size: 12px;
      background: #f2f5f8;
      border: 1px solid #dfe6ee;
      border-radius: 6px;
      padding: 2px 5px;
      white-space: nowrap;
    }
    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 7px;
      font-size: 12px;
      font-weight: 700;
      background: #eef2f6;
      color: #435064;
    }
    .pill.warn { background: #fff2d6; color: var(--amber); }
    .pill.bad { background: #ffe5e2; color: var(--red); }
    .pill.ok { background: #e0f4e9; color: var(--green); }
    .abbr-table { min-width: 920px; }
    .import-panel {
      display: grid;
      grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) auto auto auto;
      gap: 8px;
      align-items: center;
      margin-bottom: 10px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
    }
    .import-panel input[type="text"] { width: 100%; min-width: 0; padding: 8px 9px; }
    .import-panel label { color: var(--muted); white-space: nowrap; }
    .manual-reload-note {
      display: flex;
      align-items: center;
      min-height: 36px;
      color: var(--muted);
    }
    .import-summary {
      margin-bottom: 10px;
      padding: 9px 11px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--muted);
    }
    .hide { display: none; }
    @media (max-width: 1100px) {
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .import-panel { grid-template-columns: 1fr; }
      header { align-items: flex-start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <h1>PV Database Pool Review</h1>
      <div id="status" class="status"></div>
    </header>

    <section class="stats" id="stats"></section>

    <nav class="tabs" id="tabs"></nav>

    <section class="import-panel">
      <label>Input directory <input id="importInput" type="text" value="inputs/BL10A"></label>
      <label>Pool ID <input id="importPool" type="text" value="BL10A"></label>
      <label><input type="checkbox" id="importOverwrite"> overwrite existing import files</label>
      <button id="importPreview">Preview Import</button>
      <button class="primary" id="importSave">Save Import</button>
    </section>
    <section class="import-summary hide" id="importSummary"></section>

    <section class="filters" id="filters"></section>

    <section class="actions">
      <button class="primary" id="bulk">Approve Visible Pending</button>
      <label><input type="checkbox" id="approveAbbr"> approve candidate abbreviations</label>
      <button id="reload">Reload</button>
      <span class="manual-reload-note">External edits are file-backed; click Reload before continuing review.</span>
    </section>

    <section class="panel" id="rowsPanel">
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Pool</th><th>PV</th><th>State</th><th>Review</th><th>Codes</th>
              <th>Source</th><th>Note</th><th>Action</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </section>

    <section class="panel hide" id="abbrPanel">
      <div class="scroll">
        <table class="abbr-table">
          <thead><tr><th>Kind</th><th>Code</th><th>Meaning</th><th>Status</th><th>Scope</th><th>Action</th></tr></thead>
          <tbody id="abbrRows"></tbody>
        </table>
      </div>
    </section>
  </div>
  <script>
    const tabs = ["All Rows", "Review", "Needs Input", "Conflicts", "Approved", "Abbreviations"];
    const filterKeys = ["poolId", "sourceId", "reviewStatus", "section", "port", "area", "device", "subdevice", "prefix"];
    const filters = {};
    let activeTab = "All Rows";
    let state = null;

    const el = (id) => document.getElementById(id);

    async function load() {
      const response = await fetch("/api/state");
      state = await response.json();
      render();
      setStatus("Loaded " + state.rows.length + " rows", "ok");
    }

    function setStatus(text, type) {
      el("status").textContent = text || "";
      el("status").className = "status " + (type || "");
    }

    function render() {
      renderStats();
      renderTabs();
      renderFilters();
      renderRows();
      renderAbbreviations();
    }

    function tabRows() {
      let rows = state.rows.filter(matchesFilters);
      if (activeTab === "Review") rows = rows.filter((row) => row.computed.reviewQueue);
      if (activeTab === "Needs Input") rows = rows.filter((row) => row.computed.needsInput);
      if (activeTab === "Conflicts") rows = rows.filter((row) => row.computed.conflict);
      if (activeTab === "Approved") rows = rows.filter((row) => row.computed.approved);
      return rows;
    }

    function matchesFilters(row) {
      for (const key of filterKeys) {
        if (filters[key] && (key === "prefix" ? row.computed.prefix : row[key]) !== filters[key]) return false;
      }
      const q = (filters.search || "").toLowerCase();
      if (!q) return true;
      return [row.uid, row.rowId, row.standardPv, row.sourcePv, row.sourceId, row.sourceAnchor, row.note, row.reviewNote]
        .join(" ").toLowerCase().includes(q);
    }

    function renderStats() {
      const visible = activeTab === "Abbreviations" ? state.registry.entries : tabRows();
      const items = [
        ["Total", state.rows.length],
        ["Visible", visible.length],
        ["Review Queue", state.stats.reviewQueue],
        ["Pending", state.stats.pending],
        ["Needs Input", state.stats.needsInput],
        ["Conflicts", state.stats.conflicts],
      ];
      el("stats").innerHTML = items.map(([label, value]) => '<div class="metric"><b>' + value + '</b><span>' + label + '</span></div>').join("");
    }

    function renderTabs() {
      el("tabs").innerHTML = tabs.map((tab) =>
        '<button class="tab ' + (tab === activeTab ? "active" : "") + '" data-tab="' + tab + '">' + tab + '</button>'
      ).join("");
      el("tabs").querySelectorAll("button").forEach((button) => {
        button.onclick = () => { activeTab = button.dataset.tab; render(); };
      });
    }

    function renderFilters() {
      const html = filterKeys.map((key) => {
        const options = ['<option value="">' + key + '</option>'].concat((state.filterOptions[key] || []).map((value) =>
          '<option value="' + esc(value) + '"' + (filters[key] === value ? " selected" : "") + '>' + esc(value) + '</option>'
        ));
        return '<select data-filter="' + key + '">' + options.join("") + '</select>';
      });
      html.push('<input data-filter="search" placeholder="search" value="' + esc(filters.search || "") + '">');
      el("filters").innerHTML = html.join("");
      el("filters").querySelectorAll("[data-filter]").forEach((input) => {
        input.oninput = () => { filters[input.dataset.filter] = input.value; render(); };
      });
    }

    function renderRows() {
      const showAbbr = activeTab === "Abbreviations";
      el("rowsPanel").classList.toggle("hide", showAbbr);
      el("abbrPanel").classList.toggle("hide", !showAbbr);
      if (showAbbr) return;
      el("rows").innerHTML = tabRows().map(rowHtml).join("");
      el("rows").querySelectorAll("[data-save]").forEach((button) => {
        button.onclick = () => saveRow(button.dataset.save);
      });
    }

    function rowHtml(row) {
      const issues = row.computed.abbreviationIssues || [];
      const codeState = row.computed.conflict ? '<span class="pill bad">conflict</span>' :
        row.computed.pending ? '<span class="pill ok">pending</span>' :
        issues.length ? '<span class="pill warn">' + issues.length + ' code issue(s)</span>' : '<span class="pill">reviewed</span>';
      return '<tr>' +
        '<td><code>' + esc(row.poolId) + '</code><br>' + esc(row.computed.prefix || "") + '</td>' +
        '<td><code>' + esc(row.standardPv || "") + '</code><br><span class="pill">' + esc(row.uid) + '</span></td>' +
        '<td>' + codeState + '<br>' + esc(row.reviewStatus) + '</td>' +
        '<td><select data-status="' + row.uid + '">' + statusOptions(row.reviewStatus) + '</select><input data-note="' + row.uid + '" value="' + esc(row.reviewNote || "") + '"></td>' +
        '<td>' + issues.map((issue) => '<div><code>' + esc(issue.kind + ":" + issue.code) + '</code> ' + esc(issue.status) + '</div>').join("") + '</td>' +
        '<td><code>' + esc(row.sourceId || "") + '</code><br>' + esc(row.sourceAnchor || "") + '</td>' +
        '<td>' + esc(row.note || "") + '</td>' +
        '<td><button data-save="' + row.uid + '">Save</button></td>' +
      '</tr>';
    }

    function statusOptions(current) {
      return state.reviewStatuses.map((status) =>
        '<option value="' + status + '"' + (status === current ? " selected" : "") + '>' + status + '</option>'
      ).join("");
    }

    async function saveRow(uid) {
      const reviewStatus = document.querySelector('[data-status="' + uid + '"]').value;
      const reviewNote = document.querySelector('[data-note="' + uid + '"]').value;
      const response = await fetch("/api/row-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, reviewStatus, reviewNote })
      });
      state = await response.json();
      render();
      setStatus("Saved row decision", "ok");
    }

    function renderAbbreviations() {
      el("abbrRows").innerHTML = state.registry.entries.map((entry, index) =>
        '<tr><td>' + esc(entry.kind) + '</td><td><code>' + esc(entry.code) + '</code></td>' +
        '<td><input data-abbr-meaning="' + index + '" value="' + esc(entry.meaning || "") + '"></td>' +
        '<td><select data-abbr-status="' + index + '">' + registryStatusOptions(entry.status) + '</select></td>' +
        '<td>' + esc(entry.scope || "global") + '</td><td><button data-abbr-save="' + index + '">Save</button></td></tr>'
      ).join("");
      el("abbrRows").querySelectorAll("[data-abbr-save]").forEach((button) => {
        button.onclick = () => saveAbbreviation(Number(button.dataset.abbrSave));
      });
    }

    function registryStatusOptions(current) {
      return state.registryStatuses.map((status) =>
        '<option value="' + status + '"' + (status === current ? " selected" : "") + '>' + status + '</option>'
      ).join("");
    }

    async function saveAbbreviation(index) {
      const entry = state.registry.entries[index];
      const response = await fetch("/api/abbreviation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: entry.kind,
          code: entry.code,
          scope: entry.scope || "global",
          status: document.querySelector('[data-abbr-status="' + index + '"]').value,
          meaning: document.querySelector('[data-abbr-meaning="' + index + '"]').value
        })
      });
      state = await response.json();
      render();
      setStatus("Saved abbreviation decision", "ok");
    }

    async function bulkApprove() {
      const uids = tabRows().filter((row) => row.computed.pending || el("approveAbbr").checked).map((row) => row.uid);
      const response = await fetch("/api/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uids, approveCandidateAbbreviations: el("approveAbbr").checked })
      });
      const result = await response.json();
      state = result.state;
      render();
      setStatus("Approved " + result.approvedCount + " row(s); blocked " + result.blockedCount, "ok");
    }

    function importPayload() {
      return {
        inputDir: el("importInput").value,
        poolId: el("importPool").value,
        overwrite: el("importOverwrite").checked
      };
    }

    async function previewImport() {
      const response = await fetch("/api/import-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importPayload())
      });
      const summary = await response.json();
      renderImportSummary(summary);
      setStatus(summary.errors.length ? "Import preview has errors" : "Import preview ready", summary.errors.length ? "err" : "ok");
    }

    async function saveImport() {
      const response = await fetch("/api/import-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importPayload())
      });
      const result = await response.json();
      renderImportSummary(result.summary);
      if (result.state) {
        state = result.state;
        render();
        setStatus("Saved import and reloaded rows", "ok");
      } else {
        setStatus("Import save failed", "err");
      }
    }

    function renderImportSummary(summary) {
      const panel = el("importSummary");
      panel.classList.remove("hide");
      panel.innerHTML = [
        "files " + summary.filesScanned,
        "rows " + summary.rowsExtracted,
        "targets " + summary.targetFiles.length,
        "warnings " + summary.warnings.length,
        "errors " + summary.errors.length
      ].map(esc).join(" · ") +
        (summary.errors.length ? "<br><b>Errors</b><br>" + summary.errors.map(esc).join("<br>") : "") +
        (summary.warnings.length ? "<br><b>Warnings</b><br>" + summary.warnings.map(esc).join("<br>") : "");
    }

    function esc(value) {
      return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[ch]));
    }

    el("bulk").onclick = bulkApprove;
    el("reload").onclick = load;
    el("importPreview").onclick = previewImport;
    el("importSave").onclick = saveImport;
    load().catch((error) => setStatus(error.message, "err"));
  </script>
</body>
</html>`;

if (require.main === module) {
  const host = stringArg("--host", "127.0.0.1");
  const port = numberArg("--port", 8775);
  const registryPath = stringArg("--registry", DEFAULT_REGISTRY_PATH);
  const poolIds = poolArg();
  const server = createServer({ rootDir: process.cwd(), registryPath, poolIds });
  server.listen(port, host, () => {
    const pools = poolIds && poolIds.length ? poolIds.join(", ") : "all database_pool entries";
    console.log(`Database-pool review workbench: http://${host}:${port}/`);
    console.log(`Pools: ${pools}`);
    console.log(`Registry: ${registryPath}`);
  });
  server.on("error", (error) => {
    console.error(`FAIL: cannot start review workbench on ${host}:${port}: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_REGISTRY_PATH,
  bulkApproveVisible,
  createServer,
  filterRows,
  listPoolIds,
  loadWorkbenchState,
  previewImport,
  saveAbbreviationDecision,
  saveImport,
  saveRowDecision,
  stateWithVisible,
};
