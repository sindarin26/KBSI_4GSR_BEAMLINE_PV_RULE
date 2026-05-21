#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const rel = (p) => path.join(root, p);

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function readText(file) {
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
  "standards/4GSR_Beamline_PV_Naming_Standard_v1.0.md",
  "inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json",
  "rules/draft/PV_NAMING_RULEBOOK.md",
  "rules/review/PV_REVIEW_RULEBOOK.md",
  "schemas/pv_registry.seo_v2.yaml",
  "schemas/review_decisions.seo_v2.yaml",
  "reviews/SEO_v2/review_decisions.json",
  "reviews/SEO_v2/fixed_decisions.json",
  "reviews/SEO_v2/accepted_decisions.json",
  "examples/good/ID10_minimal_registry.yaml",
  "reviews/SEO_v2/REVIEW.md",
  "exceptions/SEO_v2/EXC-0001-duplicate-standardpv-instance-policy.md",
  "scripts/validate_registry.js",
  "scripts/render_reference.js",
  "scripts/review_server.js",
  "scripts/import_seo_review_decisions.js",
  "scripts/lib/yaml_subset.js",
  "scripts/lib/pv_workbench.js",
];

for (const file of requiredFiles) {
  requireFile(file);
}

if (failures > 0) {
  console.error(`Validation failed with ${failures} failure(s).`);
  process.exit(1);
}

const draft = readText("rules/draft/PV_NAMING_RULEBOOK.md");
const review = readText("rules/review/PV_REVIEW_RULEBOOK.md");
const schema = readText("schemas/pv_registry.seo_v2.yaml");
const goodExample = readText("examples/good/ID10_minimal_registry.yaml");
const reviewDecisionRows = JSON.parse(readText("reviews/SEO_v2/review_decisions.json"));
const fixedDecisionRows = JSON.parse(readText("reviews/SEO_v2/fixed_decisions.json"));
const acceptedDecisionRows = JSON.parse(readText("reviews/SEO_v2/accepted_decisions.json"));

for (const [name, text] of [
  ["draft rulebook", draft],
  ["review rulebook", review],
]) {
  if (!text.includes("BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]")) {
    fail(`${name} missing active SEO_v2 shape`);
  } else {
    pass(`${name} declares active SEO_v2 shape`);
  }
  if (/Version:\s*v0\b/.test(text)) {
    fail(`${name} still declares v0 version`);
  }
}

if (!schema.includes("rulebook_version: SEO_v2")) {
  fail("schema does not declare SEO_v2 expected rulebook_version");
} else {
  pass("schema declares SEO_v2 expected rulebook_version");
}

