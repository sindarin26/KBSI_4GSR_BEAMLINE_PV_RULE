# 2026-05-28 M3 Importer CLI Closeout

## Scope

Milestone 3 added a preview-first database-pool importer for active BL10A input
material.

Included:

- added the reusable importer module at `scripts/database_pool_pilot/importer.js`;
- added the user-facing CLI at `scripts/import_database_pool.js`;
- added importer validation at `scripts/validate_database_pool_import.js`;
- wired importer validation into `scripts/validate_database_pool.js`;
- supported `.txt`, `.md`, `.json`, and `.xml` files directly under the input
  directory;
- preserved one source-row output file per supported input file;
- kept default CLI behavior preview-only, with tracked writes gated behind
  `--write`;
- enforced `--overwrite` before replacing existing import files;
- kept every imported row at `reviewStatus: "needs_input"`;
- preserved `sourcePv`, deterministic `uid`, and complete `sourceTrace`;
- reported duplicate `standardPv` values and empty supported input files as
  warnings, not approval or fatal policy decisions.

Excluded:

- no workbench import UI or HTTP endpoint work;
- no export profile work;
- no automatic abbreviation approval;
- no automatic rulebook promotion;
- no SEO_v2 output shape migration;
- no recursive input directory import.

## Review Result

Initial read-only subagent review reported no blockers and one important issue:

- structured JSON `items[].pv` values bypassed the documented source PV token
  grammar.

Fix applied:

- JSON structured extraction now accepts only anchored source PV tokens matching
  the importer grammar and records a warning for invalid JSON `pv` values;
- the importer validation now includes an edge test for invalid JSON `pv` values
  and repeated JSON PV strings.

Follow-up read-only subagent review reported:

- no blockers;
- no important findings.

Remaining minor note:

- `scripts/validate_database_pool_import.js` asserts imported rows remain
  abbreviation-blocked under the current pilot registry. This is acceptable for
  this milestone because importer-generated rows are intentionally
  review-required; the assertion may need relaxing when the abbreviation
  registry matures.

## Validation

Passed:

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
node --check scripts/database_pool_pilot/importer.js
node --check scripts/import_database_pool.js
node --check scripts/validate_database_pool_import.js
node scripts/validate_database_pool_import.js
node scripts/validate_database_pool.js
git diff --check
```

Observed preview result:

- scanned supported files: 7;
- extracted rows: 113;
- errors: 0;
- warnings include expected duplicate `standardPv` preview warnings and a no-PV
  warning for `inputs/BL10A/random manager memo.txt`.

## Status

Milestone 3 is complete and ready for commit. The next milestone is Milestone 4:
Workbench Import UI.
