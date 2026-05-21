#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { parseYamlFile } = require("./lib/yaml_subset");

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
  "rules/draft/PV_NAMING_RULEBOOK.md",
  "rules/review/PV_REVIEW_RULEBOOK.md",
  "rules/decisions/2026-05-21_seo_v3_format_update.md",
  "schemas/pv_registry.seo_v3.yaml",
  "schemas/pv_registry.seo_v2.yaml",
  "examples/good/ID10_minimal_registry.yaml",
  "scripts/validate_registry.js",
  "scripts/render_reference.js",
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
const schema = readText("schemas/pv_registry.seo_v3.yaml");
const goodExample = readText("examples/good/ID10_minimal_registry.yaml");
const goodRegistry = parseYamlFile(rel("examples/good/ID10_minimal_registry.yaml"));

for (const [name, text] of [
  ["draft rulebook", draft],
  ["review rulebook", review],
]) {
  if (!text.includes("[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]")) {
    fail(`${name} missing active SEO_V3 abstract shape`);
  } else {
    pass(`${name} declares active SEO_V3 abstract shape`);
  }
  if (!text.includes("BL01A-OH:HHLM-MIRR:Pitch")) {
    fail(`${name} missing active SEO_V3 rendered example`);
  } else {
    pass(`${name} declares active SEO_V3 rendered example`);
  }
  if (/Version:\s*v0\b/.test(text) || /Version:\s*SEO_v2\b/.test(text)) {
    fail(`${name} still declares an old active version`);
  }
}

if (!schema.includes("rulebook_version: SEO_V3")) {
  fail("schema does not declare SEO_V3 expected rulebook_version");
} else {
  pass("schema declares SEO_V3 expected rulebook_version");
}

for (const token of ["device_regex", "subdevice_regex"]) {
  if (!schema.includes(`${token}:`)) {
    fail(`schema missing flexible ${token}`);
  } else {
    pass(`schema declares flexible ${token}`);
  }
}

for (const token of ["device_values:", "subdevice_values:"]) {
  if (schema.includes(token)) {
    fail(`schema still fixes ${token.replace(":", "")}`);
  }
}

if (/^SYS-CTRL-LOGIC$/m.test(draft)) {
  fail("draft rulebook contains SEO_v2-style SYS-CTRL-LOGIC device/subdevice example");
} else {
  pass("draft rulebook keeps SYS in the location tier, not device examples");
}

const pvRegex =
  /^[A-Z]+[0-9]{2}[A-Z]-[A-Z0-9]+:[A-Z][A-Z0-9]*-[A-Z][A-Z0-9]*:[A-Z][A-Za-z0-9]*$/;
const examplePvs = [...goodExample.matchAll(/^\s+pv:\s+(.+)$/gm)].map((m) =>
  m[1].replace(/^["']|["']$/g, ""),
);
if (examplePvs.length === 0) {
  fail("good example has no pv fields");
} else {
  for (const pv of examplePvs) {
    if (!pvRegex.test(pv)) fail(`good example PV does not match SEO_V3 regex: ${pv}`);
  }
  if (failures === 0) pass(`good example PV regex check passed (${examplePvs.length})`);
}

if (!goodRegistry || !Array.isArray(goodRegistry.pvs)) {
  fail("good example registry cannot be parsed or has no pvs list");
} else {
  for (const [index, entry] of goodRegistry.pvs.entries()) {
    const loc = `good example pvs[${index}]`;
    const expectedBeamline = `${entry.section}${entry.port}`;
    const expectedPv = `${entry.section}${entry.port}-${entry.area}:${entry.device}-${entry.subdevice}:${entry.signal}`;
    if (goodRegistry.beamline !== expectedBeamline) {
      fail(`${loc} beamline mismatch: registry ${goodRegistry.beamline}, entry ${expectedBeamline}`);
    }
    if (entry.pv !== expectedPv) {
      fail(`${loc} pv reconstruction mismatch: expected ${expectedPv}, found ${entry.pv}`);
    }
  }
  if (failures === 0) pass("good example beamline and PV reconstruction check passed");
}

if (failures > 0) {
  console.error(`Validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("SEO_V3 rule validation passed.");
