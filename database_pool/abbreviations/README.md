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
