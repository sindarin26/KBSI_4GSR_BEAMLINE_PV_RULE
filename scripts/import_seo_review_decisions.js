#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { rel, posixRel } = require("./lib/pv_workbench");

const DEFAULT_SOURCE = "inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json";
const DEFAULT_OUT_DIR = "fixtures/SEO_v2";

const sourcePath = process.argv[2] || DEFAULT_SOURCE;
const outDir = process.argv[3] || DEFAULT_OUT_DIR;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error(
    "Usage: node scripts/import_seo_review_decisions.js [source-json] [output-dir]",
  );
  process.exit(2);
}

try {
  const sourceAbs = rel(...sourcePath.split("/"));
  const outAbs = rel(...outDir.split("/"));
  const rows = JSON.parse(fs.readFileSync(sourceAbs, "utf8").replace(/^\uFEFF/, ""));
  if (!Array.isArray(rows)) {
    throw new Error(`${sourcePath} must contain a JSON array`);
  }

  const fixedRows = rows.map((row, index) => toDecisionRow(row, index, sourcePath));
  fs.mkdirSync(outAbs, { recursive: true });
  writeJson(path.join(outAbs, "review_decisions.json"), fixedRows);

  console.log(
    `Imported ${fixedRows.length} fixed SEO decision rows to ${posixRel(path.join(outAbs, "review_decisions.json"))}`,
  );
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}

function toDecisionRow(row, index, sourceId) {
  const section = "BL";
  const port = stringValue(row.port);
  const area = stringValue(row.area);
  const dev = stringValue(row.dev);
  const subdev = stringValue(row.subdev);
  const signal = stringValue(row.signal);
  return {
    seq: Number(row.seq) || index + 1,
    rawId: `SEO-${String(index + 1).padStart(5, "0")}`,
    dataset: "SEO_v2",
    reviewStatus: "fixed",
    section,
    port,
    area,
    dev,
    subdev,
    signal,
    standardPv: `${section}-${port}:${area}-${dev}-${subdev}:${signal}`,
    source: stringValue(row.source),
    note: stringValue(row.note),
    sourceId,
    sourceLine: null,
    sourceAnchor: `/${index}`,
    sourceLabel: stringValue(row.standardPv),
    reviewNote: "Imported from SEO_v2 DB as fixed review-test seed.",
    exceptionIds: [],
    legacyStandardPv: stringValue(row.standardPv),
    updatedAt: "2026-05-21T00:00:00.000Z",
  };
}

function stringValue(value) {
  return value === undefined || value === null ? "" : String(value);
}

function writeJson(file, rows) {
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`Wrote ${posixRel(file)}`);
}
