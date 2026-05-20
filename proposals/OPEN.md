# Open Rule Items

This file tracks known open items that are not yet formal proposals.

When an item becomes actionable, create a file under `proposals/rule_changes/`
and link it here.

## Current Open Items

- Instance policy for duplicate SEO_v2 rendered PV names in the DB corpus.
- Whether `10C` should be added to the human-facing Markdown port table.
- Whether DB-backed operational codes (`SYS`, `CTRL`, `MOTOR`, `LOGIC`, `UTIL`,
  etc.) should be promoted into the published human-facing standard tables.
- Final coordinate convention for source axes and physical motion semantics.
- Status/readback/alarm/diagnostic PV naming beyond basic SEO_v2 signal naming.
- Owner-approved mappings for unresolved ID10 legacy devices and areas tracked
  by `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md`.
- IVU encoder classification tracked by
  `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md`.
- Whether to add optional metadata columns beyond the active
  `PV_REFERENCE.md` table columns required by the review rulebook.
- Formal schema under `schemas/` for strict validation of `pv_registry.yaml`.
