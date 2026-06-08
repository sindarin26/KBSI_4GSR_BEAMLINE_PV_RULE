#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");

const {
  blockingAbbreviationIssues,
  groupAbbreviationIssues,
  normalizeSourceTerm,
  patternMatches,
  validateRegistry,
} = require("./abbreviation_registry_pilot/abbreviation_registry");

const fixtureSource = {
  source: {
    sourceId: "inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md",
    sourceAnchor: "fixture",
    sourceLabel: "fixture",
  },
  rationale: "in-memory test fixture",
  usageEvidence: {
    sourceList: [
      {
        sourceId: "inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md",
        sourceAnchor: "fixture",
        sourceLabel: "fixture",
      },
    ],
    rowUsage: { currentCount: 0, examples: [] },
  },
};

function registry(entries) {
  return {
    schemaVersion: "seo_v3_abbreviation_review_v1",
    sourceOfTruth: true,
    statusPolicy: { candidateBlocksApproval: true },
    entries,
  };
}

function entry(kind, code, meaning, status = "approved") {
  return {
    kind,
    code,
    meaning,
    status,
    scope: "global",
    ...fixtureSource,
  };
}

function patternEntry(codePattern, baseCode, meaning, status = "approved") {
  return {
    kind: "subdevice",
    codePattern,
    baseCode,
    meaning,
    status,
    scope: "global",
    ...fixtureSource,
  };
}

function row(patch = {}) {
  const data = {
    uid: "pvrow_fixture",
    poolId: "FIXTURE",
    sourceId: "inputs/fixture.md",
    sourceAnchor: "fixture:1",
    section: "BL",
    port: "10C",
    area: "SYS",
    device: "PH",
    subdevice: "SLIT01",
    signal: "Open",
    standardPv: "BL10C-SYS:PH-SLIT01:Open",
    metadata: {
      noteContract: "standard_pv_evidence_v1",
      componentEvidence: {
        section: evidence("BL", ["Beamline"]),
        port: evidence("10C", ["Beamline port"]),
        area: evidence("SYS", ["System / IOC control area"]),
        device: evidence("PH", ["Pinhole"]),
        subdevice: evidence("SLIT01", ["Slit instance 01"], ["SLIT##"]),
      },
    },
  };
  return { ...data, ...patch };
}

function evidence(code, sourceTerms, patternCandidates = []) {
  return {
    exactCodeCandidates: [
      {
        code,
        sourceTerms,
        patternCandidates,
        resolutionKeyCandidates: [
          sourceTerms[0]
            ? `abbreviation:global:test:${code}:${sourceTerms[0]}`
            : `abbreviation:global:test:${code}`,
        ],
        evidence: ["fixture"],
        uncertainty: [],
        sourceAnchor: "fixture:1",
      },
    ],
    ...(patternCandidates.length > 0 ? { patternCandidates } : {}),
  };
}

function withoutIssue(issues, field) {
  assert(!issues.some((issue) => issue.field === field), `expected no ${field} issue, found ${JSON.stringify(issues)}`);
}

function withIssue(issues, field) {
  const issue = issues.find((candidate) => candidate.field === field);
  assert(issue, `expected ${field} issue in ${JSON.stringify(issues)}`);
  return issue;
}

