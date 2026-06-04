# SEO_V3 Abbreviation Review Registry

Status: source-of-truth data area for abbreviation review records, not an
active prose rulebook.

`registry.json` records SEO_V3 section, port, area, device, and subdevice
abbreviations with explicit review status.

Each entry must carry:

- `source`: tracked source evidence for the code definition;
- `status`: `candidate`, `approved`, `deprecated`, or `rejected`;
- `rationale`: why the current status is valid;
- `usageEvidence`: source-list evidence plus current row-usage count/examples.

Candidate entries remain review-required. They must not allow silent row
approval or cross-agent expected-output generation.

Future PV approval behavior may use this registry to decide whether a row is
approval-eligible. That behavior must remain review-gated: candidate
abbreviations can receive usage evidence from approved rows, but ambiguous
code, meaning, or scope matches must require explicit review before any global
abbreviation promotion.

## Derived Issue Resolution Direction

Abbreviation issues should be derived from source-row components and this
registry, not stored as durable source-row fields. A confirmed abbreviation
resolves all derived row issues with the same resolution key when the issue set
is recomputed.

The current exact-code key is:

```text
abbreviation:<scope>:<kind>:<code>
```

Meaning-aware review should prefer:

```text
abbreviation:<scope>:<kind>:<code>:<sourceTerm>
```

Pattern-derived codes such as `SLIT01` should use an explicit pattern approval
before the pattern clears issues:

```text
abbreviation-pattern:<scope>:<kind>:SLIT##:<meaning>
```

Approving a base code such as `SLIT` must not silently approve every numbered
instance such as `SLIT01` unless the registry also records an approved pattern.

This direction is tracked by
`proposals/rule_changes/PROP-0002-abbreviation-issue-resolution-contract.md`.
