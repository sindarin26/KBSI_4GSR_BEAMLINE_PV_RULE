const fs = require("fs");
const path = require("path");

const { renderStandardPv, validateSourceRow } = require("../seo_v3_pilot/seo_v3_contract");
const { stableUid, validatePoolSourceRows } = require("./database_pool");

const SOURCE_PV_TOKEN_REGEX = /\b[A-Z][A-Z0-9]*(?::[A-Za-z][A-Za-z0-9_]*)+\b/g;
const SOURCE_PV_TOKEN_ANCHORED_REGEX = /^[A-Z][A-Z0-9]*(?::[A-Za-z][A-Za-z0-9_]*)+$/;
const SUPPORTED_EXTENSIONS = new Set([".txt", ".md", ".json", ".xml"]);

const DEVICE_MAPPINGS = [
  {
    matches: (device, signal) => device === "IVU" && /^Girder/i.test(signal),
    area: "FE",
    device: "IVU",
    subdevice: "GIRD",
    reason: "IVU Girder* maps to FE/IVU/GIRD",
  },
  {
    matches: (device, signal) => device === "IVU" && /^Enc/i.test(signal),
    area: "FE",
    device: "IVU",
    subdevice: "ENC",
    reason: "IVU Enc* maps to FE/IVU/ENC",
  },
  {
    matches: (device) => device === "IVU",
    area: "FE",
    device: "IVU",
    subdevice: "BODY",
    reason: "Other IVU signals map to FE/IVU/BODY",
  },
  {
    matches: (device) => device === "DCM" || device === "MONO",
    area: "OH",
    device: "MONO",
    subdevice: "CRYS",
    reason: "DCM/MONO maps to OH/MONO/CRYS",
  },
  {
    matches: (device) => ["HHLM", "M1", "M2"].includes(device),
    area: "OH",
    device: "HHLM",
    subdevice: "MIRR",
    reason: "HHLM/M1/M2 maps to OH/HHLM/MIRR",
  },
  {
    matches: (device) => device === "WBS" || device === "WBSLT",
    area: "OH",
    device: "WBSLT",
    subdevice: "SLIT",
    reason: "WBS/WBSLT maps to OH/WBSLT/SLIT",
  },
  {
    matches: (device) => device === "KBS",
    area: "OH",
    device: "KBSLT",
    subdevice: "SLIT",
    reason: "KBS maps to OH/KBSLT/SLIT",
  },
  {
    matches: (device) => device === "KBV",
    area: "OH",
    device: "KBVM",
    subdevice: "MIRR",
    reason: "KBV maps to OH/KBVM/MIRR",
  },
  {
    matches: (device) => device === "KBH",
    area: "OH",
    device: "KBHM",
    subdevice: "MIRR",
    reason: "KBH maps to OH/KBHM/MIRR",
  },
  {
    matches: (device) => device === "SAM" || device === "SMPL",
    area: "EH",
    device: "SMPL",
    subdevice: "STG",
    reason: "SAM/SMPL maps to EH/SMPL/STG",
  },
  {
    matches: (device) => device === "DET",
    area: "EH",
    device: "CCD",
    subdevice: "STG",
    reason: "DET maps to EH/CCD/STG",
  },
  {
    matches: (device) => device === "IC" || device === "ION",
    area: "EH",
    device: "ION",
    subdevice: "BODY",
    reason: "IC/ION maps to EH/ION/BODY",
  },
  {
    matches: (device) => device === "ATT",
    area: "PTL",
    device: "ATT",
    subdevice: "STG",
    reason: "ATT maps to PTL/ATT/STG",
  },
  {
    matches: (device) => device === "FMASK",
    area: "PTL",
    device: "FRMASK",
    subdevice: "SLIT",
    reason: "FMASK maps to PTL/FRMASK/SLIT",
  },
  {
    matches: (device) => device === "MMASK",
    area: "PTL",
    device: "MVMASK",
    subdevice: "SLIT",
    reason: "MMASK maps to PTL/MVMASK/SLIT",
  },
];

