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
};
