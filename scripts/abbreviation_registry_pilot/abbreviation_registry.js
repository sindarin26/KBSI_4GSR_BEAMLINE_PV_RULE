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
    for (const field of ["code", "kind", "meaning", "status", "scope", "source"]) {
      if (!entry[field]) errors.push(`${loc}.${field} is required`);
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
  const index = buildRegistryIndex(registry.entries);
  return Object.entries(COMPONENT_KIND_BY_FIELD).map(([field, kind]) => {
    const code = row[field];
    const entry = code ? findEntry(index, kind, code) : null;
    if (!code) {
      return {
        field,
        kind,
        code,
        status: "missing_component",
        approved: false,
        reason: "missing_component",
      };
    }
    if (!entry) {
      return {
        field,
        kind,
        code,
        status: "missing_registry_entry",
        approved: false,
        reason: "missing_registry_entry",
      };
    }
    return {
      field,
      kind,
      code,
      status: entry.status,
      approved: entry.status === "approved",
      reason: entry.status === "approved" ? null : `registry_status_${entry.status}`,
      entry,
    };
  });
}

function blockingAbbreviationIssues(row, registry) {
  return evaluateRowAbbreviations(row, registry).filter((result) => !result.approved);
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
  evaluateRowAbbreviations,
  loadDefaultRegistry,
  loadRegistry,
  resolveRegistryPath,
  updateRegistryEntry,
  validateRegistry,
  validateRegistryUsageEvidence,
};
