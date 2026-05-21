#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  rel,
  posixRel,
  listFiles,
  loadRegistry,
  loadRawExtraction,
  loadOutputStatus,
  loadExceptionFrontmatters,
  parseReferencePvs,
  schemaConstraints,
  validateSourceTrace,
} = require("./lib/pv_workbench");

const beamline = process.argv[2];
if (!beamline) {
  console.error("Usage: node scripts/validate_registry.js <beamline>");
  process.exit(2);
}

let constraints;
try {
  constraints = schemaConstraints();
} catch (err) {
  console.error(`FAIL: cannot load schemas/pv_registry.seo_v2.yaml: ${err.message}`);
  process.exit(1);
}
const errors = [];
const warnings = [];

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function requireFile(file) {
  if (!fs.existsSync(file)) {
    error(`missing ${posixRel(file)}`);
    return false;
  }
  return true;
}

function sorted(values) {
  return [...values].sort();
}

const outputDir = rel("outputs", beamline);
const registryPath = rel("outputs", beamline, "pv_registry.yaml");
const referencePath = rel("outputs", beamline, "PV_REFERENCE.md");
const rawPath = rel("outputs", beamline, "_work", "raw_extracted_pvs.yaml");
requireFile(outputDir);
const registryExists = requireFile(registryPath);
const referenceExists = requireFile(referencePath);
requireFile(rawPath);

let registry = null;
let raw = null;
let status = null;
if (registryExists) {
  try {
    registry = loadRegistry(beamline).data;
  } catch (err) {
    error(`cannot parse outputs/${beamline}/pv_registry.yaml: ${err.message}`);
  }
}
try {
  raw = loadRawExtraction(beamline).data;
} catch (err) {
  error(`cannot parse outputs/${beamline}/_work/raw_extracted_pvs.yaml: ${err.message}`);
}
try {
  status = loadOutputStatus(beamline).data;
} catch (err) {
  error(`cannot parse outputs/${beamline}/status.yaml: ${err.message}`);
}

let exceptions = [];
try {
  exceptions = loadExceptionFrontmatters(beamline);
} catch (err) {
  warn(`cannot load exceptions for ${beamline}: ${err.message}`);
}

if (registry) validateRegistry(registry);
if (raw) validateRawExtraction(raw);
validateExceptionFrontmatters(exceptions);
if (registry && raw) validateCoverage(registry, raw, exceptions);
if (registry && referenceExists) validateReference(registry);
if (registry) validateOutputStatus(registry, status, exceptions);

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const failure of errors) console.error(`FAIL: ${failure}`);