const pvRegex =
  /^BL-[0-9]{2}[A-Z]:[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+:[A-Z][A-Za-z0-9]*$/;
const examplePvs = [...goodExample.matchAll(/^\s+pv:\s+(.+)$/gm)].map((m) =>
  m[1].replace(/^["']|["']$/g, ""),
);
if (examplePvs.length === 0) {
  fail("good example has no pv fields");
} else {
  for (const pv of examplePvs) {
    if (!pvRegex.test(pv)) fail(`good example PV does not match SEO_v2 regex: ${pv}`);
  }
  if (failures === 0) pass(`good example PV regex check passed (${examplePvs.length})`);
}

const dbPath = "inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json";
const rows = JSON.parse(readText(dbPath));
if (!Array.isArray(rows) || rows.length === 0) {
  fail("SEO_v2 DB is empty or not an array");
} else {
  pass(`SEO_v2 DB rows: ${rows.length}`);
}

const requiredRowFields = ["seq", "port", "area", "dev", "subdev", "signal", "standardPv"];
const renderRegex =
  /^BL-([0-9]{2}[A-Z]):([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+):([A-Z][A-Za-z0-9]*)$/;
const areas = new Set();
const devices = new Set();
const subdevices = new Set();
const standardPvCounts = new Map();
let fieldMismatch = 0;
let regexMismatch = 0;
let missingField = 0;

for (const row of rows) {
  for (const field of requiredRowFields) {
    if (row[field] === undefined || row[field] === null || row[field] === "") {
      missingField += 1;
    }
  }
  areas.add(row.area);
  devices.add(row.dev);
  subdevices.add(row.subdev);
  standardPvCounts.set(row.standardPv, (standardPvCounts.get(row.standardPv) || 0) + 1);
  const match = String(row.standardPv).match(renderRegex);
  if (!match) {
    regexMismatch += 1;
    continue;
  }
  if (
    match[1] !== row.port ||
    match[2] !== row.area ||
    match[3] !== row.dev ||
    match[4] !== row.subdev ||
    match[5] !== row.signal
  ) {
    fieldMismatch += 1;
  }
}

if (missingField) fail(`SEO_v2 DB rows have missing required fields: ${missingField}`);
else pass("SEO_v2 DB required fields present");

if (regexMismatch) fail(`SEO_v2 DB standardPv regex mismatches: ${regexMismatch}`);
else pass("SEO_v2 DB standardPv regex check passed");

if (fieldMismatch) fail(`SEO_v2 DB field/render mismatches: ${fieldMismatch}`);
else pass("SEO_v2 DB field/render consistency passed");

const duplicateGroups = [...standardPvCounts.values()].filter((count) => count > 1).length;
if (duplicateGroups > 0) {
  const exception = readText(
    "exceptions/SEO_v2/EXC-0001-duplicate-standardpv-instance-policy.md",
  );
  if (!exception.includes("duplicate rendered PV names")) {
    fail("duplicate standardPv groups exist but exception record is incomplete");
  } else {
    pass(`duplicate standardPv groups tracked by exception: ${duplicateGroups}`);
  }
}

if (
  !Array.isArray(reviewDecisionRows) ||
  !Array.isArray(fixedDecisionRows) ||
  !Array.isArray(acceptedDecisionRows)
) {
  fail("SEO_v2 decision seed files must be JSON arrays");
} else if (
  reviewDecisionRows.length !== fixedDecisionRows.length ||
  fixedDecisionRows.length !== acceptedDecisionRows.length
) {
  fail(
    `SEO_v2 decision seed files length mismatch: review=${reviewDecisionRows.length}, fixed=${fixedDecisionRows.length}, accepted=${acceptedDecisionRows.length}`,
  );
} else {
  pass(`SEO_v2 decision seed files align (${fixedDecisionRows.length})`);
}

if (!Array.isArray(fixedDecisionRows) || fixedDecisionRows.length === 0) {
  fail("SEO_v2 fixed decision seed is missing rows");
} else {
  for (const [index, row] of fixedDecisionRows.entries()) {
    const loc = `fixed decision seed[${index}]`;
    if (row.dataset !== "SEO_v2") fail(`${loc} dataset must be SEO_v2`);
    if (row.reviewStatus !== "fixed") fail(`${loc} reviewStatus must be fixed`);
    const expectedPv = `${row.section}-${row.port}:${row.area}-${row.dev}-${row.subdev}:${row.signal}`;
    if (row.standardPv !== expectedPv) {
      fail(
        `${loc} standardPv reconstruction mismatch: expected ${expectedPv}, found ${row.standardPv}`,
      );
    }
    if (!pvRegex.test(row.standardPv)) {
      fail(`${loc} standardPv does not match SEO_v2 regex: ${row.standardPv}`);
    }
  }
  if (failures === 0) {
    pass(`SEO_v2 fixed decision seed check passed (${fixedDecisionRows.length})`);
  }
}

console.log(`areas: ${[...areas].sort().join(", ")}`);
console.log(`devices: ${[...devices].sort().join(", ")}`);
console.log(`subdevices: ${[...subdevices].sort().join(", ")}`);

if (failures > 0) {
  console.error(`Validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("SEO_v2 rule validation passed.");
