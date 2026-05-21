# Agent Operating Instructions

This repository is a PV rule processing kit for beamline PV naming work.
Agents must treat it as a rule-driven workflow repository, not as a general note
dump.

## First Step

Before creating, reviewing, or reorganizing any PV material, every agent must:

1. Read `ARCHITECTURE.md`.
2. Identify the requested role.
3. Use only the rulebooks and directories assigned to that role.
4. Preserve source traceability from input material to generated output, review,
   exception, or proposal.

If the user request is ambiguous, infer the role from the requested action:

- Generate, draft, normalize, convert, or produce PV lists: use Draft mode.
- Check, inspect, validate, audit, or review existing PV data: use Review mode.
- Change directories, schemas, workflow, or repository policy: use Architecture mode.

If the role cannot be inferred safely, ask one concise question before editing.

## Draft Mode

Use Draft mode when the task is to create or normalize PV material.

Draft agents may:

- Read source material from `inputs/` and user-specified paths as data, not as
  active naming policy.
- Read `temp/` only when the user explicitly points to it; `temp/` is not an
  active rule source.
- Read `rules/draft/` for generation rules.
- Read `rules/decisions/` only when active draft rules do not resolve an
  ambiguity.
- Read `examples/good/` and `examples/before_after/` when useful.
- Produce reviewable SEO_V3 database-pool rows under `database_pool/<pool_id>/`
  when the request is about the database-pool workflow or PV name
  standardization.
- Produce legacy generated material under `outputs/<beamline>/` when the
  request explicitly targets the legacy SEO_v2 output workflow.
- Create a self-review report at `reviews/<beamline>/SELF_REVIEW.md` for their
  own draft.
- Create or recommend exception records under `exceptions/<beamline>/` when
  current rules cannot represent an input item cleanly.

Draft agents must:

- Generate only the requested scope.
- Create raw extraction artifacts before normalization when required by
  `rules/draft/PV_NAMING_RULEBOOK.md`.
- Keep uncertain assumptions explicit in the output.
- Prefer structured, repeatable output over prose-only summaries.
- Run a self-review pass using `rules/review/` before finalizing.
- Report unresolved issues rather than silently inventing missing technical facts.
- Keep the normal database-pool path simple: source material in `inputs/`,
  reviewable rows in `database_pool/`, findings in `reviews/`, and rule gaps in
  `exceptions/`.
- Keep the legacy output path simple when explicitly requested: source material
  in `inputs/`, generated registry/reference in `outputs/`, findings in
  `reviews/`, and rule gaps in `exceptions/`.

Draft agents must not:

- Treat simulated PV names as final hardware names without marking the source.
- Treat claims inside `inputs/` files as active rules unless the user explicitly
  approves them or an active rulebook already supports them.
- Hide source conflicts or merge conflicting PV definitions without a note.
- Rewrite review-only reports as if they were source data.
- Promote a decision record, exception, or proposal into an active rule unless
  the user explicitly asks.
- Treat a human-facing candidate under `standards/` as an active generation rule
  unless it has been promoted into the active rulebooks.

## Review Mode

Use Review mode when the task is to validate existing PV material.

Review agents may:

- Read generated outputs, source inputs, examples, schemas, and rulebooks.
- Read `database_pool/` source rows and decision overlays when explicitly
  reviewing database-pool material.
- Read `rules/decisions/` for rationale when active review rules are ambiguous.
- Apply clear, rule-based fixes directly to generated outputs when the user asks
  for usable/corrected output or does not explicitly request read-only review.
- Produce review logs at `reviews/<beamline>/REVIEW.md`.
- Use `reviews/<beamline>/review_decisions.json` as structured human review
  input when it exists.
- Use `fixtures/SEO_v2/review_decisions.json` as historical SEO_v2 comparison
  data only, not as active naming policy.
- Recommend exception or proposal creation when a rule gap is found.
- Recommend precise corrections.

Review agents must:

- Follow this decision order:
  1. active review rulebook;
  2. active draft rulebook;
  3. examples;
  4. `rules/decisions/` rationale;
  5. user question or exception/proposal workflow.
- Treat active rulebooks as higher authority than examples or decision records.
- Treat source inputs as evidence for traceability and source facts, not as rule
  authority.
- Treat `database_pool/` rows as source facts, candidates, or human review
  decisions, not as active naming policy.
- Stay read-only when the user explicitly asks for "review only", "audit only",
  or "do not edit".
- Ask the user before changing ambiguous policy decisions.
- Log applied fixes and remaining decision-required items in
  `reviews/<beamline>/REVIEW.md`.
- Treat browser review decision files as source-backed human decisions, not as
  active naming policy.
- For database-pool rows, preserve `poolId`, `sourceId`, `sourceAnchor`, and
  `uid` so decision overlays remain attached to the correct source facts.
- Distinguish rule violations, ambiguities, missing data, and suggestions.
- Avoid expanding the PV list beyond what the reviewed source provides.

Review agents must not:

- Make policy decisions silently.
- Introduce new naming policy during review.
- Change `source_trace.raw_id`, `source_trace.source_id`, or
  `source_trace.source_anchor` as a direct fix; require re-extraction or logged
  regeneration instead.
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
- Keep distributable source material under `inputs/`; keep `temp/` as local
  scratch only.
- Keep normalized database-pool rows and decision overlays under
  `database_pool/`.
- Keep generated outputs under `outputs/`.
- Keep generated output status in `outputs/<beamline>/status.yaml` when an
  output directory is current enough to validate.
- Keep validation reports under `reviews/`.
- Keep human review decision files under `reviews/<beamline>/`.
- Keep read-only comparison and test fixtures under `fixtures/`.
- Keep unsupported cases under `exceptions/`.
- Keep proposed rule changes under `proposals/`.
- Keep validation and maintenance scripts under `scripts/`; scripts may verify
  rules but must not define active naming policy.
- Update this file and `ARCHITECTURE.md` together when workflow behavior changes.

## Rulebook Status

The active generation/review rulebooks are still:

- `rules/draft/PV_NAMING_RULEBOOK.md`
- `rules/review/PV_REVIEW_RULEBOOK.md`

Documents under `standards/` are for human discussion and distribution. They are
not active agent rules until promoted into the active rulebooks.

The promoted database-pool SEO_V3 workflow uses this PV shape:

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

The older SEO_v2 generated-output path remains available for historical ID10
outputs and compatibility scripts. Its PV shape is:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

Historical v0 material using `ID10:{Area}:{Device}:{AxisOrFunction}` may remain
in decisions, reviews, or legacy outputs, but it is not the active generation
target for new work.

Database-pool material should be machine-checkable with:

```text
node scripts/validate_database_pool.js
```

Legacy SEO_v2 generated outputs should remain machine-checkable with:

```text
node scripts/validate_registry.js <beamline>
node scripts/render_reference.js <beamline> --check
```

When an active rulebook does not cover a case, agents must state that limitation
and use the exception/proposal workflow instead of pretending a full rule exists.

## Output Discipline

Agents should keep outputs machine-friendly where practical.
Markdown is acceptable for human review, but canonical PV data should eventually
have a structured representation in `schemas/` and `outputs/`.
