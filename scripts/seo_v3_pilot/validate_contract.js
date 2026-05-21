#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  componentSnapshot,
  parseStandardPv,
  renderStandardPv,
  validateSourceRow,
} = require("./seo_v3_contract");

const root = path.resolve(__dirname, "..", "..");
const fixturePath = path.join(root, "fixtures", "seo_v3_pilot", "source_rows.json");

let failures = 0;

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message, error) {
  failures += 1;
  console.error(`FAIL: ${message}`);
  if (error && error.stack) {
    console.error(error.stack);
  } else if (error) {
    console.error(String(error));
  }
}

function test(message, fn) {
  try {
    fn();
    pass(message);
  } catch (error) {
    fail(message, error);
  }
}

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8").replace(/^\uFEFF/, ""));
}

function assertParseFails(pv, expectedFragment) {
  const result = parseStandardPv(pv);
  assert.strictEqual(result.ok, false, `${pv} should fail parsing`);
  assert(
    result.errors.some((error) => error.includes(expectedFragment)),
    `expected parse error containing ${expectedFragment}, got ${result.errors.join("; ")}`,
  );
}

const fixture = loadFixture();
const rows = fixture.rows;

test("fixture has eight Markdown golden examples", () => {
  assert.strictEqual(fixture.canonicalShape, "[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]");
  assert(Array.isArray(rows));
  assert.strictEqual(rows.length, 8);
});

test("all Markdown examples parse and render unchanged", () => {
  for (const row of rows) {
    const parsed = parseStandardPv(row.standardPv);
    assert.strictEqual(parsed.ok, true, `${row.standardPv} should parse`);
    assert.deepStrictEqual(parsed.components, componentSnapshot(row));
    assert.strictEqual(renderStandardPv(parsed.components), row.standardPv);
  }
});

test("fixture source rows pass M1 component/render validation", () => {
  for (const [index, row] of rows.entries()) {
    assert.deepStrictEqual(validateSourceRow(row, `rows[${index}]`), []);
  }
});

test("SEO_v2 rendered shape is rejected", () => {
  assertParseFails("BL-10A:FE-IVU-GIRD:Y", "does not match SEO_V3 grammar");
});

test("future section example parses by grammar", () => {
  const parsed = parseStandardPv("SR05A-FE:IVU-GIRD:Y");
  assert.strictEqual(parsed.ok, true);
  assert.deepStrictEqual(parsed.components, {
    section: "SR",
    port: "05A",
    area: "FE",
    device: "IVU",
    subdevice: "GIRD",
    signal: "Y",
  });
});

test("section/port ambiguity case is rejected", () => {
  assertParseFails("BL110A-FE:IVU-GIRD:Y", "does not match SEO_V3 grammar");
});

test("lowercase signal is rejected", () => {
  assertParseFails("BL10A-OH:MONO-CRYS:theta", "does not match SEO_V3 grammar");
});

test("empty required component fails row validation", () => {
  const row = { ...rows[0], area: "" };
  const errors = validateSourceRow(row, "empty_area_row");
  assert(errors.includes("empty_area_row.area is required"));
});

test("stored standardPv component/render mismatch is rejected", () => {
  const row = { ...rows[2], signal: "ThetaFine" };
  const errors = validateSourceRow(row, "mismatched_row");
  assert(
    errors.some((error) =>
      error.includes(
        "mismatched_row.standardPv mismatch: components render BL10A-OH:MONO-CRYS:ThetaFine",
      ),
    ),
    `expected render mismatch, got ${errors.join("; ")}`,
  );
  assert(
    errors.some((error) =>
      error.includes("mismatched_row.signal mismatch: standardPv has Theta, row has ThetaFine"),
    ),
    `expected signal mismatch, got ${errors.join("; ")}`,
  );
});

if (failures > 0) {
  console.error(`SEO_V3 pilot contract validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("SEO_V3 pilot contract validation passed.");
