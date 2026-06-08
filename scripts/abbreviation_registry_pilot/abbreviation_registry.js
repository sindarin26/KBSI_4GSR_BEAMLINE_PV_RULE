const fs = require("fs");
const path = require("path");

const REGISTRY_KINDS = new Set(["section", "port", "area", "device", "subdevice"]);
const REGISTRY_STATUSES = new Set(["candidate", "approved", "deprecated", "rejected"]);
const EVIDENCE_REVIEW_STATUSES = new Set(["accepted", "approved"]);
const REVIEW_REGISTRY_SCHEMA_VERSION = "seo_v3_abbreviation_review_v1";
const PRIMARY_REGISTRY_REL_PATH = path.join("database_pool", "abbreviations", "registry.json");
const COMPONENT_KIND_BY_FIELD = {
  section: "section",
  port: "port",
  area: "area",
  device: "device",
  subdevice: "subdevice",
};
const STRUCTURAL_CODE_FIELDS = new Set(["section", "port", "area"]);

function loadRegistry(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function resolveRegistryPath(rootDir) {
  return path.join(rootDir, PRIMARY_REGISTRY_REL_PATH);
}

function loadDefaultRegistry(rootDir) {
  return loadRegistry(resolveRegistryPath(rootDir));
}

function registryKey(entry) {
  if (entry.codePattern) {
    return `${entry.scope || ""}:${entry.kind || ""}:pattern:${entry.codePattern || ""}:${entry.meaning || ""}`;
  }
  return `${entry.scope || ""}:${entry.kind || ""}:${entry.code || ""}`;
}

function buildRegistryIndex(entries) {
  const index = new Map();
  for (const entry of entries) {
    index.set(registryKey(entry), entry);
  }
  return index;
}

function findEntry(index, kind, code, scope = "global") {
  return index.get(`${scope}:${kind}:${code}`) || null;
}

function findPatternEntries(entries, kind, code, scope = "global", allowedPatterns = []) {
  const allowed = new Set((allowedPatterns || []).filter(Boolean));
  return (entries || []).filter((entry) =>
    entry.scope === scope &&
    entry.kind === kind &&
    entry.codePattern &&
    (allowed.size === 0 || allowed.has(entry.codePattern)) &&
    patternMatches(entry.codePattern, code),
  );
}

function validateRegistry(registry, options = {}) {
  const errors = [];
  if (!registry || !Array.isArray(registry.entries)) {
    return ["registry.entries must be an array"];
  }

  const strictReview = options.requireReviewFields || registry.schemaVersion === REVIEW_REGISTRY_SCHEMA_VERSION;
  if (strictReview) {
    if (registry.schemaVersion !== REVIEW_REGISTRY_SCHEMA_VERSION) {
      errors.push(`schemaVersion must be ${REVIEW_REGISTRY_SCHEMA_VERSION}`);
    }
    if (registry.sourceOfTruth !== true) {
      errors.push("sourceOfTruth must be true for abbreviation review registry");
    }
    if (!registry.statusPolicy || registry.statusPolicy.candidateBlocksApproval !== true) {
      errors.push("statusPolicy.candidateBlocksApproval must be true");
    }
  }

  const seen = new Set();
  for (const [index, entry] of registry.entries.entries()) {
    const loc = `entries[${index}]`;
    for (const field of ["kind", "meaning", "status", "scope"]) {
      if (!entry[field]) errors.push(`${loc}.${field} is required`);
    }
    const hasCode = Boolean(entry.code);
    const hasPattern = Boolean(entry.codePattern);
    if (!hasCode && !hasPattern) {
      errors.push(`${loc}.code or ${loc}.codePattern is required`);
    }
    if (hasCode && hasPattern) {
      errors.push(`${loc} must use either code or codePattern, not both`);
    }
    if (hasPattern) {
      errors.push(...validatePatternEntry(entry, loc));
    }
    if (entry.kind && !REGISTRY_KINDS.has(entry.kind)) {
      errors.push(`${loc}.kind is invalid: ${entry.kind}`);
    }
    if (entry.status && !REGISTRY_STATUSES.has(entry.status)) {
      errors.push(`${loc}.status is invalid: ${entry.status}`);
    }
    if (entry.scope && entry.scope !== "global") {
      errors.push(`${loc}.scope must be global for the current abbreviation registry: ${entry.scope}`);
    }
    const key = registryKey(entry);
    if (seen.has(key)) errors.push(`${loc} duplicate registry key: ${key}`);
    seen.add(key);

    if (strictReview) {
      errors.push(...validateReviewSource(entry.source, `${loc}.source`, options.rootDir));
      if (!entry.rationale || typeof entry.rationale !== "string") {
        errors.push(`${loc}.rationale is required`);
      }
      errors.push(...validateUsageEvidence(entry.usageEvidence, `${loc}.usageEvidence`, options.rootDir));
    } else if (entry.source && typeof entry.source !== "string") {
      errors.push(`${loc}.source must be a string when review fields are not required`);
    }
  }
  return errors;
}

function validatePatternEntry(entry, loc) {
  const errors = [];
  if (!entry.codePattern || typeof entry.codePattern !== "string") {
    errors.push(`${loc}.codePattern must be a non-empty string`);
    return errors;
  }
  if (!entry.codePattern.includes("#")) {
    errors.push(`${loc}.codePattern must include at least one # digit token`);
  }
  if (!/^[A-Z0-9#]+$/.test(entry.codePattern)) {
    errors.push(`${loc}.codePattern may only contain A-Z, 0-9, and #`);
  }
  if (!entry.baseCode || typeof entry.baseCode !== "string") {
    errors.push(`${loc}.baseCode is required for pattern entries`);
  } else {
    const prefix = entry.codePattern.split("#")[0];
    if (entry.baseCode !== prefix) {
      errors.push(`${loc}.baseCode must equal the literal prefix before the first #: ${prefix}`);
    }
  }
  return errors;
}

function patternMatches(codePattern, code) {
  if (!codePattern || !code) return false;
  const source = String(codePattern);
  let regex = "^";
  for (const char of source) {
    if (char === "#") {
      regex += "[0-9]";
    } else {
      regex += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }
  regex += "$";
  return new RegExp(regex).test(String(code));
}

function validateReviewSource(source, loc, rootDir) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return [`${loc} must be an object`];
  }
  for (const field of ["sourceId", "sourceAnchor", "sourceLabel"]) {
    if (!source[field]) errors.push(`${loc}.${field} is required`);
  }
  if (source.sourceId && source.sourceId.startsWith("temp/")) {
    errors.push(`${loc}.sourceId must not point at temp/: ${source.sourceId}`);
  }
  if (rootDir && source.sourceId && !source.sourceId.includes("#")) {
    const sourcePath = path.join(rootDir, source.sourceId);
    if (!fs.existsSync(sourcePath)) errors.push(`${loc}.sourceId does not exist: ${source.sourceId}`);
  }
  return errors;
}

function validateUsageEvidence(usageEvidence, loc, rootDir) {
  const errors = [];
  if (!usageEvidence || typeof usageEvidence !== "object" || Array.isArray(usageEvidence)) {
    return [`${loc} must be an object`];
  }
  if (!Array.isArray(usageEvidence.sourceList) || usageEvidence.sourceList.length === 0) {
    errors.push(`${loc}.sourceList must be a non-empty array`);
  } else {
    usageEvidence.sourceList.forEach((source, index) => {
      errors.push(...validateReviewSource(source, `${loc}.sourceList[${index}]`, rootDir));
    });
  }
  const rowUsage = usageEvidence.rowUsage;
  if (!rowUsage || typeof rowUsage !== "object" || Array.isArray(rowUsage)) {
    errors.push(`${loc}.rowUsage must be an object`);
  } else {
    if (!Number.isInteger(rowUsage.currentCount) || rowUsage.currentCount < 0) {
      errors.push(`${loc}.rowUsage.currentCount must be a non-negative integer`);
    }
    if (!Array.isArray(rowUsage.examples)) {
      errors.push(`${loc}.rowUsage.examples must be an array`);
    } else {
      if (Number.isInteger(rowUsage.currentCount) && rowUsage.examples.length > rowUsage.currentCount) {
        errors.push(`${loc}.rowUsage.examples cannot exceed currentCount`);
      }
      rowUsage.examples.forEach((example, index) => {
        for (const field of ["poolId", "uid", "standardPv", "sourceId", "sourceAnchor"]) {
          if (!example[field]) errors.push(`${loc}.rowUsage.examples[${index}].${field} is required`);
        }
      });
    }
  }
  return errors;
}

function collectRowUsage(rootDir) {
  const usage = new Map();
  const poolRoot = path.join(rootDir, "database_pool");
  if (!fs.existsSync(poolRoot)) return usage;
  for (const rowsFile of listRowsFiles(poolRoot)) {
    const data = JSON.parse(fs.readFileSync(rowsFile, "utf8").replace(/^\uFEFF/, ""));
    for (const row of data.rows || []) {
      if (!EVIDENCE_REVIEW_STATUSES.has(row.reviewStatus)) continue;
      for (const [field, kind] of Object.entries(COMPONENT_KIND_BY_FIELD)) {
        const code = row[field];
        if (!code) continue;
        const key = `${kind}:${code}`;
        if (!usage.has(key)) usage.set(key, []);
        usage.get(key).push({
          poolId: row.poolId || data.poolId || "",
          uid: row.uid || "",
          standardPv: row.standardPv || "",
          sourceId: row.sourceId || data.sourceId || "",
          sourceAnchor: row.sourceAnchor || "",
        });
      }
    }
  }
  return usage;
}

function listRowsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path.basename(full) === "abbreviations") continue;
      files.push(...listRowsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".rows.json")) {
      files.push(full);
    }
  }
  return files.sort();
}

