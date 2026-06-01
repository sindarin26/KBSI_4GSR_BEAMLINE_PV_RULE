# Database-Pool Input Conversion Rulebook

Status: active agent procedure for SEO_V3 database-pool drafting
Scope: agent-mediated conversion from `inputs/<pool_id>/` source material to
reviewable `database_pool/<pool_id>/` rows

## Purpose

This procedure tells Draft agents how to convert natural-language,
semi-structured, or otherwise importer-unfriendly source material from
`inputs/` into SEO_V3 database-pool source rows.

It does not replace the active PV naming rulebook, schemas, or human review. It
exists so agents do not forget the conversion contract when source input is not
already a machine-readable PV list.

## When To Use

Use this procedure when the user asks an agent to turn source material under
`inputs/<pool_id>/` into reviewable database-pool rows under:

```text
database_pool/<pool_id>/manifest.yaml
database_pool/<pool_id>/sources/*.rows.json
```

This path is appropriate for beamline manager notes, motor inventories, device
lists, vendor signal notes, or other source material that the current importer
cannot parse safely.

The importer remains a separate tool for PV-like token extraction. Do not change
importer behavior as part of following this procedure.

## Source Authority

Treat files under `inputs/` as source evidence and traceable facts, not active
naming policy. Use this authority order:

1. `AGENTS.md` and `ARCHITECTURE.md` for workflow constraints;
2. active rulebooks under `rules/draft/` and `rules/review/` for naming and
   review rules;
3. promoted schemas and examples for machine-checkable shape and examples;
4. explicit user decisions.

If source material conflicts with active rules, preserve the conflict in row
notes, review reports, exceptions, or proposals. Do not silently invent policy.

## Required Traceability

Every generated row must preserve enough source identity for a reviewer to find
the original evidence.

Required row-level fields include:

```text
uid
poolId
sourceId
sourceAnchor
sourceTrace.sourceId
sourceTrace.sourceAnchor
sourceTrace.sourceLine
sourceTrace.sourceKind
sourceTrace.sourceLabel
```

`uid` must follow the repository's deterministic database-pool identity rule
over `poolId`, `sourceId`, and `sourceAnchor`; it must not be a hand-written
free identifier.

Use `sourceId` for the repo-relative input file path, such as:

```text
inputs/BL9ASIM/eh_inventory.md
```

Use `sourceAnchor` to identify the exact source location. Prefer stable anchors
such as `line:<N>`, `line:<N>#item:<M>`, Markdown heading paths, or structured
object paths when available.

Use `sourceTrace.sourceLine` for the best available 1-based source line number.
For structured input without an exact line, use the closest source line that
anchors the item and keep the structured path in `sourceAnchor`.

Use `sourceTrace.sourceKind: "agent_input_conversion"` for rows created by
agent interpretation of source material.

Use `sourceTrace.sourceLabel` for the shortest source-backed label or phrase
that identifies the original item, such as the source PV token, motor label,
device name, or quoted equipment phrase.

## Row Status

Rows produced from agent interpretation must not be silently approved.

Default to:

```json
"reviewStatus": "needs_input"
```

Use a more advanced status only when the conversion is purely mechanical from an
already approved source and the active database-pool rules support that move.
If in doubt, keep `needs_input`.

## Abbreviations

Unknown or newly proposed abbreviations must remain candidate or
review-required. Do not promote abbreviations to approved status merely because
an agent inferred them.

When a device, subdevice, or signal abbreviation is uncertain, keep the row
reviewable and record the uncertainty in `note`, `metadata`, an exception, or a
proposal. The row should expose the question instead of hiding it behind a
plausible-looking abbreviation.

## Ambiguity Handling

Record ambiguity instead of resolving it silently when the source does not
clearly determine:

- area;
- device;
- subdevice;
- signal name;
- axis semantics;
- instance numbering;
- coordinate convention;
- vendor or third-party IOC mapping.

Use exceptions or proposals when the active rules cannot represent the source
case cleanly.

Third-party IOC names that contain extra colon tiers, vendor-provided PV shapes,
or externally maintained naming conventions are discussion cases. Preserve the
source name and record whether the project should wrap, adapt, or carry an
exception for the vendor shape. Do not rewrite vendor naming policy without an
explicit user decision.

## SEO_V3 Row Shape

Database-pool rows use the promoted SEO_V3 rendered shape:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

The stored component fields are:

```text
section
port
area
device
subdevice
signal
standardPv
```

`standardPv` is a derived render of the component fields. If stored, it must
match the rendered value.

## BL9ASIM Pilot Decision

For BL9ASIM pilot source material:

- `poolId` may remain `BL9ASIM`.
- Rendered SEO_V3 rows use `section: BL` and `port: 09A` unless the user
  changes this decision.
- Source context that is explicitly EH-only maps `area` to `EH` unless the
  source says otherwise.

This is a conversion decision only. It does not generate BL9ASIM rows by
itself.

## Output Discipline

Prefer structured JSON row files under:

```text
database_pool/<pool_id>/sources/
```

Keep generated rows source-backed, reviewable, and machine-checkable. After
writing rows, run database-pool validation when possible:

```text
node scripts/validate_database_pool.js
```

The web workbench is file-backed and uses manual reload. After an agent writes
or edits database-pool files, browser users must click `Reload` to see the
updated state.
