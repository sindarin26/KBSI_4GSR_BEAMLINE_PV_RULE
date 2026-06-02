# SEO_V3 Pilot Scripts

This directory contains shared SEO_V3 contract helpers used by the
database-pool workflow.

Run the aggregate database-pool validation with:

```text
node scripts/validate_database_pool.js
```

The old standalone pilot contract validator was removed during the 2026-06-02
hard-reset alignment. Contract checks now run through the active database-pool
validation path.
