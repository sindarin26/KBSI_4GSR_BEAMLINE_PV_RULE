const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { validateSourceRow } = require("../seo_v3_pilot/seo_v3_contract");

const DURABLE_REVIEW_STATUSES = new Set([
  "draft",
  "needs_input",
  "accepted",
  "approved",
  "rejected",
  "deprecated",
  "exception",
  "proposal",
  "skipped",
  "orphan",
]);

const COMPLETE_REVIEW_STATUSES = new Set(["accepted", "approved"]);

function stableUid({ poolId, sourceId, sourceAnchor }) {
  const missing = [];
  if (!poolId) missing.push("poolId");
  if (!sourceId) missing.push("sourceId");
  if (!sourceAnchor) missing.push("sourceAnchor");
  if (missing.length > 0) {
    throw new Error(`cannot create uid; missing ${missing.join(", ")}`);
  }
  const identity = `${poolId}\0${sourceId}\0${sourceAnchor}`;
  return `pvrow_${crypto.createHash("sha1").update(identity).digest("hex").slice(0, 16)}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function listFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function parseFlatYaml(text) {
  const data = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return data;
}

function loadManifest(poolDir) {
  const manifestPath = path.join(poolDir, "manifest.yaml");
  return {
    path: manifestPath,
    data: parseFlatYaml(fs.readFileSync(manifestPath, "utf8")),
  };
}

function normalizeSourceRow(row, inherited = {}) {
  const normalized = {
    ...row,
    poolId: row.poolId || inherited.poolId,
    sourceId: row.sourceId || inherited.sourceId,
  };
  const expectedUid = stableUid(normalized);
  if (normalized.uid && normalized.uid !== expectedUid) {
    throw new Error(
      `uid mismatch for ${normalized.sourceAnchor}: expected ${expectedUid}, found ${normalized.uid}`,
    );
  }
  normalized.uid = expectedUid;
  return normalized;
}

function normalizeDecision(decision) {
  if (!decision.uid) {
    throw new Error("decision overlay missing uid");
  }
  if (!decision.reviewStatus || !DURABLE_REVIEW_STATUSES.has(decision.reviewStatus)) {
    throw new Error(`decision ${decision.uid} has invalid reviewStatus: ${decision.reviewStatus}`);
  }
  return { ...decision };
}

function loadSourceRows(poolDir) {
  const sourceDir = path.join(poolDir, "sources");
  const rows = [];
  const files = listFiles(sourceDir, ".rows.json");
  for (const file of files) {
    const data = readJson(file);
    const inherited = {
      poolId: data.poolId,
      sourceId: data.sourceId,
    };
    for (const row of data.rows || []) {
      rows.push(normalizeSourceRow(row, inherited));
    }
  }
  return { files, rows };
}

function loadDecisionRows(poolDir) {
  const decisionDir = path.join(poolDir, "decisions");
  const decisions = [];
  const files = listFiles(decisionDir, ".decisions.json");
  for (const file of files) {
    const data = readJson(file);
    for (const decision of data.decisions || []) {
      decisions.push(normalizeDecision(decision));
    }
  }
  return { files, decisions };
}

function loadPool(poolDir) {
  const manifest = loadManifest(poolDir);
  const sources = loadSourceRows(poolDir);
  const decisions = loadDecisionRows(poolDir);
  return {
    manifest,
    sourceFiles: sources.files,
    decisionFiles: decisions.files,
    sourceRows: sources.rows,
    decisions: decisions.decisions,
  };
}

function validatePoolSourceRows(sourceRows) {
  const errors = [];
  for (const [index, row] of sourceRows.entries()) {
    for (const field of ["uid", "rowId", "poolId", "sourceId", "sourceAnchor", "reviewStatus"]) {
      if (!row[field]) errors.push(`sourceRows[${index}].${field} is required`);
    }
    if (!DURABLE_REVIEW_STATUSES.has(row.reviewStatus)) {
      errors.push(`sourceRows[${index}] invalid reviewStatus: ${row.reviewStatus}`);
    }
    errors.push(...validateSourceRow(row, `sourceRows[${index}]`));
  }
  return errors;
}

function mergeRows(sourceRows, decisions) {
  const sourceByUid = new Map(sourceRows.map((row) => [row.uid, row]));
  const decisionsByUid = new Map(decisions.map((decision) => [decision.uid, decision]));
  const mergedRows = [];

  for (const sourceRow of sourceRows) {
    const decision = decisionsByUid.get(sourceRow.uid);
    const merged = decision
      ? {
          ...sourceRow,
          ...decision,
          sourceRow,
          decision,
          orphan: false,
        }
      : {
          ...sourceRow,
          sourceRow,
          decision: null,
          orphan: false,
        };
    merged.computed = { conflict: false, conflictReasons: [] };
    mergedRows.push(merged);
  }

  for (const decision of decisions) {
    if (sourceByUid.has(decision.uid)) continue;
    mergedRows.push({
      ...decision,
      reviewStatus: "orphan",
      previousReviewStatus: decision.reviewStatus,
      sourceRow: null,
      decision,
      orphan: true,
      computed: { conflict: false, conflictReasons: ["decision_without_source"] },
    });
  }

  const duplicateConflicts = markDuplicateStandardPvConflicts(mergedRows);
  return { rows: mergedRows, duplicateStandardPvConflicts: duplicateConflicts };
}

function markDuplicateStandardPvConflicts(rows) {
  const byPv = new Map();
  for (const row of rows) {
    if (row.orphan || !COMPLETE_REVIEW_STATUSES.has(row.reviewStatus) || !row.standardPv) continue;
    if (!byPv.has(row.standardPv)) byPv.set(row.standardPv, []);
    byPv.get(row.standardPv).push(row);
  }

  const conflicts = [];
  for (const [standardPv, group] of byPv.entries()) {
    if (group.length < 2) continue;
    const uids = group.map((row) => row.uid);
    conflicts.push({ standardPv, uids });
    for (const row of group) {
      row.computed.conflict = true;
      row.computed.conflictReasons.push(`duplicate_standardPv:${standardPv}`);
    }
  }
  return conflicts;
}

function updateDecision(decisions, uid, patch) {
  return decisions.map((decision) => (decision.uid === uid ? { ...decision, ...patch } : decision));
}

module.exports = {
  COMPLETE_REVIEW_STATUSES,
  DURABLE_REVIEW_STATUSES,
  loadPool,
  mergeRows,
  stableUid,
  updateDecision,
  validatePoolSourceRows,
};
