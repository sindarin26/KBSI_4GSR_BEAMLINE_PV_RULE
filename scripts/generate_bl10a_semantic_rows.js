#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const { stableUid } = require("./database_pool_pilot/database_pool");
const { renderStandardPv } = require("./seo_v3_pilot/seo_v3_contract");

const repoRoot = path.resolve(__dirname, "..");
const poolId = "BL10A";
const section = "BL";
const port = "10A";

const sourceFiles = [
  "inputs/BL10A/front masks and attenuator.txt",
  "inputs/BL10A/optics motors.json",
  "inputs/BL10A/sample detector notes.md",
  "inputs/BL10A/slits etc.xml",
  "inputs/BL10A/status and xbpm.txt",
  "inputs/BL10A/undulator.md",
];

const areaMeanings = {
  EH: "Experimental Hutch",
  FE: "Front-end",
  OH: "Optical Hutch",
  PTL: "Photon Transport Line",
  SYS: "System / IOC status area",
};

const deviceMeanings = {
  ATT: "Attenuator",
  CCD: "Detector / Camera",
  CTRL: "Control/System control family",
  FRMASK: "Fixed Mask",
  HHLM: "High Heat Load Mirror",
  IVU: "In-vacuum Undulator",
  ION: "Ion Chamber",
  KBHM: "Horizontal KB Mirror",
  KBVM: "Vertical KB Mirror",
  KBSLT: "KB Mirror Slit",
  MONO: "Monochromator",
  MVMASK: "Movable Mask",
  RING: "Storage ring status source",
  SH: "Shutter",
  SMPL: "Sample Stage",
  SSA: "Secondary source aperture",
  WBSLT: "White Beam Slit",
  XBPM: "X-ray Beam Position Monitor",
  ZP: "Zone Plate",
};

const subdeviceMeanings = {
  BODY: "Main Body",
  CRYS: "Crystal Unit",
  CSTG: "Coarse stage",
  DIAG: "Diagnostics",
  ENC: "Encoder",
  FSTG: "Fine stage",
  GIRD: "Girder",
  GON: "Goniometer",
  IC1: "Ion chamber instance 1",
  IOC: "IOC status",
  KBSLIT: "KB slit aperture",
  M1: "M1 mirror instance",
  M2: "M2 mirror instance",
  MIRR: "Mirror Unit",
  SCAN: "Scan status/control",
  SLIT: "Slit Unit",
  SSA: "Secondary source aperture",
  STG: "Stage",
  XBPM1: "XBPM instance 1",
  XBPM2: "XBPM instance 2",
};

function main() {
  const write = process.argv.includes("--write");
  const records = sourceFiles.flatMap(extractRecords);
  const rows = records.map(buildRow);
  const duplicateGroups = findDuplicateStandardPvs(rows);
  const summary = {
    mode: write ? "write" : "preview",
    poolId,
    rows: rows.length,
    bySource: countBy(rows, (row) => row.sourceId),
    byStatus: countBy(rows, (row) => row.reviewStatus),
    bySourceKind: countBy(rows, (row) => row.sourceTrace.sourceKind),
    byNoteContract: countBy(rows, (row) => row.metadata.noteContract),
    duplicateStandardPvGroups: duplicateGroups,
    targetFiles: [
      "database_pool/BL10A/manifest.yaml",
      "database_pool/BL10A/sources/semantic.rows.json",
    ],
  };

  if (duplicateGroups.length > 0) {
    console.log(JSON.stringify(summary, null, 2));
    throw new Error("refusing to write duplicate standardPv rows");
  }

  if (write) {
    writeOutput(rows);
  }

  console.log(JSON.stringify(summary, null, 2));
}

function extractRecords(sourceId) {
  const absFile = path.join(repoRoot, sourceId);
  const text = fs.readFileSync(absFile, "utf8").replace(/^\uFEFF/, "");
  if (sourceId.endsWith(".json")) return extractJsonRecords(sourceId, text);
  return extractTextRecords(sourceId, text);
}

