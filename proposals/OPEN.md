# Open Rule Items

This file tracks known open items that are not yet formal proposals.

When an item becomes actionable, create a file under `proposals/rule_changes/`
and link it here.

## Current Open Items

- Instance policy for duplicate approved SEO_V3 `standardPv` values in the
  database-pool corpus.
- Whether `10C` should be added to the human-facing Markdown port table.
- Whether DB-backed operational codes (`SYS`, `CTRL`, `MOTOR`, `LOGIC`, `UTIL`,
  etc.) should be promoted into the published human-facing standard tables.
- Abbreviation issue resolution semantics, including exact-code confirmation,
  meaning-aware confirmation, instance patterns such as `SLIT##`, and conflict
  handling. Tracked by
  `proposals/rule_changes/PROP-0002-abbreviation-issue-resolution-contract.md`.
- Final coordinate convention for source axes and physical motion semantics.
- Status/readback/alarm/diagnostic PV naming beyond basic SEO_V3 signal naming.
- Third-party EPICS suffix mapping policy for vendor support modules whose
  source suffixes would introduce extra colon tiers, tracked by
  `exceptions/BL9ASIM/EXC-0001-third-party-epics-suffix-tier-boundary.md` and
  `proposals/rule_changes/PROP-0001-third-party-epics-suffix-policy.md`.
- Whether to add optional metadata fields beyond the active database-pool row
  fields required by `schemas/database_pool.seo_v3.yaml`.
- Formal strict validation schema for `database_pool/<pool_id>/sources/*.rows.json`
  and `database_pool/<pool_id>/decisions/*.decisions.json`.
