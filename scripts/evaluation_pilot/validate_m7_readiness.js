#!/usr/bin/env node

const assert = require("assert");
const path = require("path");

const {
  loadWorkbenchState,
} = require("../database_pool_pilot/review_workbench");
const {
  blockingAbbreviationIssues,
} = require("../abbreviation_registry_pilot/abbreviation_registry");

const root = path.resolve(__dirname, "..", "..");
const MIN_READY_ROWS = 5;
const REQUIRED_APPROVED_KINDS = ["section", "port", "area", "device", "subdevice"];

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

function approvedKindCounts(registry) {
  const counts = Object.fromEntries(REQUIRED_APPROVED_KINDS.map((kind) => [kind, 0]));
  for (const entry of registry.entries || []) {
    if (entry.status === "approved" && counts[entry.kind] !== undefined) {
      counts[entry.kind] += 1;
    }
  }
  return counts;
}

function rowIsEvaluationReady(row, registry) {
  if (row.reviewStatus !== "approved") return false;
  if (row.computed && row.computed.conflict) return false;
  return blockingAbbreviationIssues(row, registry).length === 0;
}

function readinessReport(state) {
  const approvedCounts = approvedKindCounts(state.registry);
  const readyRows = state.rows.filter((row) => rowIsEvaluationReady(row, state.registry));
  const blockers = [];
  for (const kind of REQUIRED_APPROVED_KINDS) {
    if (approvedCounts[kind] === 0) {
      blockers.push(`no approved ${kind} abbreviation records`);
    }
  }
  if (readyRows.length < MIN_READY_ROWS) {
    blockers.push(`only ${readyRows.length}/${MIN_READY_ROWS} evaluation-ready approved rows`);
  }
  return {
    ready: blockers.length === 0,
    blockers,
    approvedCounts,
    readyRows: readyRows.map((row) => ({
      uid: row.uid,
      poolId: row.poolId,
      standardPv: row.standardPv,
      sourceId: row.sourceId,
      sourceAnchor: row.sourceAnchor,
    })),
  };
}

const state = loadWorkbenchState({ rootDir: root });
const report = readinessReport(state);

test("M7 readiness report is deterministic and source-backed", () => {
  assert.strictEqual(state.rows.length, 14);
  assert.deepStrictEqual(Object.keys(report.approvedCounts), REQUIRED_APPROVED_KINDS);
  for (const row of report.readyRows) {
    assert(row.uid);
    assert(row.poolId);
    assert(row.standardPv);
    assert(row.sourceId);
    assert(row.sourceAnchor);
  }
});

test("M7 does not start cross-agent evaluation before approved examples are stable", () => {
  assert.strictEqual(report.ready, false);
  assert(report.blockers.includes("no approved device abbreviation records"));
  assert(report.blockers.includes("no approved subdevice abbreviation records"));
  assert(report.blockers.some((item) => item.includes("evaluation-ready approved rows")));
});

test("M7 has no premature held-out expected outputs", () => {
  assert.deepStrictEqual(report.readyRows, []);
});

if (failures > 0) {
  console.error(`M7 readiness validation failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("M7 evaluation readiness report:");
console.log(JSON.stringify(report, null, 2));
console.log("M7 readiness validation passed.");

module.exports = {
  approvedKindCounts,
  readinessReport,
  rowIsEvaluationReady,
};
