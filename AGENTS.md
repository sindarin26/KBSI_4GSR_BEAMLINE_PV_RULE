# Agent Operating Instructions

This repository is a PV rule processing kit for SEO_V3 beamline PV naming work.
Agents must treat it as a rule-driven workflow repository, not as a general note
dump. SEO_v2 / v0 paths were removed during the 2026-06-02 hard-reset alignment.

## First Step

Before creating, reviewing, or reorganizing any PV material, every agent must:

1. Read `ARCHITECTURE.md`.
2. Identify the requested role.
3. Use only the rulebooks and directories assigned to that role.
4. Preserve source traceability from input material to database-pool row,
   decision overlay, exception, or proposal.

If the user request is ambiguous, infer the role from the requested action:

- Generate, draft, normalize, convert, or produce PV lists: use Draft mode.
- Check, inspect, validate, audit, or review existing PV data: use Review mode.
- Change directories, schemas, workflow, or repository policy: use Architecture mode.

If the role cannot be inferred safely, ask one concise question before editing.

## Draft Mode

Use Draft mode when the task is to create or normalize SEO_V3 PV material.

Draft agents may:

- Read source material from `inputs/` and user-specified paths as data, not as
  active naming policy.
- Read `rules/draft/` for generation rules.
- Read `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md` before
  converting natural-language or semi-structured `inputs/<pool_id>/` material
  into SEO_V3 database-pool rows.
- Read `rules/decisions/` only when active draft rules do not resolve an
  ambiguity.
- Read `examples/good/` and `examples/before_after/` when useful.
- Produce reviewable SEO_V3 database-pool rows under `database_pool/<pool_id>/`.
- Create a local self-review report at
  `reviews/<beamline-or-pool>/SELF_REVIEW.md`. `reviews/` is git-ignored
  unless the owner explicitly promotes a review artifact elsewhere.
- Create or recommend exception records under `exceptions/<scope>/` when
  current rules cannot represent an input item cleanly.

Draft agents must:

- Generate only the requested scope.
- For database-pool input conversion, follow
  `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md` and keep rows
  reviewable unless the conversion is purely mechanical from an approved
  source.
- Preserve `poolId`, `sourceId`, `sourceAnchor`, deterministic `uid`, and
  `sourceTrace.sourceKind` on every produced row.
- Default new rows to `reviewStatus: "needs_input"`.
- For `sourceTrace.sourceKind: "agent_input_conversion"`, populate a
  non-empty top-level `note` with reviewer-visible source context, mapping
  assumptions, uncertainty, conflicts, and vocabulary gaps. Metadata-only notes
  are insufficient.
- For newly generated or regenerated semantic import rows, set
  `metadata.noteContract: "standard_pv_evidence_v1"` and write the top-level
  `note` with the required evidence sections: `Source:`, `HTML candidate:`,
  `Chosen PV:`, `Component changes:`, `Mapping evidence:`,
  `Uncertainty/Review required:`, and `Vocabulary:`.
- Leave source-row `reviewNote` empty; `reviewNote` is reserved for human or
  workbench decision overlays.
- Keep uncertain assumptions explicit in the output.
- Prefer structured, repeatable output over prose-only summaries.
- Run a self-review pass using `rules/review/` before finalizing.
- Report unresolved issues rather than silently inventing missing technical facts.
- Keep the database-pool path simple: source material in `inputs/`,
  reviewable rows in `database_pool/`, local findings in ignored `reviews/`,
  and rule gaps in `exceptions/`.

Draft agents must not:

- Treat claims inside `inputs/` files as active rules unless the user explicitly
  approves them or an active rulebook already supports them.
- Hide source conflicts or merge conflicting PV definitions without a note.
- Rewrite review-only reports as if they were source data.
- Promote a decision record, exception, or proposal into an active rule unless
  the user explicitly asks.
- Treat a human-facing candidate under `standards/candidates/` as an active
  generation rule unless it has been promoted into the active rulebooks.
- Approve a row whose component abbreviations are still `candidate`,
  `deprecated`, or `rejected` in `database_pool/abbreviations/registry.json`.

## Review Mode

Use Review mode when the task is to validate existing SEO_V3 PV material.

Review agents may:

