# Database Pool Pilot Scripts

Milestones 2 and 5 keep database-pool data-layer and review workbench behavior
isolated from active SEO_v2 registry generation and review tooling.

Run the data-layer pilot validation with:

```text
node scripts/database_pool_pilot/validate_data_layer.js
```

This validates deterministic `uid` generation, source row plus decision overlay
merge behavior, orphan handling, duplicate `standardPv` conflict detection, and
source row immutability.

Run the review workbench validation with:

```text
node scripts/database_pool_pilot/validate_review_workbench.js
```

This validates the shared runtime model used by all tabs, filters, row decision
overlay writes, abbreviation registry writes, computed pending/conflict buckets,
and bulk approval gating.

Start the pilot workbench with:

```text
node scripts/database_pool_pilot/review_workbench.js --port 8775
```

The server loads `database_pool/` entries and the pilot abbreviation registry,
then serves the review UI at `http://127.0.0.1:8775/`.

## Manual Reload Workflow

The workbench is file-backed and intentionally uses manual reloads. The server
re-reads `database_pool/` rows, decision overlays, and the pilot abbreviation
registry on every `GET /api/state` request. If a terminal command, MCP-style
agent, or another tool edits those files while the browser is open, click
`Reload` before continuing review in the browser.

This is not a real-time collaboration model. There is no WebSocket, file
watcher, polling refresh, or stale-save conflict guard. If an external edit is
made, reload first, then continue editing.

Read current state:

```text
curl -s http://127.0.0.1:8775/api/state
```

Save one row decision:

```text
curl -s -X POST http://127.0.0.1:8775/api/row-decision \
  -H 'Content-Type: application/json' \
  -d '{"uid":"pvrow_example","reviewStatus":"approved","reviewNote":"Reviewed externally."}'
```

Save one abbreviation decision:

```text
curl -s -X POST http://127.0.0.1:8775/api/abbreviation \
  -H 'Content-Type: application/json' \
  -d '{"kind":"device","code":"MONO","scope":"global","status":"approved","meaning":"Monochromator"}'
```

These APIs update review decisions or abbreviation registry entries and then
return freshly loaded state. They do not require or imply automatic browser
refresh; use `Reload` to update an already-open browser view.
