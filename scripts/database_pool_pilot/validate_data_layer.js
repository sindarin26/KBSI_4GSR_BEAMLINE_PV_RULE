#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  loadPool,
  mergeRows,
  stableUid,
  updateDecision,
  validatePoolSourceRows,
} = require("./database_pool");

const root = path.resolve(__dirname, "..", "..");
const poolDir = path.join(root, "database_pool", "seo_v3_m2_pilot");
const sourceFile = path.join(poolDir, "sources", "m2.rows.json");

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

const pool = loadPool(poolDir);
const merged = mergeRows(pool.sourceRows, pool.decisions);

function byUid(uid) {
  return merged.rows.find((row) => row.uid === uid);
}

test("manifest and fixture files load", () => {
  assert.strictEqual(pool.manifest.data.pool_id, "seo_v3_m2_pilot");
  assert.strictEqual(pool.sourceFiles.length, 1);
  assert.strictEqual(pool.decisionFiles.length, 1);
  assert.strictEqual(pool.sourceRows.length, 5);
  assert.strictEqual(pool.decisions.length, 4);
});

test("source rows pass SEO_V3 row validation and deterministic uid checks", () => {
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
  }
});

test("matching decision overlay updates visible merged row by uid", () => {
  const row = byUid("pvrow_674d8d3484f13917");
  assert(row);
  assert.strictEqual(row.reviewStatus, "approved");
  assert.strictEqual(row.reviewNote, "Overlay should update the matching source row.");
  assert.strictEqual(row.sourceRow.reviewStatus, "draft");
  assert.strictEqual(row.orphan, false);
});

test("source-only row remains visible as needs_input", () => {
  const row = byUid("pvrow_d0e12fba77b8521a");
  assert(row);
  assert.strictEqual(row.reviewStatus, "needs_input");
  assert.strictEqual(row.decision, null);
  assert.strictEqual(row.orphan, false);
});

test("decision-only row becomes orphan", () => {
  const row = byUid("pvrow_orphan_m2_decision_001");
  assert(row);
  assert.strictEqual(row.reviewStatus, "orphan");
  assert.strictEqual(row.previousReviewStatus, "approved");
  assert.strictEqual(row.sourceRow, null);
  assert.strictEqual(row.orphan, true);
  assert(row.computed.conflictReasons.includes("decision_without_source"));
});

test("re-ingested row with same source identity keeps stable uid", () => {
  const original = pool.sourceRows[4];
  const reingested = {
    ...original,
    note: "same identity with changed source note",
  };
  assert.strictEqual(stableUid(reingested), original.uid);
});

test("re-ingested row with changed identity does not steal old decisions", () => {
  const original = pool.sourceRows[0];
  const changedIdentity = {
    ...original,
    sourceAnchor: "m2-source-001-renamed",
  };
  changedIdentity.uid = stableUid(changedIdentity);

  const changedMerge = mergeRows([changedIdentity], pool.decisions);
  const changedRow = changedMerge.rows.find((row) => row.uid === changedIdentity.uid);
  const oldDecision = changedMerge.rows.find((row) => row.uid === original.uid);

  assert(changedRow);
  assert.strictEqual(changedRow.reviewStatus, "draft");
  assert.strictEqual(changedRow.decision, null);
  assert(oldDecision);
  assert.strictEqual(oldDecision.reviewStatus, "orphan");
});

test("duplicate standardPv across accepted/approved rows is a computed conflict", () => {
  assert.deepStrictEqual(merged.duplicateStandardPvConflicts, [
    {
      standardPv: "BL10A-EH:SMPL-STG:X",
      uids: ["pvrow_fd77a41a13cd0dfc", "pvrow_40e55cf4df71e77b"],
    },
  ]);
  assert.strictEqual(byUid("pvrow_fd77a41a13cd0dfc").computed.conflict, true);
  assert.strictEqual(byUid("pvrow_40e55cf4df71e77b").computed.conflict, true);
});

test("editing a decision does not rewrite source row files", () => {
  const before = fs.readFileSync(sourceFile, "utf8");
  const edited = updateDecision(pool.decisions, "pvrow_674d8d3484f13917", {
    reviewNote: "Edited decision note in memory.",
  });
  const afterMerge = mergeRows(pool.sourceRows, edited);
  const editedRow = afterMerge.rows.find((row) => row.uid === "pvrow_674d8d3484f13917");
  const after = fs.readFileSync(sourceFile, "utf8");

  assert.strictEqual(editedRow.reviewNote, "Edited decision note in memory.");
  assert.strictEqual(after, before);
});

if (failures > 0) {
  console.error(`Database-pool M2 validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("Database-pool M2 validation passed.");
