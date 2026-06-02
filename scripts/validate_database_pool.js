#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { loadDefaultRegistry, validateRegistry, validateRegistryUsageEvidence } =
  require("./abbreviation_registry_pilot/abbreviation_registry");
const { loadPool } = require("./database_pool_pilot/database_pool");

const root = path.resolve(__dirname, "..");
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

function check(message, fn) {
  try {
    fn();
    pass(message);
  } catch (error) {
    fail(message, error);
  }
}

check("abbreviation registry loads and validates", () => {
  const registry = loadDefaultRegistry(root);
  const errors = validateRegistry(registry, { requireReviewFields: true });
  if (errors.length > 0) {
    throw new Error(`registry validation errors: ${errors.join("; ")}`);
  }
  const usageErrors = validateRegistryUsageEvidence(registry, root);
  if (usageErrors.length > 0) {
    throw new Error(`registry usage evidence errors: ${usageErrors.join("; ")}`);
  }
});

const poolsDir = path.join(root, "database_pool");
const poolIds = fs
  .readdirSync(poolsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "abbreviations")
  .map((entry) => entry.name);

for (const poolId of poolIds) {
  check(`pool ${poolId} loads (manifest + optional source/decision files)`, () => {
    loadPool(path.join(poolsDir, poolId));
  });
}

if (failures > 0) {
  console.error(`Database-pool validation failed with ${failures} failed check(s).`);
  process.exit(1);
}

console.log("Database-pool validation passed.");
