#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rel = (file) => path.join(root, file);

let failures = 0;

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function read(file) {
  return fs.readFileSync(rel(file), "utf8").replace(/^\uFEFF/, "");
}

function requireFile(file) {
  if (!fs.existsSync(rel(file))) {
    fail(`missing ${file}`);
    return false;
  }
  pass(`found ${file}`);
  return true;
}

const requiredFiles = [
  "ARCHITECTURE.md",
  "AGENTS.md",
  "README.md",
  "schemas/README.md",
  "schemas/database_pool.seo_v3.yaml",
  "scripts/validate_database_pool.js",
  "scripts/database_pool_pilot/review_workbench.js",
  "scripts/database_pool_pilot/validate_review_workbench.js",
  "database_pool/4GSR_Beamline_PV_Naming_Standard_v1.0/manifest.yaml",
  "database_pool/BL10A/manifest.yaml",
  "inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md",
];

for (const file of requiredFiles) requireFile(file);

if (failures > 0) {
  console.error(`Workflow doc validation failed with ${failures} failure(s).`);
  process.exit(1);
}

const architecture = read("ARCHITECTURE.md");
const agents = read("AGENTS.md");
const readme = read("README.md");
const schemaReadme = read("schemas/README.md");
const dbSchema = read("schemas/database_pool.seo_v3.yaml");

function requireIncludes(label, text, fragment) {
  if (!text.includes(fragment)) fail(`${label} missing ${fragment}`);
  else pass(`${label} includes ${fragment}`);
}

for (const [label, text] of [
  ["ARCHITECTURE.md", architecture],
  ["AGENTS.md", agents],
  ["README.md", readme],
]) {
  requireIncludes(label, text, "[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]");
  requireIncludes(label, text, "node scripts/validate_database_pool.js");
}

requireIncludes("ARCHITECTURE.md", architecture, "database_pool/<pool_id>/manifest.yaml");
requireIncludes("AGENTS.md", agents, "poolId");
requireIncludes("AGENTS.md", agents, "uid");
requireIncludes("README.md", readme, "scripts/database_pool_pilot/review_workbench.js --port 8775");
requireIncludes("schemas/README.md", schemaReadme, "database_pool.seo_v3.yaml");
requireIncludes("schemas/database_pool.seo_v3.yaml", dbSchema, "pending: computed_only");
requireIncludes("schemas/database_pool.seo_v3.yaml", dbSchema, "conflict: computed_only");

if (/row `dataset` field intact/.test(agents)) {
  fail("AGENTS.md still instructs database-pool work to preserve the legacy dataset field");
}

if (/seed decisions/i.test(agents) || /seed row/i.test(agents)) {
  fail("AGENTS.md still exposes seed decision/row wording");
}

if (/test seed/i.test(readme) || /테스트 seed/.test(readme)) {
  fail("README.md still exposes test seed wording");
}

if (failures > 0) {
  console.error(`Workflow doc validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("Workflow doc validation passed.");
