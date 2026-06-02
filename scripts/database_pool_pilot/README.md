# Database Pool Pilot Scripts

These helpers support the active SEO_V3 database-pool workflow.

Run the aggregate database-pool validation with:

```text
node scripts/validate_database_pool.js
```

This validates deterministic `uid` generation, source row plus decision overlay
merge behavior, orphan handling, duplicate `standardPv` conflict detection, and
source row immutability through the shared database-pool modules.

Check the browser workbench script syntax with:

```text
node --check scripts/review_server.js
```

The old standalone pilot validators were removed during the 2026-06-02
hard-reset alignment. Use the aggregate validation plus a manual HTTP smoke
check when changing server behavior.

Start the database-pool review workbench with:

```text
node scripts/review_server.js --database-pool BL10A --port 8212
```

or use the wrapper:

```text
./run_database_pool_workbench.sh
./run_database_pool_workbench.sh BL10A 4GSR_Beamline_PV_Naming_Standard_v1.0
```

With no positional pool IDs, the wrapper scans `database_pool/*/manifest.yaml`
and launches the unified review UI at `http://127.0.0.1:8212/`.

## Manual Reload Workflow

The workbench is file-backed and intentionally uses manual reloads. The server
re-reads `database_pool/` rows, decision overlays, and
`database_pool/abbreviations/registry.json` on every `GET /api/state` request.
If a terminal command, MCP-style agent, or another tool edits those files while
the browser is open, click `Reload` before continuing review in the browser.

This is not a real-time collaboration model. There is no WebSocket, file
watcher, polling refresh, or stale-save conflict guard. If an external edit is
made, reload first, then continue editing.

Read current state:

```text
curl -s http://127.0.0.1:8212/api/state
```

Save reviewed row decisions through the browser Save action. Database-pool mode
writes only changed rows to:

```text
database_pool/<pool_id>/decisions/workbench.decisions.json
```

Source row files under `database_pool/<pool_id>/sources/*.rows.json` are
read-only from the server. Abbreviation editing remains a later workflow; this
mode displays the abbreviation registry but does not silently approve or rewrite
abbreviations.