function validateRegistryUsageEvidence(registry, rootDir) {
  const errors = [];
  const usage = collectRowUsage(rootDir);
  for (const [index, entry] of (registry.entries || []).entries()) {
    const key = `${entry.kind}:${entry.code}`;
    const actual = usage.get(key) || [];
    const rowUsage = entry.usageEvidence && entry.usageEvidence.rowUsage;
    if (!rowUsage) continue;
    if (rowUsage.currentCount !== actual.length) {
      errors.push(`entries[${index}].usageEvidence.rowUsage.currentCount for ${key} must be ${actual.length}, found ${rowUsage.currentCount}`);
    }
    const actualKeys = new Set(actual.map((item) => `${item.poolId}\0${item.uid}`));
    for (const [exampleIndex, example] of (rowUsage.examples || []).entries()) {
      if (!actualKeys.has(`${example.poolId}\0${example.uid}`)) {
        errors.push(`entries[${index}].usageEvidence.rowUsage.examples[${exampleIndex}] does not match current row usage for ${key}: ${example.poolId}/${example.uid}`);
      }
    }
  }
  return errors;
}

function evaluateRowAbbreviations(row, registry) {
  return deriveAbbreviationIssues(row, registry, { includeApproved: true });
}

function deriveAbbreviationIssues(row, registry, options = {}) {
  const includeApproved = Boolean(options.includeApproved);
  const entries = Array.isArray(registry.entries) ? registry.entries : [];
  const index = buildRegistryIndex(entries);
  const issues = [];

  for (const [field, kind] of Object.entries(COMPONENT_KIND_BY_FIELD)) {
    const code = stringValue(row[field]);
    if (!code) {
      issues.push(buildMissingComponentIssue(row, field, kind));
      continue;
    }

    const evidence = componentEvidenceFor(row, field);
    const sourceTerms = sourceTermsForEvidence(evidence);
    const sourceTerm = preferredSourceTerm(sourceTerms, field);
    const conflictTerms = conflictSourceTerms(sourceTerms, field);
    const exactEntry = findEntry(index, kind, code);
    const patternCandidateCodes = patternCandidatesForEvidence(evidence);
    const patternEntries = findPatternEntries(entries, kind, code, "global", patternCandidateCodes);

    if (!STRUCTURAL_CODE_FIELDS.has(field) && conflictTerms.length > 1 && (exactEntry || patternEntries.length > 0)) {
      issues.push(buildConflictIssue(row, field, kind, code, registryPatternAndSourceMeanings(exactEntry, patternEntries, conflictTerms)));
      continue;
    }

    if (exactEntry && !exactMeaningMatches(field, exactEntry, sourceTerm)) {
      issues.push(buildConflictIssue(row, field, kind, code, registryAndSourceMeanings(exactEntry, conflictTerms, sourceTerm)));
      continue;
    }

    const exactApproved = exactEntry && exactEntry.status === "approved";
    const matchingPatternEntry = patternEntries.find((entry) => patternMeaningMatches(entry, sourceTerm));
    const approvedPattern = matchingPatternEntry && matchingPatternEntry.status === "approved"
      ? matchingPatternEntry
      : null;

    if (exactApproved) {
      if (includeApproved) {
        issues.push(buildExactIssue(row, field, kind, code, exactEntry.status, sourceTerm, exactEntry));
      }
      continue;
    }

    if (approvedPattern) {
      if (includeApproved) {
        issues.push(buildPatternIssue(row, field, kind, code, approvedPattern, "approved", sourceTerm));
      }
      continue;
    }

    if (patternCandidateCodes.length > 0 && patternEntries.length > 0) {
      if (!matchingPatternEntry) {
        issues.push(buildConflictIssue(row, field, kind, code, patternAndSourceMeanings(patternEntries, sourceTerm)));
        continue;
      }
      const entry = matchingPatternEntry;
      issues.push(buildPatternIssue(row, field, kind, code, entry, entry.status, sourceTerm));
      continue;
    }

    if (!exactEntry && conflictTerms.length > 1 && !STRUCTURAL_CODE_FIELDS.has(field)) {
      issues.push(buildConflictIssue(row, field, kind, code, conflictTerms));
      continue;
    }

    if (patternCandidateCodes.length > 0 && field === "subdevice") {
      issues.push(buildMissingPatternIssue(row, field, kind, code, patternCandidateCodes[0], sourceTerm));
      continue;
    }

    if (!exactEntry) {
      issues.push(buildExactIssue(row, field, kind, code, "missing_registry_entry", sourceTerm, null));
      continue;
    }

    issues.push(buildExactIssue(row, field, kind, code, exactEntry.status, sourceTerm, exactEntry));
  }

  return issues.filter((issue) => includeApproved || issue.blocking);
}

