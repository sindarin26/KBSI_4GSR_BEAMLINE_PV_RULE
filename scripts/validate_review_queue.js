#!/usr/bin/env node
// Validate outputs/<beamline>/_work/review_queue.json.
// Checks: shared pv_review_row shape, unique rawId, unique (sourceId,sourceAnchor),
// sourceId resolves to the output status source_input_dir, falling back to inputs/<beamline>/.

const fs = require("fs");
const path = require("path");
const {
  rel,
  posixRel,
  listFiles,
  schemaConstraints,
  validatePvRow,
} = require("./lib/pv_workbench");

const beamline = process.argv[2];
if (!beamline) {
  console.error("Usage: node scripts/validate_review_queue.js <beamline>");
  process.exit(2);
}

const queuePath = rel("outputs", beamline, "_work", "review_queue.json");
const statusPath = rel("outputs", beamline, "status.yaml");

if (!fs.existsSync(queuePath)) {
  console.error(`FAIL: missing ${posixRel(queuePath)} — run: node scripts/build_review_queue.js ${beamline}`);
  process.exit(1);
}

let queue;
try {
  queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
} catch (err) {
  console.error(`FAIL: cannot parse ${posixRel(queuePath)}: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(queue)) {
  console.error(`FAIL: ${posixRel(queuePath)} must be a JSON array`);
  process.exit(1);
}

const constraints = schemaConstraints();
const errors = [];
const warnings = [];

function error(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

const inputDir = sourceInputDir();
const inputFiles = new Set();
if (fs.existsSync(inputDir)) {
  for (const f of listFiles(inputDir)) {
    inputFiles.add(posixRel(f));
  }
}

const seenRawIds = new Map();
const seenAnchors = new Map();
const allowedSourceLabels = new Set([
  "deterministic_json",
  "deterministic_xml",
  "deterministic_md_table",
  "agent_extraction",
]);

for (const [index, row] of queue.entries()) {
  const loc = `review_queue[${index}]`;

  const { errors: rowErrors, warnings: rowWarnings } = validatePvRow(row, constraints, loc);
  for (const e of rowErrors) error(e);
  for (const w of rowWarnings) warn(w);

  if (row.dataset && row.dataset === "SEO_v2") {
    error(`${loc} seed rows must not appear in beamline review_queue (dataset: ${row.dataset})`);
  }

  if (row.sourceLabel && !allowedSourceLabels.has(row.sourceLabel)) {
    error(`${loc} sourceLabel must be an extraction mode, found ${row.sourceLabel}`);
  }

  if (row.rawId) {
    if (seenRawIds.has(row.rawId)) {
      error(`duplicate rawId in review_queue: ${row.rawId} (first seen at index ${seenRawIds.get(row.rawId)})`);
    } else {
      seenRawIds.set(row.rawId, index);
    }
  }

  if (row.sourceId && row.sourceAnchor && !row.orphan) {
    const key = `${row.sourceId}::${row.sourceAnchor}`;
    if (seenAnchors.has(key)) {
      error(`duplicate (sourceId, sourceAnchor) at index ${index}: ${key} (first seen at ${seenAnchors.get(key)})`);
    } else {
      seenAnchors.set(key, index);
    }
  }

  if (row.sourceId && inputFiles.size > 0 && !row.orphan && !inputFiles.has(row.sourceId)) {
    error(`${loc} sourceId not found in ${posixRel(inputDir)}/: ${row.sourceId}`);
  }
}

for (const w of warnings) console.warn(`WARN: ${w}`);
for (const e of errors) console.error(`FAIL: ${e}`);

if (errors.length > 0) {
  console.error(
    `Review queue validation failed for ${beamline}: ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  process.exit(1);
}

console.log(
  `Review queue validation passed for ${beamline}: ${queue.length} rows, ${warnings.length} warning(s).`,
);

function sourceInputDir() {
  if (!fs.existsSync(statusPath)) return rel("inputs", beamline);
  const text = fs.readFileSync(statusPath, "utf8");
  const match = text.match(/^source_input_dir:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (!match) return rel("inputs", beamline);
  return rel(...match[1].split("/"));
}