function extractJsonRecords(sourceId, text) {
  const data = JSON.parse(text);
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((item) => ({
    sourceId,
    sourcePv: item.pv,
    sourceLine: lineNumberOf(text, item.pv),
    sourceLabel: item.pv,
    sourceContext: item.group || "",
    sourceRecord: {
      group: item.group || "",
      egu: item.egu || "",
      init: item.init,
      low: item.low,
      high: item.high,
      velocity: item.velocity,
      ioc: item.ioc || "",
    },
  }));
}

function extractTextRecords(sourceId, text) {
  const records = [];
  const seen = new Set();
  const lines = text.split(/\r?\n/);
  const regex = /BL10(?::[A-Za-z][A-Za-z0-9_]*)+/g;
  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(regex)) {
      const sourcePv = match[0];
      if (seen.has(sourcePv)) continue;
      seen.add(sourcePv);
      records.push({
        sourceId,
        sourcePv,
        sourceLine: index + 1,
        sourceLabel: sourcePv,
        sourceContext: summarizeContext(line),
        sourceRecord: parseLooseRecord(line, sourcePv),
      });
    }
  }
  return records;
}

function summarizeContext(line) {
  const groupMatch = line.match(/\bgroup="([^"]+)"/);
  if (groupMatch) return groupMatch[1];
  const nameMatch = line.match(/\bname="([^"]+)"/);
  if (nameMatch) return nameMatch[1];
  const afterComma = line.split(",")[1];
  if (afterComma) return afterComma.trim();
  const tableCells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
  if (tableCells.length > 1) return tableCells[1];
  return line.trim();
}

function parseLooseRecord(line, sourcePv) {
  const record = {};
  const eguMatch = line.match(/\begu="([^"]+)"/);
  const iocMatch = line.match(/\bioc="([^"]+)"/) || line.match(/\b(ioc=|ioc\s+)([A-Za-z0-9_-]+)/i);
  if (eguMatch && eguMatch[1]) record.egu = eguMatch[1].trim();
  if (iocMatch) record.ioc = (iocMatch[2] || iocMatch[1] || "").trim();
  if (line.includes("|")) {
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    const pvIndex = cells.findIndex((cell) => cell.includes(sourcePv));
    const dataCells = pvIndex >= 0 ? cells.slice(pvIndex + 1) : [];
    const tableUnit = dataCells.find(isUnitToken);
    const tableIoc = dataCells.find((cell) => /^(sim|hw|hardware)$/i.test(cell));
    if (!record.egu && tableUnit) record.egu = tableUnit;
    if (!record.ioc && tableIoc) record.ioc = tableIoc;
  }
  record.rawLine = line.trim();
  return record;
}

function isUnitToken(value) {
  return /^(mm|um|deg|urad|mA|GeV|h|A|int|bool|enum|Hz|-|no unit)$/i.test(String(value || "").trim());
}

function buildRow(record) {
  const parts = record.sourcePv.split(":");
  const root = parts[1];
  const tailParts = parts.slice(2);
  const tail = tailParts.join(":");
  const mapping = mapSource(root, tailParts, record);
  const components = {
    section,
    port,
    area: mapping.area,
    device: mapping.device,
    subdevice: mapping.subdevice,
    signal: mapping.signal || sanitizeSignal(tail),
  };
  const standardPv = renderStandardPv(components);
  const sourceAnchor = `pv:${record.sourcePv}`;
  const sourceTrace = {
    sourceId: record.sourceId,
    sourceAnchor,
    sourceLine: record.sourceLine,
    sourceKind: "agent_input_conversion",
    sourceLabel: record.sourceLabel,
  };
  const row = {
    uid: stableUid({ poolId, sourceId: record.sourceId, sourceAnchor }),
    rowId: standardPv,
    poolId,
    sourceId: record.sourceId,
    sourceAnchor,
    ...components,
    standardPv,
    reviewStatus: "needs_input",
    sourcePv: record.sourcePv,
    sourceTrace,
    metadata: {
      importKind: "bl10a_semantic_conversion",
      noteContract: "standard_pv_evidence_v1",
      sourceCandidate: {
        sourcePv: record.sourcePv,
        sourceRoot: root,
        sourceTail: tail,
        sourceContext: record.sourceContext,
        sourceRecord: record.sourceRecord,
      },
      semantic: {
        category: mapping.category,
        mappingMethod: mapping.method,
        sourceRoot: root,
        sourceTail: tail,
        uncertainty: mapping.uncertainty,
      },
      componentEvidence: componentEvidence(components, mapping, record, sourceAnchor),
    },
    note: buildNote({ record, sourceAnchor, root, tail, components, standardPv, mapping }),
  };
  if (record.sourceRecord && record.sourceRecord.egu) row.egu = String(record.sourceRecord.egu);
  if (record.sourceRecord && record.sourceRecord.ioc) row.ioc = String(record.sourceRecord.ioc);
  return row;
}

