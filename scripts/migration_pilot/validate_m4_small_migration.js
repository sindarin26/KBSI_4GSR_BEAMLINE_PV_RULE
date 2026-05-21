#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  loadPool,
  mergeRows,
  stableUid,
  validatePoolSourceRows,
} = require("../database_pool_pilot/database_pool");
const {
  blockingAbbreviationIssues,
  loadRegistry,
} = require("../abbreviation_registry_pilot/abbreviation_registry");

const root = path.resolve(__dirname, "..", "..");
const registryPath = path.join(root, "fixtures", "seo_v3_pilot", "abbreviation_registry.json");
const poolSpecs = [
  {
    poolId: "4GSR_Beamline_PV_Naming_Standard_v1.0",
    expectedRows: 5,
    expectedSourceFiles: 2,
    expectedDecisionFiles: 1,
  },
  {
    poolId: "BL10A",
    expectedRows: 3,
    expectedSourceFiles: 1,
    expectedDecisionFiles: 1,
  },
];

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

function poolDir(poolId) {
  return path.join(root, "database_pool", poolId);
}

function sourcePath(sourceId) {
  return path.join(root, sourceId);
}

function loadPools() {
  return poolSpecs.map((spec) => ({
    spec,
    pool: loadPool(poolDir(spec.poolId)),
  }));
}

function assertSourceTrace(row) {
  assert(row.sourceTrace, `${row.uid} missing sourceTrace`);
  assert.strictEqual(row.sourceTrace.sourceId, row.sourceId, `${row.uid} sourceTrace.sourceId`);
  assert.strictEqual(
    row.sourceTrace.sourceAnchor,
    row.sourceAnchor,
    `${row.uid} sourceTrace.sourceAnchor`,
  );
  assert(row.sourceTrace.sourceKind, `${row.uid} missing sourceTrace.sourceKind`);
  assert(row.sourceTrace.sourceLabel, `${row.uid} missing sourceTrace.sourceLabel`);
  assert(
    Number.isInteger(row.sourceTrace.sourceLine),
    `${row.uid} sourceTrace.sourceLine must be an integer`,
  );
  assert(fs.existsSync(sourcePath(row.sourceId)), `${row.uid} sourceId must exist: ${row.sourceId}`);
}

function assertNoPoolWordingLeak(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  assert(!/\bseed\b/i.test(text), `${filePath} contains seed wording`);
  assert(!/\bfixed\b/i.test(text), `${filePath} contains fixed wording`);
}

const registry = loadRegistry(registryPath);
const loadedPools = loadPools();

test("M4 pilot pools load with controlled row counts", () => {
  for (const { spec, pool } of loadedPools) {
    assert.strictEqual(pool.manifest.data.pool_id, spec.poolId);
    assert.strictEqual(pool.sourceRows.length, spec.expectedRows, spec.poolId);
    assert.strictEqual(pool.sourceFiles.length, spec.expectedSourceFiles, spec.poolId);
    assert.strictEqual(pool.decisionFiles.length, spec.expectedDecisionFiles, spec.poolId);
    assert.strictEqual(pool.decisions.length, 0, spec.poolId);
  }
});

test("all M4 source rows validate and persist deterministic uid values", () => {
  for (const { pool } of loadedPools) {
    assert.deepStrictEqual(validatePoolSourceRows(pool.sourceRows), []);
    for (const row of pool.sourceRows) {
      assert.strictEqual(
        row.uid,
        stableUid({
          poolId: row.poolId,
          sourceId: row.sourceId,
          sourceAnchor: row.sourceAnchor,
        }),
      );
      assert.strictEqual(row.rowId, row.standardPv);
    }
  }
});

test("every M4 row keeps explicit source trace to tracked source material", () => {
  for (const { pool } of loadedPools) {
    for (const row of pool.sourceRows) {
      assertSourceTrace(row);
      assert(!row.sourceId.startsWith("temp/"), `${row.uid} must not point at temp/`);
    }
  }
});

test("HTML/DB-only operational rows stay decision-required and abbreviation-blocked", () => {
  const standardPool = loadedPools.find(
    (item) => item.spec.poolId === "4GSR_Beamline_PV_Naming_Standard_v1.0",
  ).pool;
  const htmlDbRows = standardPool.sourceRows.filter(
    (row) => row.sourceTrace.sourceKind === "html_db",
  );
  assert.strictEqual(htmlDbRows.length, 2);

  for (const row of htmlDbRows) {
    assert.strictEqual(row.reviewStatus, "needs_input", row.standardPv);
    const issues = blockingAbbreviationIssues(row, registry);
    assert(issues.length >= 4, `${row.standardPv} should require code review`);
    assert(issues.some((issue) => issue.kind === "port" && issue.code === "10C"));
    assert(issues.some((issue) => issue.kind === "area" && issue.code === "SYS"));
    assert(issues.some((issue) => issue.kind === "device" && issue.code === "CTRL"));
  }
});

test("candidate device and subdevice codes do not produce accepted or approved rows", () => {
  for (const { pool } of loadedPools) {
    for (const row of pool.sourceRows) {
      const issues = blockingAbbreviationIssues(row, registry);
      if (issues.length === 0) continue;
      assert.notStrictEqual(row.reviewStatus, "accepted", row.standardPv);
      assert.notStrictEqual(row.reviewStatus, "approved", row.standardPv);
    }
  }
});

test("duplicate standardPv reporting runs and finds no conflicts in M4 subsets", () => {
  for (const { pool } of loadedPools) {
    const merged = mergeRows(pool.sourceRows, pool.decisions);
    assert(Array.isArray(merged.duplicateStandardPvConflicts));
    assert.deepStrictEqual(merged.duplicateStandardPvConflicts, []);
    assert.strictEqual(merged.rows.length, pool.sourceRows.length);
  }

  const bl10aPool = loadedPools.find((item) => item.spec.poolId === "BL10A").pool;
  const original = bl10aPool.sourceRows[0];
  const duplicate = {
    ...original,
    sourceAnchor: "m4-in-memory-duplicate",
    sourceTrace: {
      ...original.sourceTrace,
      sourceAnchor: "m4-in-memory-duplicate",
    },
  };
  duplicate.uid = stableUid(duplicate);

  const duplicateMerge = mergeRows([original, duplicate], [
    { uid: original.uid, reviewStatus: "approved" },
    { uid: duplicate.uid, reviewStatus: "accepted" },
  ]);

  assert.deepStrictEqual(duplicateMerge.duplicateStandardPvConflicts, [
    {
      standardPv: original.standardPv,
      uids: [original.uid, duplicate.uid],
    },
  ]);
});

test("M4 pool files do not expose legacy seed or fixed-state wording", () => {
  for (const { pool } of loadedPools) {
    for (const filePath of [...pool.sourceFiles, ...pool.decisionFiles, pool.manifest.path]) {
      assertNoPoolWordingLeak(filePath);
    }
  }
});

if (failures > 0) {
  console.error(`M4 small migration pilot validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("M4 small migration pilot validation passed.");
