# Abbreviation Registry Pilot Scripts

Milestone 3 validates the SEO_V3 abbreviation/code registry without promoting
candidate device or subdevice codes into active policy.

Run the pilot registry validation with:

```text
node scripts/abbreviation_registry_pilot/validate_abbreviations.js
```

This checks registry kind/status constraints, the initial SEO_V3 Markdown status
policy, candidate-code gating, and source-row separation.