function blockingAbbreviationIssues(row, registry) {
  return deriveAbbreviationIssues(row, registry).filter((issue) => issue.blocking);
}

function buildMissingComponentIssue(row, field, kind) {
  return {
    issueType: "abbreviation",
    field,
    kind,
    code: null,
    status: "missing_component",
    blocking: true,
    approved: false,
    reason: "missing_component",
    resolutionMode: "missing_component",
    resolutionKey: `abbreviation-missing-component:${row.poolId || ""}:${row.uid || ""}:${field}`,
    sourceAnchor: row.sourceAnchor || (row.sourceTrace && row.sourceTrace.sourceAnchor) || "",
  };
}

function buildExactIssue(row, field, kind, code, status, sourceTerm, entry) {
  const approved = status === "approved";
  const resolutionMode = shouldUseMeaningKey(field, sourceTerm) ? "meaning" : "exact";
  const issue = {
    issueType: "abbreviation",
    field,
    kind,
    code,
    status,
    blocking: !approved,
    approved,
    reason: approved ? null : issueReasonForStatus(status),
    resolutionMode,
    resolutionKey: resolutionMode === "meaning"
      ? `abbreviation:global:${kind}:${code}:${sourceTerm}`
      : `abbreviation:global:${kind}:${code}`,
    sourceAnchor: row.sourceAnchor || (row.sourceTrace && row.sourceTrace.sourceAnchor) || "",
  };
  if (sourceTerm) issue.sourceTerm = sourceTerm;
  if (entry) issue.entry = entry;
  return issue;
}

