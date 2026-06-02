# Abbreviation Registry Scripts

These scripts validate the SEO_V3 abbreviation/code review registry without
promoting candidate device or subdevice codes into active policy.

The source-of-truth registry is:

```text
database_pool/abbreviations/registry.json
```

Run the aggregate database-pool validation with:

```text
node scripts/validate_database_pool.js
```

This checks registry kind/status constraints, candidate-code gating, explicit
source/rationale fields, and current usage evidence. There is no separate
standalone abbreviation validator after the 2026-06-02 hard-reset alignment.
