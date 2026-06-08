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
const ABBREVIATION_REVIEW_FIELDS = ["section", "port", "area", "device", "subdevice"];

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
    const label = `sourceRows[${index}]`;
    for (const field of ["uid", "rowId", "poolId", "sourceId", "sourceAnchor", "reviewStatus"]) {
      if (!row[field]) errors.push(`${label}.${field} is required`);
    }
    errors.push(...validateSourceTrace(row, label));
    errors.push(...validateReviewerVisibleNotes(row, label));
    if (!DURABLE_REVIEW_STATUSES.has(row.reviewStatus)) {
      errors.push(`${label} invalid reviewStatus: ${row.reviewStatus}`);
    }
    errors.push(...validateSourceRow(row, label));
  }
  return errors;
}

function validateReviewerVisibleNotes(row, label) {
  const errors = [];
  const trace = row.sourceTrace || {};
  if (trace.sourceKind === "agent_input_conversion" && !stringValue(row.note)) {
    const metadataNote = stringValue(row.metadata && row.metadata.htmlStructuredCandidate
      ? row.metadata.htmlStructuredCandidate.note
      : "");
    const metadataHint = metadataNote ? " metadata note is not reviewer-visible" : "";
    errors.push(`${label}.note is required for agent_input_conversion rows;${metadataHint}`);
  }
  if (stringValue(row.reviewNote)) {
    errors.push(`${label}.reviewNote is reserved for decision overlays, not source rows`);
  }
  errors.push(...validateNoteContract(row, label));
  errors.push(...validateComponentEvidence(row, label));
  return errors;
}

function validateNoteContract(row, label) {
  const errors = [];
  const contract = stringValue(row.metadata && row.metadata.noteContract);
  if (!contract) return errors;
  if (contract !== "standard_pv_evidence_v1") {
    return [`${label}.metadata.noteContract has unsupported value: ${contract}`];
  }
  const note = stringValue(row.note);
  const requiredSections = [
    "Source:",
    "HTML candidate:",
    "Chosen PV:",
    "Component changes:",
    "Mapping evidence:",
    "Uncertainty/Review required:",
    "Vocabulary:",
  ];
  let previousIndex = -1;
  for (const section of requiredSections) {
    const index = note.indexOf(section);
    if (index < 0) {
      errors.push(`${label}.note missing ${section} for standard_pv_evidence_v1`);
      continue;
    }
    if (index <= previousIndex) {
      errors.push(`${label}.note section order invalid near ${section}`);
    }
    previousIndex = index;
  }
  for (let i = 0; i < requiredSections.length; i += 1) {
    const section = requiredSections[i];
    const start = note.indexOf(section);
    if (start < 0) continue;
    const nextStarts = requiredSections
      .slice(i + 1)
      .map((nextSection) => note.indexOf(nextSection))
      .filter((index) => index > start);
    const end = nextStarts.length > 0 ? Math.min(...nextStarts) : note.length;
    const value = note.slice(start + section.length, end).trim();
    if (!value) {
      errors.push(`${label}.note section ${section} is empty for standard_pv_evidence_v1`);
    }
  }
  return errors;
}