function importDatabasePool(options) {
  const rootDir = options.rootDir || process.cwd();
  const inputDir = normalizeRelPath(options.input);
  const poolId = options.pool;
  if (!inputDir) throw new Error("--input is required");
  if (!poolId) throw new Error("--pool is required");

  const sectionPort = sectionPortFromOptions(poolId, options);
  const absInputDir = path.resolve(rootDir, inputDir);
  if (!fs.existsSync(absInputDir) || !fs.statSync(absInputDir).isDirectory()) {
    throw new Error(`input directory not found: ${inputDir}`);
  }

  const files = fs
    .readdirSync(absInputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

  const poolDir = path.resolve(rootDir, "database_pool", poolId);
  const summary = {
    inputDir,
    poolId,
    filesScanned: 0,
    filesSkipped: [],
    rowsExtracted: 0,
    targetFiles: [],
    errors: [],
    warnings: [],
    sourceFiles: [],
  };

  for (const fileName of files) {
    const ext = path.extname(fileName).toLowerCase();
    const sourceId = slash(path.join(inputDir, fileName));
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      summary.filesSkipped.push({ sourceId, reason: `unsupported extension: ${ext || "(none)"}` });
      continue;
    }

    summary.filesScanned += 1;
    const absFile = path.join(absInputDir, fileName);
    const sourceRows = extractRowsFromFile({
      absFile,
      sourceId,
      sourceFormat: formatForExtension(ext),
      poolId,
      section: sectionPort.section,
      port: sectionPort.port,
    });
    summary.warnings.push(...sourceRows.warnings);
    if (sourceRows.rows.length === 0) {
      summary.warnings.push(`no source PV tokens found: ${sourceId}`);
    }
    const targetFile = slash(path.join(
      "database_pool",
      poolId,
      "sources",
      `import_${safeSourceBasename(fileName)}.rows.json`,
    ));
    const targetPath = path.resolve(rootDir, targetFile);
    summary.rowsExtracted += sourceRows.rows.length;
    summary.targetFiles.push(targetFile);
    summary.sourceFiles.push({
      sourceId,
      targetFile,
      rows: sourceRows.rows,
    });

    if (fs.existsSync(targetPath) && !options.overwrite) {
      summary.errors.push(`target exists; use --overwrite: ${targetFile}`);
    }
  }

  addDuplicateWarnings(rootDir, poolId, summary);

  if (summary.errors.length > 0) return summary;

  if (options.write) {
    ensurePoolScaffold(rootDir, poolId, inputDir);
    for (const sourceFile of summary.sourceFiles) {
      const targetPath = path.resolve(rootDir, sourceFile.targetFile);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, `${JSON.stringify({
        poolId,
        sourceId: sourceFile.sourceId,
        rows: sourceFile.rows,
      }, null, 2)}\n`);
    }
  }

  return summary;
}

function ensurePoolScaffold(rootDir, poolId, inputDir) {
  const poolDir = path.resolve(rootDir, "database_pool", poolId);
  const manifestPath = path.join(poolDir, "manifest.yaml");
  fs.mkdirSync(path.join(poolDir, "sources"), { recursive: true });
  fs.mkdirSync(path.join(poolDir, "decisions"), { recursive: true });
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, [
      `pool_id: ${poolId}`,
      `title: ${poolId} Imported Database Pool`,
      "status: pilot",
      "schema_version: database_pool_import_mvp",
      `source_note: Imported from ${inputDir} by scripts/import_database_pool.js`,
      "",
    ].join("\n"));
  }
}

function extractRowsFromFile({ absFile, sourceId, sourceFormat, poolId, section, port }) {
  const text = fs.readFileSync(absFile, "utf8").replace(/^\uFEFF/, "");
  const matches = sourceFormat === "json"
    ? extractJsonMatches(text, sourceId)
    : extractLineMatches(text, sourceId);
  const rows = matches.matches.map((match) => buildRow({
    match,
    sourceId,
    sourceFormat,
    poolId,
    section,
    port,
  }));
  return { rows, warnings: matches.warnings };
}

function extractJsonMatches(text, sourceId) {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data.items)) {
      const matches = [];
      const warnings = [];
      let searchFrom = 0;
      data.items.forEach((item, index) => {
        if (!item || typeof item.pv !== "string") return;
        if (!SOURCE_PV_TOKEN_ANCHORED_REGEX.test(item.pv)) {
          warnings.push(`ignored invalid JSON pv token at ${sourceId}#/items/${index}/pv: ${item.pv}`);
          return;
        }
        const line = lineNumberOfAfter(text, item.pv, searchFrom);
        searchFrom = line.nextSearchFrom;
        matches.push({
          token: item.pv,
          sourceAnchor: `/items/${index}/pv`,
          sourceLine: line.lineNumber,
        });
      });
      return { matches, warnings };
    }
  } catch (_) {
    // Fall back to line scanning below.
  }
  return extractLineMatches(text, sourceId);
}

function extractLineMatches(text) {
  const matches = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, lineIndex) => {
    const found = [...line.matchAll(SOURCE_PV_TOKEN_REGEX)];
    found.forEach((match, pvIndex) => {
      matches.push({
        token: match[0],
        sourceAnchor: found.length > 1 ? `line:${lineIndex + 1}#pv:${pvIndex + 1}` : `line:${lineIndex + 1}`,
        sourceLine: lineIndex + 1,
      });
    });
  });
  return { matches, warnings: [] };
}

