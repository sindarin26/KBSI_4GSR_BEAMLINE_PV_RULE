# 2026-06-01 Review Workbench Unification Closeout

## Scope

This closeout covers the full goal in
`notes/2026-06-01_review_workbench_unification_goal.md`.

The goal supersedes the separate 8775 database-pool workbench introduced by the
2026-05-21 M5 review-workbench milestone. Historical closeouts under
`reviews/database_pool_milestones/` remain as history; the active
database-pool review entry point is now the unified 8765 review server.

## Result

The repository now has one review UI entry point:

```text
node scripts/review_server.js <beamline> --port 8765
node scripts/review_server.js --database-pool <pool_id> --port 8765
```

Database-pool mode supports repeated explicit `--database-pool <pool_id>` flags
in one process. The server does not auto-discover pools; the wrapper performs
that convenience scan and passes explicit flags:

```text
./run_database_pool_workbench.sh
./run_database_pool_workbench.sh BL10A 4GSR_Beamline_PV_Naming_Standard_v1.0
```

Key outcomes:

- legacy SEO_v2 review remains on `scripts/review_server.js <beamline>`;
- database-pool review uses the same 8765 server with a mode adapter;
- mixed legacy/database-pool invocation is rejected;
- multi-pool rows preserve `poolId`;
- source rows under `database_pool/<pool_id>/sources/*.rows.json` remain
  read-only from the server;
- database-pool saves write only changed row decisions to
  `database_pool/<pool_id>/decisions/workbench.decisions.json`;
- save routing validates row ownership by `poolId` and `uid`;
- surfaced orphan decisions can be preserved without attaching to another row;
- `workbench.decisions.json` has precedence over curated decision files and
  winning rows expose `decisionSource`;
- database-pool mode hides legacy seed/fixed UI vocabulary;
- the old 8775 files are retained only as non-running deprecation shims;
- README, scripts README, architecture docs, schema, wrapper, and importer-goal
  references now point at the 8765 database-pool form.

Explicitly not implemented:

- export profiles;
- cross-agent consistency evaluation execution;
- automatic rulebook promotion;
- automatic abbreviation approval;
- UI redesign or new frontend framework;
- database server or live collaboration backend;
- `useAsExample`, `locked`, or `exampleRole` metadata;
- `inputs/ID10` to `inputs/BL10A` migration.

## Changed Files

```text
ARCHITECTURE.md
README.md
run_database_pool_workbench.sh
schemas/database_pool.seo_v3.yaml
scripts/README.md
scripts/database_pool_pilot/README.md
scripts/database_pool_pilot/review_workbench.js
scripts/database_pool_pilot/validate_review_workbench.js
scripts/evaluation_pilot/validate_m7_readiness.js
scripts/review_server.js
scripts/review_server_pilot/validate_database_pool_mode.js
scripts/validate_database_pool.js
scripts/validate_workflow_docs.js
reviews/database_pool_milestones/2026-06-01_unification_review_workbench.md
```

## Gate Outcomes

- M1 Goal Note And Baseline: passed baseline validations; read-only review
  found no blocker or important issue.
- M2 Backend Mode Split: implemented CLI mode split and database-pool state
  loading. Review found decision `poolId` overwrite and missing abbreviation
  registry handling; both were fixed and re-reviewed cleanly.
- M3 UI Adapter And Database-Pool Save: implemented database-pool save routing,
  ownership validation, orphan preservation, and database-pool UI adaptation.
  Reviews found forged cross-pool save and orphan-save issues; both were fixed.
  A static hidden-seed-label minor was also fixed.
- M4 8765 Database-Pool Validator: added the 8765 database-pool validator and
  aggregate validation registration. Reviews found insufficient file-protection
  coverage and dirty-save coverage; both were fixed and re-reviewed cleanly.
- M5 Retire 8775 Line And Realign Docs: rewired wrapper/docs/schema to the
  unified 8765 contract and replaced old 8775 files with shims. Review found
  an abbreviation registry save-target wording issue and two minors; all were
  fixed and re-reviewed cleanly.
- M6 Final Closeout And Commit: final whole-diff review found two important
  closeout/schema issues. The schema UI contract was reduced to the actual
  8765 adapter surface, and this closeout was updated with final review and
  validation evidence.

## Validation Evidence

Passed during this goal:

```text
node --check scripts/review_server.js
node --check scripts/review_server_pilot/validate_database_pool_mode.js
node --check scripts/validate_database_pool.js
node --check scripts/evaluation_pilot/validate_m7_readiness.js
node scripts/validate_database_pool.js
node scripts/validate_database_pool.js --with-http
node scripts/validate_workflow_docs.js
node scripts/validate_seo_v2_rules.js
node scripts/validate_registry.js ID10
node scripts/validate_review_queue.js ID10
node scripts/evaluation_pilot/validate_m7_readiness.js
node scripts/review_server_pilot/validate_database_pool_mode.js
git diff --check
```

The HTTP/database-pool validations create temporary fixtures and local HTTP
servers, so they were run outside the read-only sandbox.

## Final Review

Final whole-diff read-only review found:

- Important: `schemas/database_pool.seo_v3.yaml` still advertised the retired
  8775-style `Conflicts` and `Abbreviations` tabs plus extra filters not
  present in the 8765 adapter. Resolved by limiting the schema workbench
  surface to current 8765 tabs/filters and moving richer UI items to deferred
  UI.
- Important: this closeout still had draft/pending wording and incomplete
  validation evidence. Resolved in this closeout update.

No blocker was reported.

## Deferred Items

No blocker or important issue is deferred.

Deferred work remains outside this goal:

- importer scope from `notes/2026-05-28_database_pool_usability_import_goal.md`;
- export profiles;
- cross-agent evaluation execution;
- automatic abbreviation approval/editing workflow;
- active rulebook promotion;
- BL10A input identity migration;
- richer example metadata and locking.

## Commit And Status

Commit hash: pending until after commit. The exact hash cannot be embedded in
the committed file without changing the commit content; it will be reported in
the final assistant response.

Pre-commit status: final validation passed; final re-review passed with no
blocker or important finding remaining.
