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

The pilot validator also understands explicit pattern records for in-memory
tests and future reviewed registry entries. Pattern syntax is deliberately
small: `codePattern` is not a regex, `#` matches exactly one ASCII digit,
matching is full-string only, and `baseCode` must equal the literal prefix
before the first `#`. Durable pattern entries must carry the normal
`source`, `rationale`, and `usageEvidence` review fields before they can be
accepted by the strict registry validator.
