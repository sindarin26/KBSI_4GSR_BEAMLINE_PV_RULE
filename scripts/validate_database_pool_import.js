#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { blockingAbbreviationIssues, loadRegistry } = require("./abbreviation_registry_pilot/abbreviation_registry");
const { stableUid, validatePoolSourceRows } = require("./database_pool_pilot/database_pool");
const { importDatabasePool } = require("./database_pool_pilot/importer");

const root = path.resolve(__dirname, "..");
const registry = loadRegistry(path.join(root, "fixtures", "seo_v3_pilot", "abbreviation_registry.json"));
const cleanup = [];
let failures = 0;

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message, error) {
  failures += 1;
  console.error(`FAIL: ${message}`);
  if (error && error.stack) console.error(error.stack);
  else if (error) console.error(String(error));
}

function test(message, fn) {
  try {
    fn();
    pass(message);
  } catch (error) {
    fail(message, error);
  }
}

function makeTempRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pv-import-"));
  fs.mkdirSync(path.join(dir, "inputs"), { recursive: true });
  fs.mkdirSync(path.join(dir, "database_pool", "BL10A", "sources"), { recursive: true });
  fs.cpSync(path.join(root, "inputs", "BL10A"), path.join(dir, "inputs", "BL10A"), {
    recursive: true,
  });
  fs.copyFileSync(
    path.join(root, "database_pool", "BL10A", "sources", "id10_small_subset.rows.json"),
    path.join(dir, "database_pool", "BL10A", "sources", "id10_small_subset.rows.json"),
  );
  cleanup.push(dir);
  return dir;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

test("import preview scans supported BL10A input files without writing", () => {
  const before = new Set(fs.readdirSync(path.join(root, "database_pool", "BL10A", "sources")));
  const summary = importDatabasePool({
    rootDir: root,
    input: "inputs/BL10A",
    pool: "BL10A",
  });
  const after = new Set(fs.readdirSync(path.join(root, "database_pool", "BL10A", "sources")));
  assert.deepStrictEqual(after, before);
  assert.strictEqual(summary.filesScanned, 7);
  assert.strictEqual(summary.filesSkipped.length, 0);
  assert(summary.rowsExtracted > 0);
  assert(summary.targetFiles.every((file) => file.startsWith("database_pool/BL10A/sources/import_")));
});

test("preview reports duplicate standardPv values as warnings, not errors", () => {
  const summary = importDatabasePool({
    rootDir: root,
    input: "inputs/BL10A",
    pool: "BL10A",
  });
  assert.strictEqual(summary.errors.length, 0);
  assert(summary.warnings.some((warning) => warning.includes("duplicate standardPv")));
});

test("write emits one source rows file per input file and keeps rows needs_input", () => {
  const tmpRoot = makeTempRoot();
  const summary = importDatabasePool({
    rootDir: tmpRoot,
    input: "inputs/BL10A",
    pool: "BL10A",
    write: true,
  });
  assert.strictEqual(summary.errors.length, 0);
  assert.strictEqual(summary.targetFiles.length, 7);
  assert(summary.rowsExtracted > 0);
  assert(summary.warnings.some((warning) => warning.includes("no source PV tokens found")));
  for (const target of summary.targetFiles) {
    assert(fs.existsSync(path.join(tmpRoot, target)), target);
    const data = readJson(path.join(tmpRoot, target));
    assert.strictEqual(data.poolId, "BL10A");
    assert(data.sourceId.startsWith("inputs/BL10A/"));
    assert.deepStrictEqual(validatePoolSourceRows(data.rows), []);
    for (const row of data.rows) {
      assert.strictEqual(row.reviewStatus, "needs_input");
      assert.strictEqual(row.uid, stableUid(row));
      assert.strictEqual(row.rowId, row.standardPv);
      assert.strictEqual(row.sourceTrace.sourceKind, "database_pool_import");
      assert.strictEqual(row.sourceTrace.sourceLabel, row.sourcePv);
      assert.strictEqual(row.sourceTrace.sourceId, row.sourceId);
      assert.strictEqual(row.sourceTrace.sourceAnchor, row.sourceAnchor);
      assert(Number.isInteger(row.sourceTrace.sourceLine));
      assert.strictEqual(row.metadata.inferenceMode, "aggressive");
      assert(blockingAbbreviationIssues(row, registry).length >= 1);
    }
  }
});

test("write refuses to overwrite existing import files without --overwrite", () => {
  const tmpRoot = makeTempRoot();
  const first = importDatabasePool({
    rootDir: tmpRoot,
    input: "inputs/BL10A",
    pool: "BL10A",
    write: true,
  });
  assert.strictEqual(first.errors.length, 0);
  const second = importDatabasePool({
    rootDir: tmpRoot,
    input: "inputs/BL10A",
    pool: "BL10A",
    write: true,
  });
  assert(second.errors.length > 0);
  assert(second.errors.every((error) => error.includes("target exists")));
});

test("write allows explicit overwrite", () => {
  const tmpRoot = makeTempRoot();
  importDatabasePool({
    rootDir: tmpRoot,
    input: "inputs/BL10A",
    pool: "BL10A",
    write: true,
  });
  const second = importDatabasePool({
    rootDir: tmpRoot,
    input: "inputs/BL10A",
    pool: "BL10A",
    write: true,
    overwrite: true,
  });
  assert.strictEqual(second.errors.length, 0);
});

test("non-renderable pool requires explicit section and port", () => {
  assert.throws(
    () => importDatabasePool({
      rootDir: root,
      input: "inputs/BL10A",
      pool: "not_a_port",
    }),
    /--section and --port are required/,
  );
  const summary = importDatabasePool({
    rootDir: root,
    input: "inputs/BL10A",
    pool: "not_a_port",
    section: "BL",
    port: "10A",
  });
  assert(summary.rowsExtracted > 0);
});

test("structured JSON pv values must match the source token grammar", () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pv-import-json-"));
  cleanup.push(tmpRoot);
  const inputDir = path.join(tmpRoot, "inputs", "BL99A");
  fs.mkdirSync(inputDir, { recursive: true });
  fs.writeFileSync(path.join(inputDir, "custom.json"), `${JSON.stringify({
    items: [
      { pv: "BL10:DET:X" },
      { pv: "not applicable" },
      { pv: "BL10:DET:X" },
    ],
  }, null, 2)}\n`);

  const summary = importDatabasePool({
    rootDir: tmpRoot,
    input: "inputs/BL99A",
    pool: "BL99A",
  });
  const rows = summary.sourceFiles[0].rows;
  assert.strictEqual(summary.errors.length, 0);
  assert.strictEqual(summary.rowsExtracted, 2);
  assert(summary.warnings.some((warning) => warning.includes("ignored invalid JSON pv token")));
  assert.deepStrictEqual(rows.map((row) => row.sourceAnchor), ["/items/0/pv", "/items/2/pv"]);
  assert(rows[1].sourceTrace.sourceLine > rows[0].sourceTrace.sourceLine);
});

for (const dir of cleanup) {
  fs.rmSync(dir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`Database-pool import validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("Database-pool import validation passed.");
