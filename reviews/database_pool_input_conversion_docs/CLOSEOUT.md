# Database-Pool Input Conversion Docs Closeout

Date: 2026-06-01

## Objective

Document the agent-mediated path for converting new `inputs/<pool_id>/`
material into reviewable SEO_V3 `database_pool/<pool_id>/` source rows, without
changing importer behavior or generating BL9ASIM rows.

## Completed

- Added `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md` as the active
  agent procedure for natural-language and semi-structured input conversion.
- Updated `AGENTS.md` so Draft agents must consult the conversion rule before
  producing SEO_V3 database-pool rows from `inputs/<pool_id>/` source material.
- Updated `ARCHITECTURE.md` so the workflow is discoverable from both
  `rules/draft/` and `inputs/` responsibilities.
- Updated `rules/draft/README.md` to list the new conversion rulebook.
- Updated `scripts/validate_workflow_docs.js` to require the new file and key
  cross-references.

## Guardrails Preserved

- No importer logic was changed.
- No `database_pool/BL9ASIM/` rows were generated or imported.
- No BL9ASIM source inventory content was changed.
- No schemas, active PV shape, SEO_v2 workflow, or web real-time behavior were
  changed.
- BL9ASIM handling is documented only as a pilot conversion decision:
  `poolId: BL9ASIM`, rendered `section: BL`, `port: 09A`, and EH source context
  maps to `area: EH` unless the input says otherwise.

## Review

Read-only subagent review reported no blocker, important, or minor findings.
The reviewer confirmed that agents are wired strongly enough to see the new
rulebook, and that traceability, review status, abbreviation, ambiguity,
third-party IOC, BL9ASIM, and manual reload requirements are covered.

## Validation

Passed before closeout:

```text
node --check scripts/validate_workflow_docs.js
node scripts/validate_workflow_docs.js
git diff --check
node scripts/validate_database_pool.js
```

`node scripts/validate_database_pool.js` was run with escalated filesystem
access because this session's sandbox is read-only and the suite writes
temporary fixtures.

## Result

Agents now have a discoverable, validation-backed procedure to follow before
converting natural-language or semi-structured `inputs/<pool_id>/` material into
SEO_V3 database-pool rows.