function validateComponentEvidence(row, label) {
  const errors = [];
  const contract = stringValue(row.metadata && row.metadata.noteContract);
  if (contract !== "standard_pv_evidence_v1") return errors;

  const evidence = row.metadata && row.metadata.componentEvidence;
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return [`${label}.metadata.componentEvidence is required for standard_pv_evidence_v1`];
  }

  for (const field of ABBREVIATION_REVIEW_FIELDS) {
    const fieldEvidence = evidence[field];
    const fieldLabel = `${label}.metadata.componentEvidence.${field}`;
    if (!fieldEvidence || typeof fieldEvidence !== "object" || Array.isArray(fieldEvidence)) {
      errors.push(`${fieldLabel} is required`);
      continue;
    }
    const candidates = Array.isArray(fieldEvidence.exactCodeCandidates)
      ? fieldEvidence.exactCodeCandidates
      : [];
    if (candidates.length === 0) {
      errors.push(`${fieldLabel}.exactCodeCandidates must be a non-empty array`);
    }
    for (const [candidateIndex, candidate] of candidates.entries()) {
      const candidateLabel = `${fieldLabel}.exactCodeCandidates[${candidateIndex}]`;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        errors.push(`${candidateLabel} must be an object`);
        continue;
      }
      if (candidate.code !== row[field]) {
        errors.push(`${candidateLabel}.code must match row.${field}: ${row[field]}`);
      }
      if (!nonEmptyStringArray(candidate.sourceTerms)) {
        errors.push(`${candidateLabel}.sourceTerms must be a non-empty string array`);
      }
      if (!nonEmptyStringArray(candidate.resolutionKeyCandidates)) {
        errors.push(`${candidateLabel}.resolutionKeyCandidates must be a non-empty string array`);
      }
      if (!stringValue(candidate.sourceAnchor)) {
        errors.push(`${candidateLabel}.sourceAnchor is required`);
      }
      errors.push(...validatePatternCandidates(candidate.patternCandidates, `${candidateLabel}.patternCandidates`));
    }
    errors.push(...validatePatternCandidates(fieldEvidence.patternCandidates, `${fieldLabel}.patternCandidates`));
    if (field === "subdevice" && /^[A-Z]+\d+$/.test(stringValue(row.subdevice))) {
      const patterns = [
        ...(Array.isArray(fieldEvidence.patternCandidates) ? fieldEvidence.patternCandidates : []),
        ...candidates.flatMap((candidate) =>
          Array.isArray(candidate.patternCandidates) ? candidate.patternCandidates : [],
        ),
      ];
      if (patterns.length === 0) {
        errors.push(`${fieldLabel} must include patternCandidates for instance subdevice ${row.subdevice}`);
      }
    }
  }
  return errors;
}

function validatePatternCandidates(patterns, label) {
  const errors = [];
  if (patterns === undefined) return errors;
  if (!Array.isArray(patterns)) return [`${label} must be an array when present`];
  for (const [index, pattern] of patterns.entries()) {
    if (!stringValue(pattern)) {
      errors.push(`${label}[${index}] must be a non-empty string`);
      continue;
    }
    if (!/^[A-Z0-9#]+$/.test(pattern)) {
      errors.push(`${label}[${index}] may only contain A-Z, 0-9, and #`);
    }
    if (!pattern.includes("#")) {
      errors.push(`${label}[${index}] must include at least one # digit token`);
    }
  }
  return errors;
}

function validateSourceTrace(row, label) {
  const errors = [];
  const trace = row.sourceTrace;
  if (!trace || typeof trace !== "object") {
    return [`${label}.sourceTrace is required`];
  }
  for (const field of ["sourceId", "sourceAnchor", "sourceKind", "sourceLabel"]) {
    if (!trace[field]) errors.push(`${label}.sourceTrace.${field} is required`);
  }
  if (!Number.isInteger(trace.sourceLine)) {
    errors.push(`${label}.sourceTrace.sourceLine must be an integer`);
  }
  if (trace.sourceId !== row.sourceId) {
    errors.push(`${label}.sourceTrace.sourceId must match sourceId`);
  }
  if (trace.sourceAnchor !== row.sourceAnchor) {
    errors.push(`${label}.sourceTrace.sourceAnchor must match sourceAnchor`);
  }
  return errors;
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function nonEmptyStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => Boolean(stringValue(item)));
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
  ABBREVIATION_REVIEW_FIELDS,
  COMPLETE_REVIEW_STATUSES,
  DURABLE_REVIEW_STATUSES,
  loadPool,
  mergeRows,
  stableUid,
  updateDecision,
  validatePoolSourceRows,
};
