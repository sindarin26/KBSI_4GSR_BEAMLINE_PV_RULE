# Document-First Distribution Strategy

Date: 2026-05-12
Status: decision context, not an active rulebook

This record documents the current plan for distributing beamline PV naming work
while the final PV string structure is still under discussion.

If this decision record conflicts with an active rulebook, the active rulebook
wins.

## Decision

Use a document-first distribution strategy for now.

The repository should still be completed as a v0 PV naming rule kit, but the
human-facing standard can be distributed as a simpler document before the final
agent rulebooks are considered stable.

## Rationale

The final PV naming structure is not fixed yet.

Two directions are being compared:

```text
BLP-10A:WBSLT-SLIT:Hgap
```

and:

```text
ID10:OH:WBSLT01:hgap
```

The first direction is closer to the accelerator-side 3-tier naming style. The
second direction is the current beamline-local 4-tier v0 rulebook style.

The 3-tier document style is easier to distribute and explain. It also has a
clear `DEV`/`SUBDEV` distinction that is useful for human review. The 4-tier
rulebook style more directly supports beamline operation by keeping `PTL`,
`FE`, `OH`, and `EH` as an explicit area tier.

The underlying workflow remains useful in either case:

```text
inputs -> raw extraction -> registry -> reference -> self-review -> review
```

Therefore, the repository should preserve the agent workflow and traceability
rules while the human-facing naming standard is still being reviewed.

## Repository Policy

- Human-facing naming standards and candidates belong under `standards/`.
- Active agent rulebooks remain under `rules/draft/` and `rules/review/`.
- Decision rationale remains under `rules/decisions/`.
- Candidate standards are not active rules until promoted into the active
  rulebooks, schemas, and examples.
- `temp/` remains local scratch and must not be treated as a distributed rule
  source.

## Current Active State

The current active v0 rulebooks still use:

```text
ID10:{Area}:{Device}:{AxisOrFunction}
```

This remains active until the project owner explicitly promotes a different
structure.

## Related Document

See:

```text
standards/candidates/2026-05-12_tier_structure_options.md
```

