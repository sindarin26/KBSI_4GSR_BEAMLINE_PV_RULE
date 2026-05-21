# 2026-05-21 M2 Data Layer Pilot Closeout

## Scope

Milestone 2 implemented the database-pool data-layer pilot after the
architecture boundary update allowed tracked `database_pool/` pilot paths.

Included:

- pilot pool fixture under `database_pool/seo_v3_m2_pilot/`;
- manifest, source row, and decision overlay files;
- deterministic `uid` generation from `poolId`, `sourceId`, and
  `sourceAnchor`;
- source row plus decision overlay merge logic;
- orphan handling;
- duplicate `standardPv` computed conflict detection;
- source row immutability checks.

Excluded:

- no UI work;
- no ID10 to BL10A migration;
- no active SEO_v2 schema or rulebook rewrite;
- no abbreviation registry gating;
- no Review-tab `pending` behavior.

## Deliverables

- `database_pool/seo_v3_m2_pilot/manifest.yaml`
- `database_pool/seo_v3_m2_pilot/sources/m2.rows.json`
- `database_pool/seo_v3_m2_pilot/decisions/m2.decisions.json`
- `scripts/database_pool_pilot/database_pool.js`
- `scripts/database_pool_pilot/validate_data_layer.js`
- `scripts/database_pool_pilot/README.md`

## Validation

Passed:

```text
node scripts/database_pool_pilot/validate_data_layer.js
node --check scripts/database_pool_pilot/database_pool.js
node --check scripts/database_pool_pilot/validate_data_layer.js
node scripts/seo_v3_pilot/validate_contract.js
node scripts/validate_seo_v2_rules.js
git diff --check
git diff --cached --check
```

The data-layer validation covers:

- manifest/source/decision fixture loading;
- source row SEO_V3 validation and deterministic `uid` checks;
- matching decision overlay by `uid`;
- source-only row visibility as `needs_input`;
- decision-only row conversion to `orphan`;
- stable `uid` on re-ingest with the same source identity;
- changed source identity not stealing old decisions;
- duplicate `standardPv` across accepted/approved rows as a computed conflict;
- decision edits not rewriting source row files.

## Read-Only Review

Subagent review found:

- Blocker: none.
- Important: none.
- Minor: none.

Reviewer conclusion:

- M2 can close. No implementation fixes are required.

## Deferred To Later Milestones

- Abbreviation registry status and candidate-code gating: Milestone 3.
- Small source migration/import from SEO_V3 and BL10A materials: Milestone 4.
- Review UI shared model, `pending`, and bulk approval: Milestone 5.
- Promotion into active architecture, schemas, validators, and rulebooks:
  Milestone 6.

## Status

Milestone 2 is complete and ready to commit.