function mapSource(root, tailParts, record) {
  const tail = tailParts.join(":");
  const signal = sanitizeSignal(tail);
  const base = {
    signal,
    method: "source_root_semantic_mapping",
    category: root,
    uncertainty: ["review required: generated BL10A candidate is not approved"],
  };

  if (root === "IVU") {
    if (/^Girder/i.test(tail)) {
      return { ...base, area: "PTL", device: "IVU", subdevice: "GIRD", signal: sanitizeSignal(tail), category: "undulator_girder" };
    }
    if (/^Enc/i.test(tail)) {
      return {
        ...base,
        area: "PTL",
        device: "IVU",
        subdevice: "ENC",
        signal: sanitizeSignal(tail),
        category: "undulator_encoder",
        uncertainty: [...base.uncertainty, "source note inputs/BL10A/undulator.md:15 says EncUS/EncDS may be readbacks rather than motors"],
      };
    }
    return { ...base, area: "PTL", device: "IVU", subdevice: "BODY", category: "undulator_body" };
  }

  if (root === "M1" || root === "M2") {
    return {
      ...base,
      area: "OH",
      device: "HHLM",
      subdevice: root,
      category: "high_heat_load_mirror_instance",
      uncertainty: [...base.uncertainty, "source root preserved as subdevice to avoid M1/M2 duplicate standardPv collapse"],
    };
  }

  if (root === "DCM") return { ...base, area: "OH", device: "MONO", subdevice: "CRYS", category: "monochromator_crystal" };
  if (root === "KBV") return { ...base, area: "OH", device: "KBVM", subdevice: "MIRR", category: "vertical_kb_mirror" };
  if (root === "KBH") return { ...base, area: "OH", device: "KBHM", subdevice: "MIRR", category: "horizontal_kb_mirror" };
  if (root === "ZP") return { ...base, area: "EH", device: "ZP", subdevice: "STG", category: "zone_plate_stage" };
  if (root === "FMASK") return { ...base, area: "PTL", device: "FRMASK", subdevice: "SLIT", category: "front_mask" };
  if (root === "MMASK") {
    return {
      ...base,
      area: "PTL",
      device: "MVMASK",
      subdevice: "SLIT",
      category: "movable_mask",
      uncertainty: [...base.uncertainty, "source memo inputs/BL10A/random manager memo.txt:10 says movable mask location not checked; PTL assumed for review"],
    };
  }
  if (root === "ATT") return { ...base, area: "PTL", device: "ATT", subdevice: "STG", category: "attenuator_stage" };

  if (root === "SAM") {
    const first = tailParts[0] || "";
    if (/^C[XYZ]$/i.test(first)) return { ...base, area: "EH", device: "SMPL", subdevice: "CSTG", category: "sample_coarse_stage" };
    if (/^(Theta|Phi)$/i.test(first)) return { ...base, area: "EH", device: "SMPL", subdevice: "GON", category: "sample_goniometer" };
    if (/^F[XYZ]$/i.test(first)) return { ...base, area: "EH", device: "SMPL", subdevice: "FSTG", category: "sample_fine_stage" };
    if (/^S[XYZ]$/i.test(first)) return { ...base, area: "EH", device: "SMPL", subdevice: "SCAN", category: "sample_scan_stage" };
    return { ...base, area: "EH", device: "SMPL", subdevice: "STG", category: "sample_stage" };
  }

  if (root === "DET") return { ...base, area: "EH", device: "CCD", subdevice: "STG", category: "detector_stage" };
  if (root === "WBS") return { ...base, area: "OH", device: "WBSLT", subdevice: "SLIT", category: "white_beam_slit" };
  if (root === "SSA") return { ...base, area: "OH", device: "SSA", subdevice: "SLIT", category: "secondary_source_aperture" };
  if (root === "KBS") return { ...base, area: "OH", device: "KBSLT", subdevice: "SLIT", category: "kb_slit" };
  if (root === "RING") {
    return {
      ...base,
      area: "SYS",
      device: "RING",
      subdevice: "DIAG",
      category: "storage_ring_status",
      uncertainty: [...base.uncertainty, "source memo inputs/BL10A/random manager memo.txt:17 says status/readback/alarm naming is not settled"],
    };
  }
  if (root === "FE") return { ...base, area: "FE", device: "SH", subdevice: "BODY", category: "front_end_shutter" };
  if (root === "XBPM1" || root === "XBPM2") {
    return {
      ...base,
      area: "OH",
      device: "XBPM",
      subdevice: root,
      signal: sanitizeSignal(tail),
      category: "xbpm_diagnostics",
      uncertainty: [...base.uncertainty, "diagnostic/readback PV naming needs review"],
    };
  }
  if (root === "IC1") return { ...base, area: "EH", device: "ION", subdevice: "IC1", category: "ion_chamber" };
  if (root === "IOC") return { ...base, area: "SYS", device: "CTRL", subdevice: "IOC", category: "ioc_status" };
  if (root === "SCAN") {
    return {
      ...base,
      area: "SYS",
      device: "CTRL",
      subdevice: "SCAN",
      category: "scan_publish_status",
      uncertainty: [...base.uncertainty, "source memo inputs/BL10A/random manager memo.txt:17 says status/readback/alarm naming is not settled"],
    };
  }

  return {
    ...base,
    area: "SYS",
    device: "CTRL",
    subdevice: "DIAG",
    category: "unmapped_source_root",
    uncertainty: [...base.uncertainty, `source root ${root} needs mapping review`],
  };
}

