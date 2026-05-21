# Database Pool Pilot Scripts

Milestone 2 keeps database-pool data-layer work isolated from active SEO_v2
registry generation and review tooling.

Run the data-layer pilot validation with:

```text
node scripts/database_pool_pilot/validate_data_layer.js
```

This validates deterministic `uid` generation, source row plus decision overlay
merge behavior, orphan handling, duplicate `standardPv` conflict detection, and
source row immutability.