function buildPatternIssue(row, field, kind, code, entry, status, sourceTerm) {
  const approved = status === "approved";
  const meaning = normalizePatternMeaning(entry.meaning || sourceTerm || code);
  const issue = {
    issueType: "abbreviation",
    field,
    kind,
    code,
    status,
    blocking: !approved,
    approved,
    reason: approved ? null : issueReasonForStatus(status),
    resolutionMode: "pattern",
    resolutionKey: `abbreviation-pattern:global:${kind}:${entry.codePattern}:${meaning}`,
    matchedPattern: entry.codePattern,
    sourceAnchor: row.sourceAnchor || (row.sourceTrace && row.sourceTrace.sourceAnchor) || "",
    entry,
  };
  if (sourceTerm) issue.sourceTerm = sourceTerm;
  return issue;
}

function buildMissingPatternIssue(row, field, kind, code, codePattern, sourceTerm) {
  const meaning = normalizePatternMeaning(sourceTerm || codePattern);
  const issue = {
    issueType: "abbreviation",
    field,
    kind,
    code,
    status: "missing_registry_entry",
    blocking: true,
    approved: false,
    reason: "missing_registry_entry",
    resolutionMode: "pattern",
    resolutionKey: `abbreviation-pattern:global:${kind}:${codePattern}:${meaning}`,
    matchedPattern: codePattern,
    sourceAnchor: row.sourceAnchor || (row.sourceTrace && row.sourceTrace.sourceAnchor) || "",
  };
  if (sourceTerm) issue.sourceTerm = sourceTerm;
  return issue;
}