function componentEvidence(components, mapping, record, sourceAnchor) {
  const values = {
    section: { code: components.section, term: "Beamline section" },
    port: { code: components.port, term: "Beamline 10A port" },
    area: { code: components.area, term: areaMeanings[components.area] || `${components.area} area candidate` },
    device: { code: components.device, term: deviceMeanings[components.device] || `${components.device} device candidate` },
    subdevice: { code: components.subdevice, term: subdeviceMeanings[components.subdevice] || `${components.subdevice} subdevice candidate` },
  };
  return Object.fromEntries(Object.entries(values).map(([field, value]) => [
    field,
    evidenceFor(field, value.code, value.term, record, sourceAnchor, mapping),
  ]));
}

function evidenceFor(field, code, sourceTerm, record, sourceAnchor, mapping) {
  const kind = field;
  const candidate = {
    code,
    sourceTerms: [sourceTerm],
    patternCandidates: patternCandidatesFor(field, code),
    resolutionKeyCandidates: resolutionKeysFor(field, code, sourceTerm),
    evidence: [
      record.sourcePv,
      record.sourceContext || record.sourceLabel,
      `mapping category: ${mapping.category}`,
    ].filter(Boolean),
    uncertainty: uncertaintyFor(field, code, mapping),
    sourceAnchor,
  };
  return {
    exactCodeCandidates: [candidate],
    ...(candidate.patternCandidates.length > 0 ? { patternCandidates: candidate.patternCandidates } : {}),
  };
}

function resolutionKeysFor(field, code, sourceTerm) {
  const keys = [`abbreviation:global:${field}:${code}`];
  if (!["section", "port", "area"].includes(field)) {
    keys.push(`abbreviation:global:${field}:${code}:${sourceTerm}`);
  }
  return keys;
}

function uncertaintyFor(field, code, mapping) {
  const uncertainties = [];
  if (field === "area" && code === "SYS") uncertainties.push("vocabulary gap: SYS area is review-required");
  if (field === "device" && !deviceMeanings[code]) uncertainties.push(`vocabulary gap: ${code} device requires abbreviation review`);
  if (field === "subdevice" && !subdeviceMeanings[code]) uncertainties.push(`vocabulary gap: ${code} subdevice requires abbreviation review`);
  if (field === "subdevice" && /^[A-Z]+\d+$/.test(code)) uncertainties.push("instance code requires pattern-aware abbreviation review");
  return [...uncertainties, ...mapping.uncertainty.filter((item) => item.startsWith("source "))];
}

