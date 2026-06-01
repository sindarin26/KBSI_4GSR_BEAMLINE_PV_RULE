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

function requireExecutable(file) {
  const mode = fs.statSync(rel(file)).mode;
  if ((mode & 0o111) === 0) fail(`${file} is not executable`);
  else pass(`${file} is executable`);
}

const requiredFiles = [
  "ARCHITECTURE.md",
  "AGENTS.md",
  "README.md",
  "rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md",
  "schemas/README.md",
  "schemas/database_pool.seo_v3.yaml",
  "scripts/validate_database_pool.js",
  "scripts/import_database_pool.js",
  "run_database_pool_workbench.sh",
  "check_database_pool.sh",
  "scripts/review_server.js",
  "scripts/review_server_pilot/validate_database_pool_mode.js",
  "scripts/database_pool_pilot/review_workbench.js",
  "scripts/database_pool_pilot/validate_review_workbench.js",
  "database_pool/4GSR_Beamline_PV_Naming_Standard_v1.0/manifest.yaml",
  "database_pool/BL10A/manifest.yaml",
  "inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md",
];

for (const file of requiredFiles) requireFile(file);
requireExecutable("run_database_pool_workbench.sh");
requireExecutable("check_database_pool.sh");

if (failures > 0) {
  console.error(`Workflow doc validation failed with ${failures} failure(s).`);
  process.exit(1);
}

const architecture = read("ARCHITECTURE.md");
const agents = read("AGENTS.md");
const readme = read("README.md");
const inputConversionRulebook = read("rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md");
const scriptsReadme = read("scripts/README.md");
const schemaReadme = read("schemas/README.md");
const dbSchema = read("schemas/database_pool.seo_v3.yaml");
const workbenchWrapper = read("run_database_pool_workbench.sh");
const checkWrapper = read("check_database_pool.sh");
const retiredWorkbenchShim = read("scripts/database_pool_pilot/review_workbench.js");
const retiredWorkbenchValidatorShim = read("scripts/database_pool_pilot/validate_review_workbench.js");

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
requireIncludes("ARCHITECTURE.md", architecture, "rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md");
requireIncludes("AGENTS.md", agents, "poolId");
requireIncludes("AGENTS.md", agents, "uid");
requireIncludes("AGENTS.md", agents, "rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md");
requireIncludes("rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md", inputConversionRulebook, "agent_input_conversion");
requireIncludes("rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md", inputConversionRulebook, "sourceTrace.sourceLine");
requireIncludes("rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md", inputConversionRulebook, "reviewStatus");
requireIncludes("rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md", inputConversionRulebook, "deterministic database-pool identity rule");
requireIncludes("rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md", inputConversionRulebook, "section: BL");
requireIncludes("rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md", inputConversionRulebook, "port: 09A");
requireIncludes("README.md", readme, "scripts/review_server.js --database-pool BL10A --port 8765");
requireIncludes("README.md", readme, "node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A");
requireIncludes("README.md", readme, "./run_database_pool_workbench.sh");
requireIncludes("README.md", readme, "./check_database_pool.sh");
requireIncludes("scripts/README.md", scriptsReadme, "## Database-Pool Workflow");
requireIncludes("scripts/README.md", scriptsReadme, "## Legacy SEO_v2 Workflow");
requireIncludes("run_database_pool_workbench.sh", workbenchWrapper, "http://${HOST}:${PORT}/");
requireIncludes("run_database_pool_workbench.sh", workbenchWrapper, "node scripts/review_server.js");
requireIncludes("run_database_pool_workbench.sh", workbenchWrapper, "--database-pool");
requireIncludes("check_database_pool.sh", checkWrapper, "node scripts/validate_database_pool.js \"$@\"");
requireIncludes("schemas/README.md", schemaReadme, "database_pool.seo_v3.yaml");
requireIncludes("schemas/database_pool.seo_v3.yaml", dbSchema, "pending: computed_only");
requireIncludes("schemas/database_pool.seo_v3.yaml", dbSchema, "conflict: computed_only");
requireIncludes("schemas/database_pool.seo_v3.yaml", dbSchema, "scripts/review_server.js --database-pool <pool_id> --port 8765");
requireIncludes("schemas/database_pool.seo_v3.yaml", dbSchema, "database_pool/<pool_id>/decisions/workbench.decisions.json");
requireIncludes("schemas/database_pool.seo_v3.yaml", dbSchema, "abbreviation_registry: read_only");
requireIncludes("scripts/database_pool_pilot/review_workbench.js", retiredWorkbenchShim, "DEPRECATED");
requireIncludes("scripts/database_pool_pilot/review_workbench.js", retiredWorkbenchShim, "process.exit(1)");
requireIncludes("scripts/database_pool_pilot/validate_review_workbench.js", retiredWorkbenchValidatorShim, "DEPRECATED");
requireIncludes("scripts/database_pool_pilot/validate_review_workbench.js", retiredWorkbenchValidatorShim, "process.exit(1)");

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
