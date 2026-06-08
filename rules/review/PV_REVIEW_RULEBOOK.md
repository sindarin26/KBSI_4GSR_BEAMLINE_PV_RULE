# PV Review Rulebook

Version: SEO_V3 (skeleton)
Status: skeleton — awaiting redrafting after the 2026-06-02 hard-reset alignment
Last updated: 2026-06-02

## Purpose

This rulebook will define how agents validate generated PV data and review
artifacts under the SEO_V3 4GSR Beamline PV Naming Standard. The previous
SEO_v2 review rulebook content was removed during the SEO_V3 alignment.

## Authority Order

While this rulebook is a skeleton, reviewers must use this fallback authority
order, in order:

1. `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md` for shape and
   vocabulary.
2. `database_pool/abbreviations/registry.json` for component abbreviation
   status (candidate / approved / deprecated / rejected) and scope.
3. `rules/draft/PV_NAMING_RULEBOOK.md` for generation expectations.
4. `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md` for conversion
   provenance expectations.
5. `rules/decisions/` for rationale on existing decisions.
6. Owner question or `exceptions/` / `proposals/` workflow when policy is
   unclear.

## What This File Should Cover

Future drafting of this rulebook should cover, in order:

1. Violation vs. warning vs. ambiguity vs. recommendation classification.
2. Required source-trace integrity checks (`poolId`, `sourceId`,
   `sourceAnchor`, `uid`).
3. Abbreviation review gating before bulk row approval, including handling of
   duplicate/ambiguous candidates.
4. Conflict detection: duplicate approved PVs, orphan decisions, abbreviation
   blocking issues.
5. Read-only vs. fix-allowed review modes.
6. Output: where to log applied fixes and decision-required items.

Until those sections are written, reviewers must surface findings in plain
language with concrete file:line citations and route policy decisions through
the exception/proposal workflow rather than applying them as silent fixes.

## Interim Abbreviation Review Contract

The active abbreviation registry covers `section`, `port`, `area`, `device`,
and `subdevice`. `signal` is not an abbreviation-registry kind and should be
handled by a separate signal naming policy.

Abbreviation issues are derived from row components and
`database_pool/abbreviations/registry.json`. They should not be treated as
durable source-row data. Missing, candidate, deprecated, rejected, or
meaning-conflicting abbreviation records are blocking until the matching
registry record or pattern is explicitly approved.

Future meaning-aware and pattern-aware resolution is tracked by
`proposals/rule_changes/PROP-0002-abbreviation-issue-resolution-contract.md`.

During the abbreviation issue engine pilot, materialized abbreviation issues
remain computed review data. They must include stable resolution keys and must
not be copied into source rows as durable data. The pilot issue modes are:

- exact code: `abbreviation:<scope>:<kind>:<code>`;
- meaning-aware exact code:
  `abbreviation:<scope>:<kind>:<code>:<normalizedSourceTerm>`;
- explicit pattern:
  `abbreviation-pattern:<scope>:<kind>:<codePattern>:<normalizedMeaning>`;
- conflict: `abbreviation-conflict:<scope>:<kind>:<code>`;
- row-local missing component:
  `abbreviation-missing-component:<poolId>:<uid>:<field>`.

Pattern syntax is not regex syntax. `#` matches exactly one ASCII digit,
matching is full-string only, and `baseCode` must equal the literal prefix
before the first `#`. Exact base-code approval, such as `SLIT`, must not clear
instance codes such as `SLIT01`; an explicit approved pattern is required.

These pilot rules support review-server computation only. They do not approve
PV rows, do not approve registry entries, and do not promote `PROP-0002` into
active naming policy without owner approval.
