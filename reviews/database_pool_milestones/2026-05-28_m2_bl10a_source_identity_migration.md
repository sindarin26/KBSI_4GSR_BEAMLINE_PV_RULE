# 2026-05-28 M2 BL10A Source Identity Migration Closeout

## Scope

Milestone 2 migrated the active source input identity from `inputs/ID10` to
`inputs/BL10A` while preserving legacy `outputs/ID10` validation.

Included:

- renamed active input source files to `inputs/BL10A/`;
- updated current database-pool and legacy source traces from `inputs/ID10/...`
  to `inputs/BL10A/...`;
- recomputed BL10A database-pool source row `uid` values after the `sourceId`
  rewrite;
- added `source_input_dir: "inputs/BL10A"` to `outputs/ID10/status.yaml`;
- updated legacy validators to resolve source files through `source_input_dir`
  with fallback to `inputs/<beamline>/`;
- updated current user-facing input examples to `inputs/BL10A/`.

Excluded:

- no SEO_v2 output shape migration;
- no importer CLI or workbench import UI work;
- no decision overlay reattachment.

## Review Result

Read-only review reported no blockers and no important issues.

Minor finding fixed in this milestone:

- added `source_input_dir` to the informal SEO_v2 output status schema.

The review also noted that the input rename must be staged as a rename at commit
time. That is a commit hygiene item, not a code change.

## Validation

Passed:

```text
node scripts/validate_registry.js ID10
node scripts/validate_review_queue.js ID10
node scripts/migration_pilot/validate_m4_small_migration.js
node scripts/database_pool_pilot/validate_review_workbench.js
node scripts/validate_database_pool.js
node scripts/validate_workflow_docs.js
node scripts/validate_seo_v2_rules.js
git diff --check
```

Additional spot checks:

- no current checked source path references `inputs/ID10`;
- `outputs/ID10` legacy PV shape remains SEO_v2;
- `database_pool/BL10A/decisions/m4.decisions.json` is empty, so no decision
  overlay was silently reattached during uid recomputation.

## Status

Milestone 2 is complete and ready for commit.
