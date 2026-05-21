const fs = require("fs");
const path = require("path");
const { parseYamlFile, parseFrontmatterMarkdown } = require("./yaml_subset");

const root = path.resolve(__dirname, "../..");

function rel(...parts) {
  return path.join(root, ...parts);
}

function posixRel(absPath) {
  return path.relative(root, absPath).split(path.sep).join("/");
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function loadSchema() {
  return parseYamlFile(rel("schemas", "pv_registry.seo_v2.yaml"));
}

function schemaConstraints(schema = loadSchema()) {
  const constraints = schema.registry.pv_entry.field_constraints;
  return {
    areaValues: new Set(constraints.area_values || []),
    deviceValues: new Set(constraints.device_values || []),
    subdeviceValues: new Set(constraints.subdevice_values || []),
    statusValues: new Set(schema.registry.pv_entry.status_values || []),
    rawStatusValues: new Set(schema.raw_extracted_pvs.entry.status_values || []),
    outputStatusValues: new Set(schema.output_status.status_values || []),
    pvRegex: new RegExp(`^${constraints.pv_regex}$`),
    signalRegex: new RegExp(`^${constraints.signal_regex}$`),
    portRegex: new RegExp(`^${constraints.port_regex}$`),
  };
}

function loadRegistry(beamline) {
  const registryPath = rel("outputs", beamline, "pv_registry.yaml");
  return {
    path: registryPath,
    data: parseYamlFile(registryPath),
  };
}

function loadRawExtraction(beamline) {
  const rawPath = rel("outputs", beamline, "_work", "raw_extracted_pvs.yaml");
  if (!fs.existsSync(rawPath)) return { path: rawPath, data: null };
  return {
    path: rawPath,
    data: parseYamlFile(rawPath),
  };
}

function loadOutputStatus(beamline) {
  const statusPath = rel("outputs", beamline, "status.yaml");
  if (!fs.existsSync(statusPath)) return { path: statusPath, data: null };
  return {
    path: statusPath,
    data: parseYamlFile(statusPath),
  };
}

function loadExceptionFrontmatters(beamline) {
  const dir = rel("exceptions", beamline);
  return listFiles(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({
      path: file,
      data: parseFrontmatterMarkdown(fs.readFileSync(file, "utf8")),
    }));
}

function renderReference(registry) {
  const pvs = registry.pvs || [];
  const lines = [
    `# ${registry.beamline.replace(/^BL-/, "")} PV Reference`,
    "",
    "Generated from pv_registry.yaml. Do not hand-edit this file directly.",
    "",
    "This reference reflects the active SEO_v2 / 4GSR standard v1.0 registry. Legacy source PVs are preserved in `source_pv` and source trace metadata in `pv_registry.yaml`.",
    "",
    "| PV Name | Port | Area | Device | Subdevice | Signal | Status | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const entry of pvs) {
    const notes = Array.isArray(entry.notes) ? entry.notes.join("; ") : "";
    lines.push(
      `| \`${entry.pv}\` | \`${entry.port}\` | \`${entry.area}\` | \`${entry.device}\` | \`${entry.subdevice}\` | \`${entry.signal}\` | \`${entry.status}\` | ${notes} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function parseReferencePvs(markdown) {
  const pvs = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|/);
    if (match) pvs.push(match[1]);
  }
  return pvs;
}

const REVIEW_STATUS_ALL = new Set([
  "needs_input",
  "accepted",
  "approved",
  "edited",
  "exception",
  "skipped",
  "proposal",
  "fixed",
]);
const REVIEW_STATUS_COMPLETE = new Set(["accepted", "approved", "edited", "fixed"]);

function validateRawIdFormat(rawId, loc) {
  const errors = [];
  const warnings = [];
  if (rawId === undefined || rawId === null || rawId === "") {
    errors.push(`${loc} missing rawId`);
  } else if (!/^(RAW-[0-9]{4}|SEO-[0-9]{5})$/.test(String(rawId))) {
    warnings.push(`${loc} rawId has unexpected format: ${rawId}`);
  }
  return { errors, warnings };
}

function validateSourceTrace(trace, loc) {
  const errors = [];
  const warnings = [];
  if (!trace || typeof trace !== "object") {
    errors.push(`${loc} source_trace must be an object`);
    return { errors, warnings };
  }
  if (!trace.source_id) errors.push(`${loc} source_trace missing source_id`);
  if (!trace.source_anchor) errors.push(`${loc} source_trace missing source_anchor`);
  return { errors, warnings };
}

function validatePvRow(row, constraints, loc) {
  const errors = [];
  const warnings = [];

  for (const field of ["seq", "rawId", "dataset", "reviewStatus", "section", "standardPv", "note"]) {
    if (row[field] === undefined || row[field] === null) {
      errors.push(`${loc} missing required field: ${field}`);
    }
  }

  if (row.section !== undefined && row.section !== "BL") {
    errors.push(`${loc} section must be BL, found ${row.section}`);
  }

  if (row.reviewStatus !== undefined && row.reviewStatus !== null && !REVIEW_STATUS_ALL.has(row.reviewStatus)) {
    errors.push(`${loc} unknown reviewStatus: ${row.reviewStatus}`);
  }

  const rawResult = validateRawIdFormat(row.rawId, loc);
  errors.push(...rawResult.errors);
  warnings.push(...rawResult.warnings);

  if (REVIEW_STATUS_COMPLETE.has(row.reviewStatus) && !row.orphan) {
    for (const field of ["port", "area", "dev", "subdev", "signal"]) {
      if (!row[field]) errors.push(`${loc} ${field} is empty for ${row.reviewStatus} row`);
    }
    if (row.port && constraints.portRegex && !constraints.portRegex.test(String(row.port))) {
      errors.push(`${loc} port does not match schema regex: ${row.port}`);
    }
    if (row.area && constraints.areaValues && !constraints.areaValues.has(row.area)) {
      errors.push(`${loc} unknown area: ${row.area}`);
    }
    if (row.dev && constraints.deviceValues && !constraints.deviceValues.has(row.dev)) {
      errors.push(`${loc} unknown device: ${row.dev}`);
    }
    if (row.subdev && constraints.subdeviceValues && !constraints.subdeviceValues.has(row.subdev)) {
      errors.push(`${loc} unknown subdevice: ${row.subdev}`);
    }
    if (row.signal && constraints.signalRegex && !constraints.signalRegex.test(String(row.signal))) {
      errors.push(`${loc} invalid signal: ${row.signal}`);
    }
    if (row.section && row.port && row.area && row.dev && row.subdev && row.signal) {
      const expectedPv = `${row.section}-${row.port}:${row.area}-${row.dev}-${row.subdev}:${row.signal}`;
      if (row.standardPv !== undefined && row.standardPv !== "" && row.standardPv !== expectedPv) {
        errors.push(`${loc} standardPv mismatch: expected ${expectedPv}, found ${row.standardPv}`);
      }
    }
    if (row.standardPv && constraints.pvRegex && !constraints.pvRegex.test(String(row.standardPv))) {
      errors.push(`${loc} standardPv does not match SEO_v2 regex: ${row.standardPv}`);
    }
  }

  return { errors, warnings };
}

module.exports = {
  root,
  rel,
  posixRel,
  listFiles,
  loadSchema,
  schemaConstraints,
  loadRegistry,
  loadRawExtraction,
  loadOutputStatus,
  loadExceptionFrontmatters,
  renderReference,
  parseReferencePvs,
  validateRawIdFormat,
  validateSourceTrace,
  validatePvRow,
};
