#!/usr/bin/env node

const { importDatabasePool } = require("./database_pool_pilot/importer");

function usage() {
  console.error("Usage: node scripts/import_database_pool.js --input <dir> --pool <poolId> [--write] [--overwrite] [--section SEC --port 10A]");
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") options.write = true;
    else if (arg === "--overwrite") options.overwrite = true;
    else if (arg === "--input") options.input = argv[++index];
    else if (arg === "--pool") options.pool = argv[++index];
    else if (arg === "--section") options.section = argv[++index];
    else if (arg === "--port") options.port = argv[++index];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (!options.input || !options.pool) {
    usage();
    process.exit(2);
  }
  const summary = importDatabasePool(options);
  console.log(JSON.stringify({
    mode: options.write ? "write" : "preview",
    ...cliSummary(summary),
  }, null, 2));
  if (summary.errors.length > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}

function cliSummary(summary) {
  return {
    ...summary,
    sourceFiles: summary.sourceFiles.map((sourceFile) => ({
      sourceId: sourceFile.sourceId,
      targetFile: sourceFile.targetFile,
      rows: sourceFile.rows.length,
    })),
  };
}
