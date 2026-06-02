# Current Data Pipeline

Status: planning artifact, not an active rulebook, schema, or naming policy.

This file describes the current data-processing pipeline as observed on
2026-06-02 after the SEO_v2 / v0 hard-reset alignment.

## SEO_V3 Database-Pool Pipeline

```mermaid
flowchart TD
  A[inputs/<pool_id>/ source files] --> B{conversion path}
  B --> C[mechanical importer\nscripts/import_database_pool.js]
  B --> D[agent conversion\nDATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md]
  C --> E[database_pool/<pool_id>/sources/*.rows.json]
  D --> E
  E --> F[review_server.js database-pool mode]
  G[database_pool/<pool_id>/decisions/*.decisions.json] --> F
  H[database_pool/abbreviations/registry.json\nread-only] --> F
  F --> I[merged review rows in browser]
  I --> J[database_pool/<pool_id>/decisions/workbench.decisions.json]
  J --> F
```

The hard reset cleared previously imported pilot rows and decisions; the
pipeline above is in place but the database pools are empty until re-import
or agent conversion runs.

## Mechanical Importer

`scripts/import_database_pool.js` delegates to
`scripts/database_pool_pilot/importer.js`.

Current behavior:

- scans supported file extensions under the input directory;
- extracts PV-like tokens with regular expressions;
- maps source device/signal tokens through fixed mapping rules;
- writes `needs_input` source rows when invoked with `--write`;
- records `sourceTrace.sourceKind: "database_pool_import"`;
- marks rows as aggressive inference requiring human review.

This path is not natural-language understanding. It is intentionally separate
from agent-mediated conversion.

## Agent-Mediated Conversion

For source material that the importer cannot parse safely, agents use:

```text
rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md
```

Current required behavior:

- read source material under `inputs/<pool_id>/`;
- preserve `poolId`, `sourceId`, `sourceAnchor`, and `uid`;
- set `sourceTrace.sourceKind: "agent_input_conversion"`;
- default interpreted rows to `reviewStatus: "needs_input"`;
- keep uncertain abbreviations and assumptions reviewable.

This procedure exists, but there is no separate automated natural-language
importer command.

## Database-Pool Review Server

`scripts/review_server.js --database-pool <pool_id> --port 8212` currently:

- loads explicit database pools (positional beamline arguments were removed
  in the hard reset);
- reads `sources/*.rows.json`;
- reads `decisions/*.decisions.json`;
- gives `workbench.decisions.json` effective overlay precedence;
- merges source rows and decision overlays by `uid`;
- computes orphan decisions and duplicate approved `standardPv` conflicts;
- loads the abbreviation registry as read-only input;
- computes abbreviation issues for database-pool rows;
- adapts SEO_V3 rows to the review table UI;
- saves changed decisions to
  `database_pool/<pool_id>/decisions/workbench.decisions.json`.

The server is a review surface. It does not rewrite source rows.

## Abbreviation Data

Current abbreviation review data lives at:

```text
database_pool/abbreviations/registry.json
```

The registry is machine-readable and validated by database-pool checks. It is
currently read-only from the browser review server. Dedicated abbreviation
edit behavior is deferred.

## Validation

Current documentation and workflow validation:

```text
node scripts/validate_workflow_docs.js
git diff --check
```

Current aggregate database-pool validation:

```text
node scripts/validate_database_pool.js
```

The current aggregate validator does not start the browser server. Use
`node --check scripts/review_server.js` for syntax validation and launch
`scripts/review_server.js --database-pool <pool_id> --port 8212` manually when
an HTTP smoke check is needed.

## Removed Legacy Pipelines

The previous SEO_v2 generated-output pipeline
(`outputs/<beamline>/pv_registry.yaml`, `PV_REFERENCE.md`,
`_work/review_queue.json`, related validators/renderers) was removed during the
hard reset. Re-introducing a parallel non-SEO_V3 pipeline is a non-goal.
