# 2026-05-21 M4 Small Migration Pilot Closeout

## Scope

Milestone 4 implemented small, traceable database-pool migration pilots from
real source material.

Included:

- a tracked SEO_V3 Markdown source copy under `inputs/`;
- a controlled `4GSR_Beamline_PV_Naming_Standard_v1.0` database pool;
- a controlled `BL10A` database pool from ID10 source material;
- M4 validation for row counts, source trace, abbreviation gating, and
  duplicate/conflict reporting.

Excluded:

- no bulk import of all SEO/HTML/ID10 rows;
- no active SEO_v2 rulebook or schema replacement;
- no promotion of HTML/DB-only operational codes;
- no UI work;
- no ID10 output migration.

## Deliverables

- `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md`
- `database_pool/4GSR_Beamline_PV_Naming_Standard_v1.0/manifest.yaml`
- `database_pool/4GSR_Beamline_PV_Naming_Standard_v1.0/sources/markdown_examples.rows.json`
- `database_pool/4GSR_Beamline_PV_Naming_Standard_v1.0/sources/operational_db_sample.rows.json`
- `database_pool/4GSR_Beamline_PV_Naming_Standard_v1.0/decisions/m4.decisions.json`
- `database_pool/BL10A/manifest.yaml`
- `database_pool/BL10A/sources/id10_small_subset.rows.json`
- `database_pool/BL10A/decisions/m4.decisions.json`
- `scripts/migration_pilot/validate_m4_small_migration.js`
- `scripts/migration_pilot/README.md`

## Pilot Row Counts

```text
4GSR_Beamline_PV_Naming_Standard_v1.0: 5 rows
  - 3 Markdown standard example rows
  - 2 HTML/DB-only operational rows

BL10A: 3 rows
  - 1 optics source row
  - 2 undulator source rows
```

The HTML/DB-only rows are `needs_input` and remain blocked by abbreviation
registry issues for unapproved codes such as `10C`, `SYS`, `CTRL`, `LOGIC`, and
`UTIL`.

## Validation

Passed:

```text
node scripts/migration_pilot/validate_m4_small_migration.js
node --check scripts/migration_pilot/validate_m4_small_migration.js
node scripts/abbreviation_registry_pilot/validate_abbreviations.js
node scripts/database_pool_pilot/validate_data_layer.js
node scripts/seo_v3_pilot/validate_contract.js
node scripts/validate_seo_v2_rules.js
```

The M4 validation covers:

- exact controlled row counts for both pilot pools;
- deterministic `uid` values and `rowId == standardPv`;
- SEO_V3 component/render validation;
- explicit `sourceTrace` on every row;
- tracked source paths instead of `temp/` references;
- HTML/DB-only operational rows remaining `needs_input`;
- candidate or missing abbreviation entries blocking silent acceptance or
  approval;
- duplicate `standardPv` conflict reporting, including an in-memory
  accepted/approved duplicate case;
- no legacy user-facing `seed` or `fixed` wording in M4 pool files.

## Read-Only Review

Subagent review found:

- Blocker: none.
- Important: none.
- Minor: duplicate/conflict validation initially exercised the reporting path
  but did not create an M4-local duplicate case.

Applied follow-up:

- Added an in-memory accepted/approved duplicate case to
  `scripts/migration_pilot/validate_m4_small_migration.js`.
- Reran M4 and cumulative pilot validations successfully.

Reviewer conclusion before the follow-up patch:

- M4 can close after including the tracked source copy and M4 files in the
  commit.

## Deferred To Later Milestones

- Bulk import from the 2099-row DB source remains deferred until after the
  small pilot path is reviewed.
- HTML/DB-only operational code promotion remains deferred to human review.
- Review UI one-source model and computed buckets are Milestone 5.
- Active architecture/rulebook/schema promotion remains Milestone 6.

## Status

Milestone 4 is complete and ready to commit after final read-only review.
