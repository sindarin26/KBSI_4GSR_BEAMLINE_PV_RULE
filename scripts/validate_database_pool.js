#!/usr/bin/env node

const { spawnSync } = require("child_process");

const withHttp = process.argv.includes("--with-http");

const checks = [
  ["SEO_V3 contract", ["node", "scripts/seo_v3_pilot/validate_contract.js"]],
  ["database-pool data layer", ["node", "scripts/database_pool_pilot/validate_data_layer.js"]],
  ["abbreviation registry", ["node", "scripts/abbreviation_registry_pilot/validate_abbreviations.js"]],
  ["small migration pilot", ["node", "scripts/migration_pilot/validate_m4_small_migration.js"]],
  [
    "review workbench",
    [
      "node",
      "scripts/database_pool_pilot/validate_review_workbench.js",
      ...(withHttp ? ["--with-http"] : []),
    ],
  ],
];

let failures = 0;

for (const [label, command] of checks) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    failures += 1;
    console.error(`FAIL: ${label} exited with ${result.status}`);
  }
}

if (failures > 0) {
  console.error(`Database-pool validation failed with ${failures} failed check(s).`);
  process.exit(1);
}

console.log("\nDatabase-pool validation passed.");
