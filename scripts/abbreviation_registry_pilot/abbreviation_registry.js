const fs = require("fs");

const REGISTRY_KINDS = new Set(["section", "port", "area", "device", "subdevice"]);
const REGISTRY_STATUSES = new Set(["candidate", "approved", "deprecated", "rejected"]);
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

function validateRegistry(registry) {
  const errors = [];
  if (!registry || !Array.isArray(registry.entries)) {
    return ["registry.entries must be an array"];
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
      errors.push(`${loc}.scope must be global for the M3 pilot: ${entry.scope}`);
    }
    const key = registryKey(entry);
    if (seen.has(key)) errors.push(`${loc} duplicate registry key: ${key}`);
    seen.add(key);
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
  REGISTRY_KINDS,
  REGISTRY_STATUSES,
  blockingAbbreviationIssues,
  buildRegistryIndex,
  canUseWithoutAbbreviationReview,
  evaluateRowAbbreviations,
  loadRegistry,
  updateRegistryEntry,
  validateRegistry,
};
