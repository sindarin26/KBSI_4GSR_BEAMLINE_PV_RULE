#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  REGISTRY_KINDS,
  blockingAbbreviationIssues,
  canUseWithoutAbbreviationReview,
  loadRegistry,
  updateRegistryEntry,
  validateRegistry,
} = require("./abbreviation_registry");

const root = path.resolve(__dirname, "..", "..");
const registryPath = path.join(root, "fixtures", "seo_v3_pilot", "abbreviation_registry.json");
const sourceRowsPath = path.join(
  root,
  "database_pool",
  "seo_v3_m2_pilot",
  "sources",
  "m2.rows.json",
);

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

const registry = loadRegistry(registryPath);
const sourceRows = JSON.parse(fs.readFileSync(sourceRowsPath, "utf8")).rows;
const byKindCode = new Map(registry.entries.map((entry) => [`${entry.kind}:${entry.code}`, entry]));

function entry(kind, code) {
  return byKindCode.get(`${kind}:${code}`);
}

test("registry schema and uniqueness validation passes", () => {
  assert.deepStrictEqual(validateRegistry(registry), []);
  assert.strictEqual(registry.entries.length, 50);
  assert.deepStrictEqual(new Set([...REGISTRY_KINDS]), new Set([
    "section",
    "port",
    "area",
    "device",
    "subdevice",
  ]));
});

test("section status policy is represented", () => {
  assert.strictEqual(entry("section", "BL").status, "approved");
  assert.strictEqual(entry("section", "SR").status, "candidate");
});

test("Markdown port and area codes are approved", () => {
  for (const code of [
    "01A",
    "01B",
    "02A",
    "02B",
    "03A",
    "03B",
    "04A",
    "04B",
    "05A",
    "05B",
    "06A",
    "06B",
    "07A",
    "07B",
    "08A",
    "08B",
    "09A",
    "09B",
    "10A",
    "10B",
  ]) {
    assert.strictEqual(entry("port", code).status, "approved", code);
  }
  for (const code of ["FE", "PTL", "OH", "EH"]) {
    assert.strictEqual(entry("area", code).status, "approved", code);
  }
});

test("Markdown device and subdevice codes remain candidate", () => {
  for (const registryEntry of registry.entries) {
    if (registryEntry.kind === "device" || registryEntry.kind === "subdevice") {
      assert.strictEqual(registryEntry.status, "candidate", registryEntry.code);
    }
  }
});

test("candidate device and subdevice codes block silent row approval", () => {
  const row = sourceRows.find((item) => item.standardPv === "BL10A-OH:MONO-CRYS:Theta");
  const issues = blockingAbbreviationIssues(row, registry);
  assert.deepStrictEqual(
    issues.map((issue) => `${issue.kind}:${issue.code}:${issue.status}`).sort(),
    ["device:MONO:candidate", "subdevice:CRYS:candidate"],
  );
  assert.strictEqual(canUseWithoutAbbreviationReview(row, registry), false);
});

test("approved section, port, and area do not block row approval", () => {
  const row = sourceRows.find((item) => item.standardPv === "BL10A-OH:MONO-CRYS:Theta");
  const issues = blockingAbbreviationIssues(row, registry);
  assert(!issues.some((issue) => issue.kind === "section"));
  assert(!issues.some((issue) => issue.kind === "port"));
  assert(!issues.some((issue) => issue.kind === "area"));
});

test("HTML/DB-only operational codes are not silently approved before review", () => {
  const row = {
    section: "BL",
    port: "10C",
    area: "SYS",
    device: "CTRL",
    subdevice: "LOGIC",
  };
  const issues = blockingAbbreviationIssues(row, registry);
  assert.deepStrictEqual(
    issues.map((issue) => `${issue.kind}:${issue.code}:${issue.status}`).sort(),
    [
      "area:SYS:missing_registry_entry",
      "device:CTRL:missing_registry_entry",
      "port:10C:missing_registry_entry",
      "subdevice:LOGIC:missing_registry_entry",
    ],
  );
});

test("registry edits are in-memory and do not rewrite source rows", () => {
  const before = fs.readFileSync(sourceRowsPath, "utf8");
  const editedEntries = updateRegistryEntry(registry.entries, "device", "MONO", {
    status: "approved",
  });
  const editedRegistry = { ...registry, entries: editedEntries };
  const row = sourceRows.find((item) => item.standardPv === "BL10A-OH:MONO-CRYS:Theta");
  const issues = blockingAbbreviationIssues(row, editedRegistry);
  const after = fs.readFileSync(sourceRowsPath, "utf8");

  assert.deepStrictEqual(
    issues.map((issue) => `${issue.kind}:${issue.code}:${issue.status}`),
    ["subdevice:CRYS:candidate"],
  );
  assert.strictEqual(after, before);
});

if (failures > 0) {
  console.error(`Abbreviation registry pilot validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("Abbreviation registry pilot validation passed.");