if (errors.length > 0) {
  console.error(
    `Registry validation failed for ${beamline}: ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  process.exit(1);
}

console.log(
  `Registry validation passed for ${beamline}: ${(registry.pvs || []).length} PVs, ${warnings.length} warning(s).`,
);

function validateRegistry(data) {
  if (data.rulebook_version !== "SEO_v2") {
    error(`registry rulebook_version must be SEO_v2, found ${data.rulebook_version}`);
  }
  if (!/^BL-[0-9]{2}[A-Z]$/.test(String(data.beamline || ""))) {
    error(`registry beamline must match BL-[0-9]{2}[A-Z], found ${data.beamline}`);
  }
  if (!Array.isArray(data.pvs)) {
    error("registry pvs must be a list");
    return;
  }

  const pvCounts = new Map();
  const rawCounts = new Map();
  data.pvs.forEach((entry, index) => {
    const loc = `pvs[${index}]`;
    for (const field of [
      "rulebook_version",
      "source_trace",
      "section",
      "port",
      "area",
      "device",
      "subdevice",
      "signal",
      "pv",
      "status",
      "notes",
    ]) {
      if (entry[field] === undefined || entry[field] === null) {
        error(`${loc} missing required field ${field}`);
      }
    }
    if (entry.rulebook_version !== "SEO_v2") {
      error(`${loc} rulebook_version must be SEO_v2`);
    }
    if (entry.section !== "BL") error(`${loc} section must be BL`);
    if (!constraints.portRegex.test(String(entry.port || ""))) {
      error(`${loc} port does not match schema regex: ${entry.port}`);
    }
    if (!constraints.areaValues.has(entry.area)) error(`${loc} unknown area: ${entry.area}`);
    if (!constraints.deviceValues.has(entry.device)) {
      error(`${loc} unknown device: ${entry.device}`);
    }
    if (!constraints.subdeviceValues.has(entry.subdevice)) {
      error(`${loc} unknown subdevice: ${entry.subdevice}`);
    }
    if (!constraints.signalRegex.test(String(entry.signal || ""))) {
      error(`${loc} invalid signal: ${entry.signal}`);
    }
    if (!constraints.statusValues.has(entry.status)) {
      error(`${loc} invalid status: ${entry.status}`);
    }
    if (!Array.isArray(entry.notes)) error(`${loc} notes must be a list`);

    const expectedPv = `${entry.section}-${entry.port}:${entry.area}-${entry.device}-${entry.subdevice}:${entry.signal}`;
    if (entry.pv !== expectedPv) {
      error(`${loc} pv reconstruction mismatch: expected ${expectedPv}, found ${entry.pv}`);
    }
    if (!constraints.pvRegex.test(String(entry.pv || ""))) {
      error(`${loc} pv does not match SEO_v2 regex: ${entry.pv}`);
    }

    pvCounts.set(entry.pv, (pvCounts.get(entry.pv) || 0) + 1);

    const trace = entry.source_trace || {};
    if (!trace.raw_id) error(`${loc} missing source_trace.raw_id`);
    else rawCounts.set(trace.raw_id, (rawCounts.get(trace.raw_id) || 0) + 1);
    const { errors: traceErrors } = validateSourceTrace(trace, loc);
    for (const e of traceErrors) error(e);
  });

  for (const [pv, count] of pvCounts.entries()) {
    if (count > 1) error(`duplicate registry pv ${pv} appears ${count} times`);
  }
  for (const [rawId, count] of rawCounts.entries()) {
    if (count > 1) error(`registry raw_id ${rawId} appears ${count} times`);
  }
}

function validateRawExtraction(data) {
  if (data.rulebook_version !== "SEO_v2") {
    error(`raw extraction rulebook_version must be SEO_v2, found ${data.rulebook_version}`);
  }
  if (registry && data.beamline !== registry.beamline) {
    error(`raw extraction beamline ${data.beamline} does not match registry ${registry.beamline}`);
  }
  if (!Array.isArray(data.extracted_from)) error("raw extracted_from must be a list");
  if (!Array.isArray(data.entries)) {
    error("raw entries must be a list");
    return;
  }

  let sourceFiles = null;
  const inputDir = rel("inputs", beamline);
  if (fs.existsSync(inputDir)) {
    sourceFiles = new Set(listFiles(inputDir).map(posixRel));
    const extractedSources = new Set((data.extracted_from || []).map((entry) => entry.source_id));
    for (const source of sourceFiles) {
      if (!extractedSources.has(source)) {
        error(`source file missing from raw extracted_from: ${source}`);
      }
    }
  }

  for (const source of data.extracted_from || []) {
    if (!source.source_id) error("extracted_from entry missing source_id");
    if (!source.source_type) error(`${source.source_id || "unknown source"} missing source_type`);
    if (!["included", "excluded"].includes(source.source_state)) {
      error(`${source.source_id || "unknown source"} invalid source_state`);
    }
    if (source.source_state === "included" && typeof source.pv_like_entries !== "number") {
      error(`${source.source_id} included source missing numeric pv_like_entries`);
    }
    if (source.source_state === "excluded" && !source.exclude_reason) {
      error(`${source.source_id} excluded source missing exclude_reason`);
    }
    if (source.source_id && sourceFiles && !sourceFiles.has(source.source_id)) {
      error(`extracted_from source_id not found in inputs/${beamline}/: ${source.source_id}`);
    }
  }

  const rawIds = new Set();
  data.entries.forEach((entry, index) => {
    const loc = `raw entries[${index}]`;
    if (!/^RAW-[0-9]{4}$/.test(String(entry.raw_id || ""))) {
      error(`${loc} invalid raw_id: ${entry.raw_id}`);
    }
    if (rawIds.has(entry.raw_id)) error(`duplicate raw_id in raw extraction: ${entry.raw_id}`);
    rawIds.add(entry.raw_id);
    if (!constraints.rawStatusValues.has(entry.status)) {
      error(`${loc} invalid status: ${entry.status}`);
    }
    if (entry.status === "skipped" && !entry.skip_reason) {
      error(`${loc} skipped entry missing skip_reason`);
    }
    const { errors: traceErrors } = validateSourceTrace(entry.source_trace, loc);
    for (const e of traceErrors) error(e);
  });
}

function validateExceptionFrontmatters(exceptionFiles) {
  for (const exception of exceptionFiles) {
    const loc = posixRel(exception.path);
    if (!exception.data) {
      warn(`exception has no YAML frontmatter: ${loc}`);
      continue;
    }
    const data = exception.data;
    const filename = path.basename(exception.path, ".md");
    for (const field of ["id", "beamline", "status", "source", "raw_ids"]) {
      if (data[field] === undefined || data[field] === null) {
        error(`exception ${loc} missing required field: ${field}`);
      }
    }
    if (data.id && !filename.startsWith(data.id)) {
      error(`exception ${loc} id "${data.id}" does not match filename prefix`);
    }
    if (data.beamline && data.beamline !== beamline) {
      error(`exception ${loc} beamline "${data.beamline}" does not match validated beamline "${beamline}"`);
    }
    if (data.status && !["open", "closed", "promoted"].includes(data.status)) {
      error(`exception ${loc} invalid status: ${data.status}`);
    }
    if (data.raw_ids !== undefined && data.raw_ids !== null && !Array.isArray(data.raw_ids)) {
      error(`exception ${loc} raw_ids must be a list`);
    }
    if (Array.isArray(data.raw_ids)) {
      for (const rawId of data.raw_ids) {
        if (!/^RAW-[0-9]{4}$/.test(String(rawId || ""))) {
          warn(`exception ${loc} raw_id has unexpected format: ${rawId}`);
        }
      }
    }
  }
}

function validateCoverage(registryData, rawData, exceptionFiles) {
  const rawIds = new Set(rawData.entries.map((entry) => entry.raw_id));
  const registryRawIds = new Set();
  const registryStatuses = new Map();
  for (const entry of registryData.pvs || []) {
    const rawId = entry.source_trace && entry.source_trace.raw_id;
    if (!rawId) continue;
    registryRawIds.add(rawId);
    registryStatuses.set(rawId, entry.status);
    if (!rawIds.has(rawId)) error(`registry raw_id does not resolve: ${rawId}`);
  }

  const exceptionRawIds = new Set();
  for (const exception of exceptionFiles) {
    if (!exception.data) continue;
    for (const rawId of exception.data.raw_ids || []) {
      exceptionRawIds.add(rawId);
      if (!rawIds.has(rawId)) {
        error(`exception ${posixRel(exception.path)} raw_id does not resolve: ${rawId}`);
      }
      if (registryRawIds.has(rawId)) {
        const status = registryStatuses.get(rawId);
        if (!["decision_required", "exception"].includes(status)) {
          error(
            `raw_id ${rawId} appears in registry and exception but registry status is ${status}`,
          );
        }
      }
    }
  }

  const skippedRawIds = new Set(
    rawData.entries.filter((entry) => entry.status === "skipped").map((entry) => entry.raw_id),
  );
  const coverage = new Set([...registryRawIds, ...exceptionRawIds, ...skippedRawIds]);

  for (const rawId of rawIds) {
    if (!coverage.has(rawId)) error(`raw_id unaccounted for by coverage equation: ${rawId}`);
  }
  for (const rawId of coverage) {
    if (!rawIds.has(rawId)) error(`coverage references missing raw_id: ${rawId}`);
  }

  console.log(
    `coverage ${coverage.size}/${rawIds.size}: registry=${registryRawIds.size}, exceptions=${exceptionRawIds.size}, skipped=${skippedRawIds.size}`,
  );
}

function validateReference(registryData) {
  const markdown = fs.readFileSync(referencePath, "utf8");
  if (!markdown.includes("Generated from pv_registry.yaml. Do not hand-edit this file directly.")) {
    error("PV_REFERENCE.md missing generated/do-not-edit banner");
  }
  const referencePvs = parseReferencePvs(markdown);
  const registryPvs = (registryData.pvs || []).map((entry) => entry.pv);
  const referenceSet = new Set(referencePvs);
  const registrySet = new Set(registryPvs);
  for (const pv of registrySet) {
    if (!referenceSet.has(pv)) error(`PV_REFERENCE.md omits registry PV: ${pv}`);
  }
  for (const pv of referenceSet) {
    if (!registrySet.has(pv)) error(`PV_REFERENCE.md includes stale PV: ${pv}`);
  }
  if (referencePvs.length !== registryPvs.length) {
    error(
      `PV_REFERENCE.md PV count ${referencePvs.length} does not match registry ${registryPvs.length}`,
    );
  }
}

function validateOutputStatus(registryData, statusData, exceptionFiles) {
  if (!statusData) {
    warn(`outputs/${beamline}/status.yaml missing; add one to make active/legacy state machine-readable`);
    return;
  }
  if (statusData.rulebook_version !== "SEO_v2") {
    error(`status.yaml rulebook_version must be SEO_v2, found ${statusData.rulebook_version}`);
  }
  if (statusData.beamline !== registryData.beamline) {
    error(`status.yaml beamline ${statusData.beamline} does not match registry ${registryData.beamline}`);
  }
  if (!constraints.outputStatusValues.has(statusData.output_status)) {
    error(`status.yaml invalid output_status: ${statusData.output_status}`);
  }
  if (statusData.canonical_registry !== `outputs/${beamline}/pv_registry.yaml`) {
    error("status.yaml canonical_registry does not point to this registry");
  }
  if (statusData.reference !== `outputs/${beamline}/PV_REFERENCE.md`) {
    error("status.yaml reference does not point to this reference");
  }
  if (statusData.raw_extraction !== `outputs/${beamline}/_work/raw_extracted_pvs.yaml`) {
    error("status.yaml raw_extraction does not point to this raw extraction");
  }
  const openOnDisk = new Set(
    exceptionFiles
      .filter((ef) => ef.data && ef.data.status === "open")
      .map((ef) => posixRel(ef.path)),
  );
  if (statusData.open_exceptions) {
    if (!Array.isArray(statusData.open_exceptions)) {
      error("status.yaml open_exceptions must be a list when present");
    } else {
      const openInStatus = new Set(statusData.open_exceptions);
      for (const p of openInStatus) {
        if (!openOnDisk.has(p)) {
          if (!fs.existsSync(rel(...p.split("/")))) {
            error(`status.yaml open_exceptions references missing file: ${p}`);
          } else {
            warn(`status.yaml open_exceptions lists ${p} but exception frontmatter status is not "open"`);
          }
        }
      }
      for (const p of openOnDisk) {
        if (!openInStatus.has(p)) {
          error(`exception ${p} has status "open" but is missing from status.yaml open_exceptions`);
        }
      }
    }
  } else if (openOnDisk.size > 0) {
    warn(`status.yaml has no open_exceptions list but ${openOnDisk.size} exception file(s) have status "open"`);
  }
}