- Read generated database-pool source rows and decision overlays, source
  inputs, examples, schemas, and rulebooks.
- Read `rules/decisions/` for rationale when active review rules are ambiguous.
- Apply clear, rule-based fixes to decision overlays when the user asks for
  usable/corrected output or does not explicitly request read-only review.
- Produce local review logs at `reviews/<beamline-or-pool>/REVIEW.md`.
- Recommend exception or proposal creation when a rule gap is found.
- Recommend precise corrections.

Review agents must:

- Follow this decision order:
  1. active review rulebook;
  2. active draft rulebook;
  3. abbreviation registry status;
  4. examples;
  5. `rules/decisions/` rationale;
  6. user question or exception/proposal workflow.
- Treat active rulebooks as higher authority than examples or decision records.
- Treat source inputs as evidence for traceability and source facts, not as rule
  authority.
- Treat `database_pool/` rows as source facts, candidates, or human review
  decisions, not as active naming policy.
- Stay read-only when the user explicitly asks for "review only", "audit only",
  or "do not edit".
- Ask the user before changing ambiguous policy decisions.
- Log applied fixes and remaining decision-required items in local
  `reviews/<beamline-or-pool>/REVIEW.md`.
- Treat workbench decision overlays as source-backed human decisions, not as
  active naming policy.
- For database-pool rows, preserve `poolId`, `sourceId`, `sourceAnchor`, and
  `uid` so decision overlays remain attached to the correct source facts.
- Distinguish rule violations, ambiguities, missing data, and suggestions.
- Avoid expanding the row list beyond what the reviewed source provides.

Review agents must not:

- Make policy decisions silently.
- Introduce new naming policy during review.
- Change `sourceTrace.sourceId`, `sourceTrace.sourceAnchor`, or `uid` as a
  direct fix; require re-import or logged regeneration instead.
- Treat a formatting preference as a rule violation unless a rulebook says so.

## Architecture Mode

Use Architecture mode when modifying repository structure, schemas, workflow, or
agent policy.

Architecture agents must:

- Read `ARCHITECTURE.md` before changing structure.
- Keep rulebooks under `rules/`.
- Keep decision rationale under `rules/decisions/`.
- Keep human-facing standard documents and candidates under `standards/`.
- Keep examples under `examples/`.
- Keep distributable source material under `inputs/`.
- Keep normalized database-pool rows and decision overlays under
  `database_pool/`.
- Keep durable SEO_V3 abbreviation review records under
  `database_pool/abbreviations/registry.json`.
- Keep generated or exported outputs under `outputs/` (currently empty —
  export tooling is future work).
- Keep local validation reports under ignored `reviews/`.
- Keep unsupported cases under `exceptions/`.
- Keep proposed rule changes under `proposals/`.
- Keep validation and maintenance scripts under `scripts/`; scripts may verify
  rules but must not define active naming policy.
- Update this file and `ARCHITECTURE.md` together when workflow behavior changes.

## Rulebook Status

The active generation/review rulebooks are:

- `rules/draft/PV_NAMING_RULEBOOK.md` — skeleton after the 2026-06-02 alignment;
  agents must use `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md`
  and `database_pool/abbreviations/registry.json` as the working policy
  sources until this rulebook is redrafted.
- `rules/review/PV_REVIEW_RULEBOOK.md` — skeleton; uses the same fallback
  authority order.
- `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md` — active agent
  procedure for converting natural-language or semi-structured input material
  into SEO_V3 database-pool rows.

Documents under `standards/candidates/` are for human discussion and
distribution. They are not active agent rules until promoted into the active
rulebooks.

The SEO_V3 PV shape is:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

Database-pool source row components are:

```text
section
port
area
device
subdevice
signal
standardPv
```

Database-pool material must be machine-checkable with:

```text
node scripts/validate_database_pool.js
```

The default browser review port is `8212`.

When an active rulebook does not cover a case, agents must state that limitation
and use the exception/proposal workflow instead of pretending a full rule exists.

## Output Discipline

Agents should keep outputs machine-friendly where practical. Markdown is
acceptable for human review, but canonical PV data must have a structured
representation under `database_pool/<pool_id>/` and conform to
`schemas/database_pool.seo_v3.yaml`.
