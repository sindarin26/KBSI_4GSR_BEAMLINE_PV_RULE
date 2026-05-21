# Evaluation Pilot Scripts

Milestone 7 checks whether the repository has enough approved SEO_V3 evidence
to start cross-agent consistency evaluation.

Run:

```text
node scripts/evaluation_pilot/validate_m7_readiness.js
```

The readiness check intentionally refuses to build held-out expected outputs
until the database-pool workflow contains enough source-backed approved rows and
approved abbreviation records. This prevents candidate device/subdevice tokens
from being treated as final answer keys.

When readiness passes in a later milestone, the next evaluation step should
create a small held-out list with:

- source text or source row reference;
- expected SEO_V3 `standardPv`;
- justification from approved rows, abbreviation records, and rules;
- disagreement routing to `exceptions/` or `proposals/`.
