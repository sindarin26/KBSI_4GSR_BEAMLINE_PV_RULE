#!/usr/bin/env node

const fs = require("fs");
const { rel, loadRegistry, renderReference } = require("./lib/pv_workbench");

const beamline = process.argv[2];
const mode = process.argv[3] || "--check";

if (!beamline || !["--check", "--write"].includes(mode)) {
  console.error("Usage: node scripts/render_reference.js <beamline> [--check|--write]");
  process.exit(2);
}

const registryPath = rel("outputs", beamline, "pv_registry.yaml");
if (!fs.existsSync(registryPath)) {
  console.error(`FAIL: missing outputs/${beamline}/pv_registry.yaml`);
  process.exit(1);
}

let registry;
try {
  registry = loadRegistry(beamline).data;
} catch (err) {
  console.error(`FAIL: cannot parse outputs/${beamline}/pv_registry.yaml: ${err.message}`);
  process.exit(1);
}

const referencePath = rel("outputs", beamline, "PV_REFERENCE.md");
let rendered;
try {
  rendered = renderReference(registry);
} catch (err) {
  console.error(`FAIL: cannot render reference for ${beamline}: ${err.message}`);
  process.exit(1);
}

if (mode === "--write") {
  fs.writeFileSync(referencePath, rendered);
  console.log(`Wrote outputs/${beamline}/PV_REFERENCE.md`);
  process.exit(0);
}

const current = fs.existsSync(referencePath) ? fs.readFileSync(referencePath, "utf8") : "";
if (current !== rendered) {
  console.error(`PV_REFERENCE.md is out of date for ${beamline}. Run:`);
  console.error(`node scripts/render_reference.js ${beamline} --write`);
  process.exit(1);
}

console.log(`PV_REFERENCE.md is current for ${beamline}.`);
