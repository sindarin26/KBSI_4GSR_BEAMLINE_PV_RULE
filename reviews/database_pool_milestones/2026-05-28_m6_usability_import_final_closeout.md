# 2026-05-28 M6 Usability Import Final Closeout

## Scope

This closeout covers the full usability/import goal in
`notes/2026-05-28_database_pool_usability_import_goal.md`.

Completed milestone commits:

- `3fe0614` - migrated active source input identity from `inputs/ID10` to
  `inputs/BL10A`;
- `859635e` - added preview-first database-pool importer CLI;
- `3c5c136` - added workbench import preview/save controls and endpoints;
- `364e9a5` - added command wrappers and simplified user-facing docs.

Milestone 1 was baseline-only and produced no tracked commit.

## Result

The active database-pool workflow now supports this user path:

```text
inputs/BL10A/
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A --write
./run_database_pool_workbench.sh
./check_database_pool.sh
```

Key outcomes:

- `inputs/BL10A/` is the active source input directory;
- legacy `outputs/ID10` remains in place and validates through
  `source_input_dir: "inputs/BL10A"`;
- database-pool source row identities use deterministic `uid` values derived
  from `poolId`, `sourceId`, and `sourceAnchor`;
- importer preview is read-only;
- importer write creates one source row file per supported input file and
  requires explicit overwrite for existing targets;
- importer-generated rows remain `reviewStatus: "needs_input"`;
- importer source traces use `sourceKind: "database_pool_import"` and preserve
  the original matched source PV token as `sourcePv` and `sourceLabel`;
- workbench import preview/save uses the same importer module as the CLI;
- successful workbench import save returns refreshed shared workbench state;
- README and `scripts/README.md` present the database-pool path first while
  keeping legacy SEO_v2 commands as compatibility commands.

Explicitly not implemented:

- export profiles;
- cross-agent consistency evaluation execution;
- automatic rulebook promotion;
- automatic abbreviation approval;
- dependency installation or Docker packaging;
- recursive input import;
- SEO_v2 output shape migration.

## Review Result

Final read-only subagent review reported:

- no blockers;
- no important findings;
- no minor findings.

The review confirmed:

- no current database-pool source row points at `inputs/ID10`;
- legacy `outputs/ID10/status.yaml` contains `source_input_dir: "inputs/BL10A"`;
- legacy validators use the source directory override;
- importer preview/write semantics, source tracing, and `needs_input` status
  are implemented;
- workbench import endpoints use the CLI importer module;
- wrappers and docs show the simplified database-pool path first;
- M2-M5 closeout files exist.

## Final Validation

Passed:

```text
node scripts/validate_database_pool.js
node scripts/validate_workflow_docs.js
node scripts/validate_seo_v2_rules.js
node scripts/validate_registry.js ID10
node scripts/validate_review_queue.js ID10
node scripts/evaluation_pilot/validate_m7_readiness.js
git diff --check
```

Additional wrapper validation passed during Milestone 5:

```text
./check_database_pool.sh
./check_database_pool.sh --with-http
```

`validate_m7_readiness.js` correctly reports that cross-agent evaluation is not
ready yet because approved device/subdevice abbreviations and evaluation-ready
approved rows are not stable. That is expected and outside this goal.

## Status

The usability/import goal is complete. The branch is ready to push.
