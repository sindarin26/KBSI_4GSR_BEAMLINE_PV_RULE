# PV Naming Draft Rulebook

Version: SEO_V3 (skeleton)
Status: skeleton — awaiting redrafting after the 2026-06-02 hard-reset alignment
Last updated: 2026-06-02

## Purpose

This rulebook will define how agents create or normalize beamline PV identity
data under the SEO_V3 4GSR Beamline PV Naming Standard. The previous SEO_v2
rulebook content was removed during the SEO_V3 alignment because it described a
naming shape that is no longer the active target.

## Active PV Name Shape

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

Example:

```text
BL10A-OH:MONO-CRYS:Theta
```

The standard source document is:

```text
inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md
```

## What This File Should Cover

Future drafting of this rulebook should cover, in order:

1. Vocabulary: section, port, area, device, subdevice, signal — allowed token
   sets, regex shapes, and source-of-truth for additions.
2. Component-level authority order: standard document → approved abbreviations →
   curated examples → decision records → exception/proposal workflow.
3. Conversion procedure pointers: when to use the mechanical importer
   (`scripts/import_database_pool.js`) vs. the agent conversion procedure
   (`rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md`).
4. Source traceability requirements: `poolId`, `sourceId`, `sourceAnchor`,
   deterministic `uid`, and `sourceTrace.sourceKind`.
5. Abbreviation policy: candidate vs. approved status, scope, ambiguity
   handling, and how abbreviation approval interacts with row approval.
6. Self-review expectations under `rules/review/`.
7. Exception/proposal escalation when the rulebook does not cover a case.

Until those sections are written, agents must treat
`inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md` and the active
abbreviation registry (`database_pool/abbreviations/registry.json`) as the
working policy sources, and must surface unresolved cases through the
exception/proposal workflow rather than inferring policy.
