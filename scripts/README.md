# Scripts

These scripts are internal workbench entry points. They validate or render data
from the active rulebooks and schemas, but they do not define naming policy.

Use:

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A --write
node scripts/database_pool_pilot/review_workbench.js --port 8775
node scripts/validate_database_pool.js
node scripts/validate_database_pool.js --with-http
./run_database_pool_workbench.sh
./check_database_pool.sh
node scripts/validate_seo_v2_rules.js
node scripts/validate_registry.js ID10
node scripts/render_reference.js ID10 --check
node scripts/render_reference.js ID10 --write
node scripts/build_review_queue.js ID10
node scripts/validate_review_queue.js ID10
node scripts/review_server.js ID10 --port 8765
node scripts/apply_decisions.js ID10
node scripts/apply_decisions.js ID10 --write
node scripts/import_seo_review_decisions.js
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

`database_pool_pilot/review_workbench.js` starts the browser review workbench.
The workbench can preview/save imports through the same importer module used by
the CLI.

```text
node scripts/database_pool_pilot/review_workbench.js --port 8775
```

The repo-root wrappers provide the normal user-facing commands:

```text
./run_database_pool_workbench.sh
./run_database_pool_workbench.sh 8775
HOST=0.0.0.0 ./run_database_pool_workbench.sh 8775
./check_database_pool.sh
./check_database_pool.sh --with-http
```

`validate_database_pool.js` runs the full database-pool validation suite:

```text
node scripts/validate_database_pool.js
```

## Legacy SEO_v2 Workflow

`validate_seo_v2_rules.js` checks the promoted SEO_v2 source package, active
rulebook shape, schema presence, examples, and known DB duplicate tracking.

`validate_registry.js <beamline>` checks a generated output directory:

- `rulebook_version: SEO_v2`
- SEO_v2 PV regex
- structured field reconstruction
- accepted area/device/subdevice/status values from
  `schemas/pv_registry.seo_v2.yaml`
- duplicate PVs
- required `source_trace`
- raw extraction coverage against registry, exceptions, and skipped rows
- `PV_REFERENCE.md` PV set against `pv_registry.yaml`
- `outputs/<beamline>/status.yaml` consistency when present; current generated
  outputs should include it

`render_reference.js <beamline> --write` regenerates the Markdown reference from
the registry. Use `--check` in validation gates.

`build_review_queue.js <beamline>` creates
`outputs/<beamline>/_work/review_queue.json` and per-source
`outputs/<beamline>/_work/source_lists/*.rows.json` files. These rows use the
same SEO_v2-style JSON row shape as the historical DB. `validate_review_queue.js`
checks row shape, source trace coverage, uniqueness, and source-label
extraction-mode values.

`review_server.js <beamline>` starts a local browser review UI. It reads
`outputs/<beamline>/_work/review_queue.json` first, falling back to
`raw_extracted_pvs.yaml`, `pv_registry.yaml`, and exception frontmatter while
the queue migration is in progress. It also displays the read-only historical
fixture at `fixtures/SEO_v2/review_decisions.json` for comparison.

The review UI saves SEO-DB-like JSON row arrays:

- `reviews/<beamline>/review_decisions.json`
- `reviews/<beamline>/accepted_decisions.json`
- `reviews/<beamline>/fixed_decisions.json`

These decision files are data inputs for later dataset updates; the browser UI
itself is not a canonical naming policy source. Beamline saves must not rewrite
fixture comparison rows.

`apply_decisions.js <beamline>` promotes accepted/fixed beamline decision rows
into `outputs/<beamline>/pv_registry.yaml`. It requires rawId, sourceId, and
sourceAnchor before applying a row, and it uses the existing registry, raw
extraction, or status beamline value rather than inventing one from the
directory name.

`import_seo_review_decisions.js` converts the historical SEO_v2 DB JSON row
array into `fixtures/SEO_v2/review_decisions.json`. This file is a read-only
comparison fixture and reusable decision example, not an active rulebook and not
a human review output.

Bad usage prints a `Usage:` line and exits non-zero. Missing required workbench
files are reported as `FAIL:` messages so validation output remains actionable.
