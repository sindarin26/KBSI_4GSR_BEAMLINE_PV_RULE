# Scripts

These scripts are internal workbench entry points for the SEO_V3 database-pool
workflow. They validate or render data from the active rulebooks and schemas,
but they do not define naming policy.

Use:

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A --write
node scripts/review_server.js --database-pool BL10A --port 8212
node scripts/validate_database_pool.js
./run_database_pool_workbench.sh
./check_database_pool.sh
```

## Database-Pool Workflow

`import_database_pool.js` scans supported source files directly under an input
directory and converts PV-like source tokens into review-required SEO_V3
database-pool rows.

Preview is the default and does not write files:

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
```

Use `--write` to create one source-row file per supported input file under
`database_pool/<poolId>/sources/`. If a target file exists, the importer fails
unless `--overwrite` is supplied.

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A --write
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A --write --overwrite
```

Imported rows always start as `reviewStatus: "needs_input"`. The importer must
not approve rows, update abbreviation registry entries, or promote rules.

SEO_V3 abbreviation review records live in:

```text
database_pool/abbreviations/registry.json
```

The registry records explicit source, status, rationale, and usage evidence.
Candidate codes still block silent approval.

`review_server.js` starts the browser review workbench. It loads explicit
pools with repeated `--database-pool` flags and writes human decision overlays
to `database_pool/<pool_id>/decisions/workbench.decisions.json`. Source rows
are read-only from the server.

```text
node scripts/review_server.js --database-pool BL10A --port 8212
node scripts/review_server.js --database-pool BL10A --database-pool 4GSR_Beamline_PV_Naming_Standard_v1.0 --port 8212
```

The repo-root wrappers provide the normal user-facing commands:

```text
./run_database_pool_workbench.sh
./run_database_pool_workbench.sh BL10A
./run_database_pool_workbench.sh BL10A 4GSR_Beamline_PV_Naming_Standard_v1.0
PORT=8212 HOST=0.0.0.0 ./run_database_pool_workbench.sh BL10A
./check_database_pool.sh
```

`validate_database_pool.js` runs the full database-pool validation suite:

```text
node scripts/validate_database_pool.js
```

Bad usage prints a `Usage:` line and exits non-zero. Missing required
workbench files are reported as `FAIL:` messages so validation output remains
actionable.
