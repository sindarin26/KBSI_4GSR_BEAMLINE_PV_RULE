# 2026-05-21 M6 Promotion And Repository Migration Closeout

## Scope

Milestone 6 promoted the reviewed SEO_V3 database-pool pilot into tracked
repository documentation, schema contracts, validators, and agent instructions
while preserving the legacy SEO_v2 output path for historical compatibility.

Included:

- architecture and agent policy updates for `database_pool/`;
- an informal SEO_V3 database-pool schema;
- a top-level database-pool validation entrypoint;
- workflow documentation validation;
- README updates for database-pool usage and legacy SEO_v2 compatibility;
- source-trace validation for database-pool rows.

Excluded:

- no rewrite of active draft/review rulebooks;
- no removal of legacy SEO_v2 output validators;
- no source trace rewrites in existing generated outputs;
- no export-profile decisions;
- no unresolved instance-number, section-length, or stricter SignalName policy
  promotion.

## Deliverables

- `AGENTS.md`
- `ARCHITECTURE.md`
- `README.md`
- `schemas/database_pool.seo_v3.yaml`
- `schemas/README.md`
- `schemas/pv_review_row.seo_v2.yaml`
- `schemas/review_decisions.seo_v2.yaml`
- `schemas/review_queue.seo_v2.yaml`
- `scripts/validate_database_pool.js`
- `scripts/validate_workflow_docs.js`
- `scripts/validate_seo_v2_rules.js`
- `scripts/database_pool_pilot/database_pool.js`
- `scripts/database_pool_pilot/validate_review_workbench.js`
- `database_pool/seo_v3_m2_pilot/sources/m2.rows.json`

## Validation

Passed:

```text
node scripts/validate_database_pool.js
node scripts/validate_database_pool.js --with-http
node scripts/validate_workflow_docs.js
node scripts/validate_seo_v2_rules.js
node scripts/migration_pilot/validate_m4_small_migration.js
node scripts/abbreviation_registry_pilot/validate_abbreviations.js
node scripts/database_pool_pilot/validate_data_layer.js
node scripts/seo_v3_pilot/validate_contract.js
node --check scripts/database_pool_pilot/database_pool.js scripts/database_pool_pilot/validate_review_workbench.js scripts/validate_database_pool.js scripts/validate_workflow_docs.js scripts/validate_seo_v2_rules.js
```

`node scripts/validate_database_pool.js` is now pure file/data validation by
default. `--with-http` adds the optional local workbench endpoint smoke test and
requires a local port bind.

## Read-Only Review

First M6 review found:

- Blocker: none.
- Important:
  1. promoted schema required `sourceTrace`, but M2 fixture rows did not have
     it and validation did not enforce it;
  2. README mixed unresolved HTML/DB-only candidate codes into ordinary examples;
  3. database-pool default workflow conflicted with Quick Start and Draft agent
     instructions.
- Minor:
  - promoted validator should not require HTTP bind by default;
  - SignalName wording should not imply stricter CamelCase validation is active.

Applied fixes:

- Added `sourceTrace` to M2 rows and enforced it in
  `validatePoolSourceRows()`.
- Split README examples into approved Markdown evidence and candidate follow-up
  examples.
- Added database-pool Quick Start and separated the legacy SEO_v2 output path.
- Updated Draft mode instructions to distinguish database-pool rows from legacy
  generated outputs.
- Made HTTP workbench smoke optional via `--with-http`.
- Clarified SignalName validation as upper-initial regex with stricter
  CamelCase deferred.

Second M6 review found:

- Blocker: none.
- Important: none.
- Minor: decision overlay schema should mention optional `standardPv`.

Applied follow-up:

- Added optional `standardPv` to `schemas/database_pool.seo_v3.yaml` decision
  rows for orphan diagnostics.

## Deferred To Later Milestones

- Cross-agent consistency evaluation remains Milestone 7.
- Export profiles and exportable statuses remain deferred.
- Instance-number representation, section length cap beyond letter-only
  parsing, and stricter SignalName CamelCase remain deferred.
- Rulebook rewrite or full legacy output migration should happen only after
  owner approval of remaining policy decisions.

## Status

Milestone 6 is complete and ready to commit.
