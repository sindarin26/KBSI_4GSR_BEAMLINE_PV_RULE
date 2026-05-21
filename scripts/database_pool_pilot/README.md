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
