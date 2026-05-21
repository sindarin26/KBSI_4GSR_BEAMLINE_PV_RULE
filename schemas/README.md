# Schemas

Machine-readable schemas live here.

Current file:

- `database_pool.seo_v3.yaml`: informal promoted database-pool contract for
  SEO_V3 source rows, decision overlays, abbreviation records, and the pilot
  review workbench.
- `pv_registry.seo_v2.yaml`: informal active registry contract for the SEO_v2
  generated-output compatibility path.
- `review_decisions.seo_v2.yaml`: informal JSON row contract for human review
  decisions saved by `scripts/review_server.js`.
- `review_queue.seo_v2.yaml`: informal queue contract for
  `outputs/<beamline>/_work/review_queue.json`.
- `pv_review_row.seo_v2.yaml`: shared SEO_v2-style row shape used by review
  queues, human decisions, and read-only fixtures.
- `pv_registry.v0.yaml`: legacy informal v0 registry contract retained for
  historical outputs and migration reference.