function run() {
  assert(patternMatches("SLIT##", "SLIT01"));
  assert(!patternMatches("SLIT##", "SLIT1"));
  assert(!patternMatches("SLIT##", "XXSLIT01"));
  assert(!patternMatches("SLIT##", "SLIT010"));

  const minimalPattern = { kind: "subdevice", codePattern: "SLIT##", baseCode: "SLIT", meaning: "Slit instance", status: "approved", scope: "global" };
  assert.deepStrictEqual(validateRegistry({ entries: [minimalPattern] }), []);
  assert(validateRegistry({ entries: [{ ...minimalPattern, baseCode: "WRONG" }] }).some((error) => error.includes("baseCode")));
  assert(validateRegistry({ entries: [{ ...minimalPattern, code: "SLIT" }] }).some((error) => error.includes("either code or codePattern")));

  const baseEntries = [
    entry("section", "BL", "Beamline"),
    entry("port", "10C", "Beamline port"),
    entry("area", "SYS", "System / IOC control area"),
    entry("device", "PH", "Pinhole"),
  ];

  withoutIssue(blockingAbbreviationIssues(row(), registry(baseEntries)), "port");
  withoutIssue(blockingAbbreviationIssues(row(), registry(baseEntries)), "device");

  const exactMeaningMismatchRow = row({
    metadata: {
      noteContract: "standard_pv_evidence_v1",
      componentEvidence: {
        section: evidence("BL", ["Beamline"]),
        port: evidence("10C", ["Beamline port"]),
        area: evidence("SYS", ["System / IOC control area"]),
        device: evidence("PH", ["Pneumatic Holder"]),
        subdevice: evidence("SLIT01", ["Slit instance 01"], ["SLIT##"]),
      },
    },
  });
  const exactMismatchIssue = withIssue(blockingAbbreviationIssues(exactMeaningMismatchRow, registry([
    ...baseEntries,
    patternEntry("SLIT##", "SLIT", "Slit instance"),
  ])), "device");
  assert.strictEqual(exactMismatchIssue.status, "meaning_conflict");
  assert.deepStrictEqual(exactMismatchIssue.candidateMeanings, ["Pinhole", "Pneumatic Holder"]);

  const exactBaseOnly = registry([...baseEntries, entry("subdevice", "SLIT", "Slit Unit")]);
  const exactBaseIssue = withIssue(blockingAbbreviationIssues(row(), exactBaseOnly), "subdevice");
  assert.strictEqual(exactBaseIssue.resolutionMode, "pattern");
  assert.strictEqual(exactBaseIssue.matchedPattern, "SLIT##");
  assert.strictEqual(exactBaseIssue.blocking, true);

  const patternApproved = registry([...baseEntries, patternEntry("SLIT##", "SLIT", "Slit instance")]);
  withoutIssue(blockingAbbreviationIssues(row(), patternApproved), "subdevice");

  const patternMeaningMismatch = withIssue(blockingAbbreviationIssues(row(), registry([
    ...baseEntries,
    patternEntry("SLIT##", "SLIT", "Blade instance"),
  ])), "subdevice");
  assert.strictEqual(patternMeaningMismatch.status, "meaning_conflict");
  assert.deepStrictEqual(patternMeaningMismatch.candidateMeanings, ["Blade instance", "Slit instance"]);

  const missingPatternConflictRow = row({
    subdevice: "CTRL01",
    standardPv: "BL10C-SYS:PH-CTRL01:Open",
    metadata: {
      noteContract: "standard_pv_evidence_v1",
      componentEvidence: {
        section: evidence("BL", ["Beamline"]),
        port: evidence("10C", ["Beamline port"]),
        area: evidence("SYS", ["System / IOC control area"]),
        device: evidence("PH", ["Pinhole"]),
        subdevice: evidence("CTRL01", ["Controller instance 01", "Soft motor instance 01"], ["CTRL##"]),
      },
    },
  });
  const missingPatternConflict = withIssue(blockingAbbreviationIssues(missingPatternConflictRow, registry(baseEntries)), "subdevice");
  assert.strictEqual(missingPatternConflict.status, "meaning_conflict");
  assert.strictEqual(missingPatternConflict.resolutionMode, "conflict");
  assert.deepStrictEqual(missingPatternConflict.candidateMeanings, ["Controller instance 1", "Soft motor instance 1"]);

  for (const status of ["candidate", "deprecated", "rejected"]) {
    const issue = withIssue(blockingAbbreviationIssues(row(), registry([
      entry("section", "BL", "Beamline"),
      entry("port", "10C", "Beamline port"),
      entry("area", "SYS", "System / IOC control area"),
      entry("device", "PH", "Pinhole", status),
      patternEntry("SLIT##", "SLIT", "Slit instance"),
    ])), "device");
    assert.strictEqual(issue.status, status);
    assert.strictEqual(issue.blocking, true);
  }

  const conflictRow = row({
    metadata: {
      noteContract: "standard_pv_evidence_v1",
      componentEvidence: {
        section: evidence("BL", ["Beamline"]),
        port: evidence("10C", ["Beamline port"]),
        area: evidence("SYS", ["System / IOC control area"]),
        device: evidence("PH", ["Pinhole", "Pneumatic Holder"]),
        subdevice: evidence("SLIT01", ["Slit instance 01"], ["SLIT##"]),
      },
    },
  });
  const conflictIssue = withIssue(blockingAbbreviationIssues(conflictRow, registry([
    entry("section", "BL", "Beamline"),
    entry("port", "10C", "Beamline port"),
    entry("area", "SYS", "System / IOC control area"),
    entry("device", "PH", "Pinhole"),
    patternEntry("SLIT##", "SLIT", "Slit instance"),
  ])), "device");
  assert.strictEqual(conflictIssue.status, "meaning_conflict");
  assert.deepStrictEqual(conflictIssue.candidateMeanings, ["Pinhole", "Pneumatic Holder"]);

  assert.strictEqual(normalizeSourceTerm("vocabulary gap: no exact registry meaning for MOTOR"), "");

  const rows = JSON.parse(fs.readFileSync("database_pool/4GSR_Beamline_PV_Naming_Standard_v1.0/sources/html_semantic.rows.json", "utf8")).rows;
  const durableRegistry = JSON.parse(fs.readFileSync("database_pool/abbreviations/registry.json", "utf8"));
  const groups = groupAbbreviationIssues(rows, durableRegistry);
  assert(groups.length > 0, "expected current 4GSR issue groups");
  const portGroup = groups.find((group) => group.resolutionKey === "abbreviation:global:port:10C");
  assert(portGroup, "expected port 10C group");
  assert.strictEqual(portGroup.rowCount, 2099);
  assert(portGroup.examples.length > 0, "expected examples for port 10C group");

  console.log(JSON.stringify({
    ok: true,
    current4gsrRows: rows.length,
    current4gsrGroupCount: groups.length,
    topGroups: groups.slice(0, 5).map((group) => ({
      resolutionKey: group.resolutionKey,
      rowCount: group.rowCount,
      status: group.status,
      resolutionMode: group.resolutionMode,
    })),
  }, null, 2));
}

run();