function buildRow({ match, sourceId, sourceFormat, poolId, section, port }) {
  const parsed = parseSourcePv(match.token);
  const sourceDeviceToken = parsed.device || "UNK";
  const sourceSignalToken = parsed.signal || "Unknown";
  const mapping = inferMapping(sourceDeviceToken, sourceSignalToken);
  const signal = normalizeSignal(sourceSignalToken);
  const components = {
    section,
    port,
    area: mapping.area,
    device: mapping.device,
    subdevice: mapping.subdevice,
    signal,
  };
  const standardPv = renderStandardPv(components);
  const row = {
    uid: "",
    rowId: standardPv,
    poolId,
    sourceId,
    sourceAnchor: match.sourceAnchor,
    ...components,
    standardPv,
    reviewStatus: "needs_input",
    sourcePv: match.token,
    sourceTrace: {
      sourceId,
      sourceAnchor: match.sourceAnchor,
      sourceLine: match.sourceLine || 1,
      sourceKind: "database_pool_import",
      sourceLabel: match.token,
    },
    note: "Imported by database-pool aggressive inference; human review required.",
    metadata: {
      inferenceMode: "aggressive",
      inferenceReasons: mapping.reasons,
      sourceFormat,
      sourceDeviceToken,
      sourceSignalToken,
    },
  };
  row.uid = stableUid(row);
  const errors = [...validateSourceRow(row), ...validatePoolSourceRows([row])];
  if (errors.length > 0) {
    throw new Error(`invalid imported row for ${match.token}: ${errors.join("; ")}`);
  }
  return row;
}

function parseSourcePv(token) {
  const parts = String(token || "").split(":");
  return {
    prefix: parts[0] || "",
    device: sanitizeCode(parts[1] || "UNK"),
    signal: parts.slice(2).join("") || "Unknown",
  };
}

function inferMapping(sourceDeviceToken, sourceSignalToken) {
  const device = sanitizeCode(sourceDeviceToken);
  for (const mapping of DEVICE_MAPPINGS) {
    if (mapping.matches(device, sourceSignalToken)) {
      return {
        area: mapping.area,
        device: mapping.device,
        subdevice: mapping.subdevice,
        reasons: [mapping.reason],
      };
    }
  }
  return {
    area: "EH",
    device: device || "UNK",
    subdevice: "UNK",
    reasons: [`Unrecognized source device ${sourceDeviceToken}; preserved token and marked subdevice UNK`],
  };
}

function normalizeSignal(value) {
  const signal = String(value || "Unknown").replace(/[^A-Za-z0-9]/g, "");
  if (!signal) return "Unknown";
  return signal[0].toUpperCase() + signal.slice(1);
}

function sanitizeCode(value) {
  const code = String(value || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return code || "UNK";
}

function sectionPortFromOptions(poolId, options) {
  if (options.section && options.port) {
    return { section: options.section, port: options.port };
  }
  const match = String(poolId || "").match(/^([A-Z]+)([0-9]{2}[A-Z])$/);
  if (!match) {
    throw new Error("--section and --port are required when --pool does not match ^([A-Z]+)([0-9]{2}[A-Z])$");
  }
  return { section: match[1], port: match[2] };
}

function safeSourceBasename(fileName) {
  return fileName.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function formatForExtension(ext) {
  return {
    ".txt": "text",
    ".md": "markdown",
    ".json": "json",
    ".xml": "xml",
  }[ext] || "unknown";
}

function addDuplicateWarnings(rootDir, poolId, summary) {
  const existing = existingStandardPvs(rootDir, poolId);
  const seenImported = new Map();
  for (const sourceFile of summary.sourceFiles) {
    for (const row of sourceFile.rows) {
      if (existing.has(row.standardPv)) {
        summary.warnings.push(`duplicate standardPv already in pool: ${row.standardPv}`);
      }
      if (seenImported.has(row.standardPv)) {
        summary.warnings.push(`duplicate standardPv in import preview: ${row.standardPv}`);
      }
      seenImported.set(row.standardPv, true);
    }
  }
  summary.warnings = [...new Set(summary.warnings)].sort();
}

function existingStandardPvs(rootDir, poolId) {
  const sourceDir = path.resolve(rootDir, "database_pool", poolId, "sources");
  const pvs = new Set();
  if (!fs.existsSync(sourceDir)) return pvs;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".rows.json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(sourceDir, entry.name), "utf8"));
    for (const row of data.rows || []) {
      if (row.standardPv) pvs.add(row.standardPv);
    }
  }
  return pvs;
}

function lineNumberOfAfter(text, needle, searchFrom) {
  const index = text.indexOf(needle, searchFrom);
  if (index < 0) {
    return {
      lineNumber: 1,
      nextSearchFrom: searchFrom,
    };
  }
  return {
    lineNumber: text.slice(0, index).split(/\r?\n/).length,
    nextSearchFrom: index + needle.length,
  };
}

function normalizeRelPath(value) {
  if (!value) return "";
  return slash(path.normalize(value));
}

function slash(value) {
  return value.split(path.sep).join("/");
}

module.exports = {
  SOURCE_PV_TOKEN_REGEX,
  SOURCE_PV_TOKEN_ANCHORED_REGEX,
  importDatabasePool,
  extractRowsFromFile,
  ensurePoolScaffold,
  safeSourceBasename,
};
