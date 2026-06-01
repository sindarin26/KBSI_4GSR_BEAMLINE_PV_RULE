# Database Pool Pilot Scripts

Milestones 2 and 5 keep database-pool data-layer behavior isolated from active
SEO_v2 registry generation and review tooling.

Run the data-layer pilot validation with:

```text
node scripts/database_pool_pilot/validate_data_layer.js
```

This validates deterministic `uid` generation, source row plus decision overlay
merge behavior, orphan handling, duplicate `standardPv` conflict detection, and
source row immutability.

Run the unified 8765 review workbench validation with:

```text
node scripts/review_server_pilot/validate_database_pool_mode.js
```

This validates the database-pool mode of `scripts/review_server.js`, including
multi-pool loading, `workbench.decisions.json` writes, decision precedence,
source row immutability, orphan preservation, abbreviation registry display,
and computed pending/conflict buckets.

Start the database-pool review workbench with:

```text
node scripts/review_server.js --database-pool BL10A --port 8765
```

or use the wrapper:

```text
./run_database_pool_workbench.sh
./run_database_pool_workbench.sh BL10A 4GSR_Beamline_PV_Naming_Standard_v1.0
```

With no positional pool IDs, the wrapper scans `database_pool/*/manifest.yaml`
and launches the unified review UI at `http://127.0.0.1:8765/`.

`scripts/database_pool_pilot/review_workbench.js` and
`scripts/database_pool_pilot/validate_review_workbench.js` are retained only as
non-running deprecation shims.

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
curl -s http://127.0.0.1:8765/api/state
```

Save reviewed row decisions through the browser Save action. Database-pool mode
writes only changed rows to:

```text
database_pool/<pool_id>/decisions/workbench.decisions.json
```

Source row files under `database_pool/<pool_id>/sources/*.rows.json` are
read-only from the server. Abbreviation editing remains a later workflow; this
mode displays the pilot registry but does not silently approve or rewrite
abbreviations.
