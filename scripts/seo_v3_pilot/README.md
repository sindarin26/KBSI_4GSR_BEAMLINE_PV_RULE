# SEO_V3 Pilot Scripts

Milestone 1 keeps SEO_V3 contract work isolated from the active SEO_v2 scripts,
fixtures, and schemas.

Run the pilot contract validation with:

```text
node scripts/seo_v3_pilot/validate_contract.js
```

This validates the SEO_V3 grammar, render function, fixture rows, and
`standardPv` component/render invariant using only Node built-ins.