function buildConflictIssue(row, field, kind, code, sourceTerms) {
  return {
    issueType: "abbreviation",
    field,
    kind,
    code,
    status: "meaning_conflict",
    blocking: true,
    approved: false,
    reason: "meaning_conflict",
    resolutionMode: "conflict",
    resolutionKey: `abbreviation-conflict:global:${kind}:${code}`,
    candidateMeanings: sourceTerms,
    sourceAnchor: row.sourceAnchor || (row.sourceTrace && row.sourceTrace.sourceAnchor) || "",
  };
}

function issueReasonForStatus(status) {
  if (status === "missing_registry_entry") return "missing_registry_entry";
  if (status === "missing_component") return "missing_component";
  if (status === "meaning_conflict") return "meaning_conflict";
  return `registry_status_${status}`;
}

function componentEvidenceFor(row, field) {
  const evidence = row.metadata && row.metadata.componentEvidence;
  return evidence && evidence[field] ? evidence[field] : null;
}

function sourceTermsForEvidence(evidence) {
  if (!evidence || !Array.isArray(evidence.exactCodeCandidates)) return [];
  const terms = [];
  for (const candidate of evidence.exactCodeCandidates) {
    for (const term of candidate.sourceTerms || []) {
      const normalized = normalizeSourceTerm(term);
      if (normalized) terms.push(normalized);
    }
  }
  return uniqueStrings(terms);
}

function preferredSourceTerm(sourceTerms, field) {
  if (!sourceTerms.length) return "";
  if (STRUCTURAL_CODE_FIELDS.has(field)) return sourceTerms[0];
  return sourceTerms[0];
}

function conflictSourceTerms(sourceTerms, field) {
  if (STRUCTURAL_CODE_FIELDS.has(field)) return [];
  return uniqueStrings(sourceTerms.map((term) => normalizeConflictTerm(term)).filter(Boolean));
}

function shouldUseMeaningKey(field, sourceTerm) {
  return Boolean(sourceTerm) && !STRUCTURAL_CODE_FIELDS.has(field);
}

function exactMeaningMatches(field, entry, sourceTerm) {
  if (!shouldUseMeaningKey(field, sourceTerm)) return true;
  const entryMeaning = normalizeConflictTerm(entry && entry.meaning);
  const rowMeaning = normalizeConflictTerm(sourceTerm);
  if (!entryMeaning || !rowMeaning) return true;
  return entryMeaning === rowMeaning;
}

function patternMeaningMatches(entry, sourceTerm) {
  const entryMeaning = normalizePatternMeaning(entry && entry.meaning);
  const rowMeaning = normalizePatternMeaning(sourceTerm);
  if (!entryMeaning || !rowMeaning) return true;
  return entryMeaning === rowMeaning;
}

function registryAndSourceMeanings(entry, sourceTerms, sourceTerm) {
  return uniqueStrings([
    normalizeConflictTerm(entry && entry.meaning),
    ...sourceTerms,
    normalizeConflictTerm(sourceTerm),
  ]);
}

function patternAndSourceMeanings(entries, sourceTerm) {
  return uniqueStrings([
    ...(entries || []).map((entry) => normalizePatternMeaning(entry.meaning)),
    normalizePatternMeaning(sourceTerm),
  ]);
}

function registryPatternAndSourceMeanings(entry, patternEntries, sourceTerms) {
  return uniqueStrings([
    normalizeConflictTerm(entry && entry.meaning),
    ...(patternEntries || []).map((patternEntry) => normalizePatternMeaning(patternEntry.meaning)),
    ...sourceTerms,
  ]);
}

