# 2026-05-28 M4 Workbench Import UI Closeout

## Scope

Milestone 4 connected the database-pool importer to the review workbench.

Included:

- added `POST /api/import-preview`;
- added `POST /api/import-save`;
- routed both endpoints through the same importer module used by
  `scripts/import_database_pool.js`;
- kept preview read-only;
- kept save writes gated through the importer write path and overwrite guard;
- returned import summary plus refreshed workbench state after successful save;
- surfaced saved imported rows immediately in the shared workbench state;
- kept imported rows at `reviewStatus: "needs_input"`;
- added visible import controls for input directory, pool ID, overwrite,
  preview, and save;
- added validation coverage for direct workbench import calls and HTTP import
  endpoints.

Excluded:

- no export profiles;
- no rulebook promotion;
- no automatic abbreviation approval;
- no registry mutation during import;
- no SEO_v2 output shape migration;
- no recursive input import;
- no dependency changes.

## Review Result

Initial read-only subagent review reported no blockers and one important issue:

- new-pool scaffold manifests used `status: imported`, which was outside the
  database-pool manifest contract.

Fixes applied:

- new import-created pool manifests now use `status: pilot`;
- restricted `--pools` save responses include the newly imported pool in the
  refreshed state;
- import controls now have visible labels for input directory and pool ID.

Follow-up read-only subagent review reported:

- no blockers;
- no important findings.

Remaining minor note:

- when the server starts with restricted `--pools`, a successful import into a
  new pool appears in the save response state, but a later browser Reload uses
  the original restricted runtime pool list. This does not block M4 because the
  milestone requires save-time refresh; persistent runtime pool-list mutation
  can be handled separately if restricted-pool operation becomes a normal user
  workflow.

## Validation

Passed:

```text
node --check scripts/database_pool_pilot/review_workbench.js
node --check scripts/database_pool_pilot/validate_review_workbench.js
node --check scripts/database_pool_pilot/importer.js
node scripts/database_pool_pilot/validate_review_workbench.js
node scripts/database_pool_pilot/validate_review_workbench.js --with-http
node scripts/validate_database_pool.js
git diff --check
```

Validation covers:

- import preview/save direct helper behavior;
- HTTP import preview/save behavior;
- overwrite failure on repeated save without overwrite;
- refreshed state after import save;
- newly created pool visibility in restricted state responses;
- imported rows remaining `needs_input`;
- no registry mutation or automatic abbreviation approval.

## Status

Milestone 4 is complete and ready for commit. The next milestone is Milestone 5:
Command Wrappers And Usability Cleanup.