function patternCandidatesFor(field, code) {
  if (field !== "subdevice") return [];
  if (!/^[A-Z]+\d+$/.test(code)) return [];
  return [code.replace(/\d/g, "#")];
}

function buildNote({ record, sourceAnchor, root, tail, components, standardPv, mapping }) {
  const componentList = `section=${components.section}; port=${components.port}; area=${components.area}; device=${components.device}; subdevice=${components.subdevice}; signal=${components.signal}; standardPv=${standardPv}`;
  const componentChanges = `source root ${root} and tail ${tail || "(empty)"} mapped to ${componentList}`;
  const mappingEvidence = [
    `category=${mapping.category}`,
    `method=${mapping.method}`,
    record.sourceContext ? `sourceContext=${record.sourceContext}` : "",
    record.sourceRecord && record.sourceRecord.rawLine ? `rawLine=${record.sourceRecord.rawLine}` : "",
  ].filter(Boolean).join("; ");
  return [
    `Source: sourceId ${record.sourceId}; sourceLine ${record.sourceLine}; sourceAnchor ${sourceAnchor}; sourceLabel ${record.sourceLabel}; sourcePv ${record.sourcePv}`,
    `HTML candidate: non-HTML BL10A source candidate; sourceRoot=${root}; sourceTail=${tail || "(empty)"}; sourceContext=${record.sourceContext || "(none)"}`,
    `Chosen PV: ${componentList}`,
    `Component changes: ${componentChanges}`,
    `Mapping evidence: ${mappingEvidence}`,
    `Uncertainty/Review required: ${mapping.uncertainty.join("; ")}`,
    `Vocabulary: section ${components.section}=${"Beamline section"}; port ${components.port}=Beamline 10A port; area ${components.area}=${areaMeanings[components.area] || "review-required"}; device ${components.device}=${deviceMeanings[components.device] || "review-required"}; subdevice ${components.subdevice}=${subdeviceMeanings[components.subdevice] || "review-required"}`,
  ].join("\n");
}

function sanitizeSignal(value) {
  const parts = String(value || "")
    .split(/[:_\-\s]+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  const signal = parts.join("");
  return signal || "Unknown";
}

function lineNumberOf(text, token) {
  const index = text.indexOf(token);
  if (index < 0) return 1;
  return text.slice(0, index).split(/\r?\n/).length;
}

function countBy(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item) || "";
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function findDuplicateStandardPvs(rows) {
  const byPv = new Map();
  for (const row of rows) {
    if (!byPv.has(row.standardPv)) byPv.set(row.standardPv, []);
    byPv.get(row.standardPv).push(row.uid);
  }
  return [...byPv.entries()]
    .filter(([, uids]) => uids.length > 1)
    .map(([standardPv, uids]) => ({ standardPv, uids }));
}

function writeOutput(rows) {
  const poolDir = path.join(repoRoot, "database_pool", poolId);
  const sourceDir = path.join(poolDir, "sources");
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(poolDir, "manifest.yaml"), [
    `pool_id: ${poolId}`,
    "title: BL10A Semantic Import Pool",
    "status: pilot",
    "schema_version: database_pool_seo_v3",
    "source_inputs:",
    "  - inputs/BL10A/",
    "source_note: |",
    "  Reviewable semantic-import rows generated from BL10A source notes.",
    "  Rows are source-backed candidates and remain reviewStatus: needs_input;",
    "  they are not approved naming policy. Rows use metadata.noteContract:",
    "  standard_pv_evidence_v1 and include component evidence for abbreviation",
    "  issue grouping. Mechanical importer output was used only as advisory",
    "  inventory evidence and was not promoted directly.",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(sourceDir, "semantic.rows.json"), `${JSON.stringify({
    poolId,
    sourceId: "inputs/BL10A/",
    rows,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