function patternCandidatesForEvidence(evidence) {
  if (!evidence) return [];
  const patterns = [];
  if (Array.isArray(evidence.patternCandidates)) patterns.push(...evidence.patternCandidates);
  for (const candidate of evidence.exactCodeCandidates || []) {
    if (Array.isArray(candidate.patternCandidates)) patterns.push(...candidate.patternCandidates);
  }
  return uniqueStrings(patterns.filter(Boolean));
}

function normalizeSourceTerm(term) {
  const text = stringValue(term).replace(/\s+/g, " ");
  if (!text) return "";
  if (/^vocabulary gap:/i.test(text)) return "";
  return text;
}

function normalizeConflictTerm(term) {
  const text = normalizeSourceTerm(term);
  if (!text) return "";
  return text.replace(/\binstance 0+(\d+)\b/g, "instance $1");
}

function normalizePatternMeaning(term) {
  const text = normalizeConflictTerm(term);
  if (!text) return "";
  return text.replace(/\binstance \d+\b/g, "instance");
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null).map(String).filter(Boolean))];
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function groupAbbreviationIssues(rows, registry, options = {}) {
  const exampleLimit = Number.isInteger(options.exampleLimit) ? options.exampleLimit : 5;
  const groups = new Map();
  for (const row of rows || []) {
    const issues = blockingAbbreviationIssues(row, registry);
    for (const issue of issues) {
      const key = issue.resolutionKey;
      if (!groups.has(key)) {
        groups.set(key, {
          resolutionKey: key,
          field: issue.field,
          kind: issue.kind,
          code: issue.code,
          sourceTerm: issue.sourceTerm || "",
          resolutionMode: issue.resolutionMode || "",
          status: issue.status,
          blocking: issue.blocking !== false,
          rowCount: 0,
          poolIds: [],
          statuses: [],
          candidateMeanings: issue.candidateMeanings || [],
          matchedPattern: issue.matchedPattern || "",
          examples: [],
        });
      }
      const group = groups.get(key);
      group.rowCount += 1;
      if (!group.poolIds.includes(row.poolId || "")) group.poolIds.push(row.poolId || "");
      if (!group.statuses.includes(issue.status)) group.statuses.push(issue.status);
      if (issue.candidateMeanings) {
        group.candidateMeanings = uniqueStrings([...group.candidateMeanings, ...issue.candidateMeanings]).sort();
      }
      if (group.examples.length < exampleLimit) {
        group.examples.push({
          poolId: row.poolId || "",
          uid: row.uid || "",
          standardPv: row.standardPv || "",
          sourceId: row.sourceId || (row.sourceTrace && row.sourceTrace.sourceId) || "",
          sourceAnchor: row.sourceAnchor || (row.sourceTrace && row.sourceTrace.sourceAnchor) || "",
        });
      }
    }
  }
  return [...groups.values()].sort((a, b) => b.rowCount - a.rowCount || a.resolutionKey.localeCompare(b.resolutionKey));
}

function canUseWithoutAbbreviationReview(row, registry) {
  return blockingAbbreviationIssues(row, registry).length === 0;
}

function updateRegistryEntry(entries, kind, code, patch, scope = "global") {
  return entries.map((entry) =>
    entry.scope === scope && entry.kind === kind && entry.code === code
      ? { ...entry, ...patch }
      : entry,
  );
}

module.exports = {
  COMPONENT_KIND_BY_FIELD,
  PRIMARY_REGISTRY_REL_PATH,
  REGISTRY_KINDS,
  REGISTRY_STATUSES,
  REVIEW_REGISTRY_SCHEMA_VERSION,
  blockingAbbreviationIssues,
  buildRegistryIndex,
  canUseWithoutAbbreviationReview,
  collectRowUsage,
  deriveAbbreviationIssues,
  evaluateRowAbbreviations,
  groupAbbreviationIssues,
  loadDefaultRegistry,
  loadRegistry,
  normalizePatternMeaning,
  normalizeSourceTerm,
  patternMatches,
  resolveRegistryPath,
  updateRegistryEntry,
  validateRegistry,
  validateRegistryUsageEvidence,
};
