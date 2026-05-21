# Repository Architecture

This repository defines a repeatable workflow for processing beamline PV source
material into standardized PV naming outputs and review reports.

The repository is intentionally separate from beamline control software. It is
meant to hold rulebooks, examples, schemas, input material, generated outputs,
and reviews.

## Design Goals

- Make PV list generation repeatable across beamlines.
- Keep draft generation and review responsibilities separate.
- Preserve traceability from source input to final output.
- Allow deterministic validation scripts or RAG-based retrieval to be added later.
- Avoid mixing temporary reference material with canonical outputs.

## Directory Layout

```text
AGENTS.md
ARCHITECTURE.md
README.md

rules/
  draft/
  review/
  decisions/

standards/
  candidates/

inputs/
  <beamline>/

temp/
  <beamline>/

examples/
  good/
  bad/
  before_after/

schemas/

outputs/
  <beamline>/
    _work/
    status.yaml

reviews/
  <beamline>/
    review_decisions.json
    accepted_decisions.json
    fixed_decisions.json
  SEO_v2/
    review_decisions.json
    accepted_decisions.json
    fixed_decisions.json

exceptions/
  <beamline>/

proposals/
  rule_changes/

notes/
scripts/
```

## Directory Responsibilities

`rules/draft/`

Contains rulebooks for generating PV drafts from raw or semi-structured source
material. Draft rules should be written in English so they can be reused by
LLM agents consistently.

`rules/review/`

Contains rulebooks for validating generated PV data and documents. Review rules
define what counts as a violation, warning, ambiguity, or recommendation.

`rules/decisions/`

Contains decision records and rationale behind active or emerging rules. Agents
may consult this directory when active rulebooks do not fully resolve an
ambiguous case, but approved rules still belong in `rules/draft/` and
`rules/review/`.

`standards/`

Contains human-facing PV naming standard documents and candidates. These
documents are for discussion and distribution. They are not active agent rules
until promoted into `rules/draft/`, `rules/review/`, schemas, and examples.

`inputs/`

Contains source material intended to be processed. Use one subdirectory per
beamline, such as `inputs/ID10/`.

Input files may include memos or comments, but those claims are source context,
not active rule authority. Approved naming policy belongs in active rulebooks.

`temp/`

Contains local temporary, external, or reference material. It is not part of the
distributed workflow and is not an active rule source. Agents should read it only
when the user explicitly points to it.

`examples/`

Contains examples used to stabilize generation and review behavior.

- `examples/good/`: valid examples.
- `examples/bad/`: intentionally invalid examples.
- `examples/before_after/`: transformation examples.

`schemas/`

Contains machine-readable schema definitions for canonical data formats.
`schemas/pv_registry.seo_v2.yaml` currently defines the informal active
SEO_v2 registry contract. `schemas/pv_registry.v0.yaml` is retained as a legacy
contract for historical outputs and migration reference. A stricter validation
schema may replace or extend the informal contracts later.

`outputs/`

Contains generated PV draft outputs. Use one subdirectory per beamline.
Intermediate extraction artifacts live under `outputs/<beamline>/_work/`.
Each active generated output directory should include `status.yaml` so scripts
and agents can tell whether the output is `draft`, `reviewed`, `approved`, or
`legacy`.
For audited or distributed generated outputs, keep `_work/raw_extracted_pvs.yaml`
with the output so registry entries remain traceable to source material.

`reviews/`

Contains review reports and human review decision files. Use one subdirectory
per beamline. Browser review decisions should be stored as machine-readable
JSON rows under `reviews/<beamline>/`, not embedded only in HTML. Historical
SEO_v2 DB seed rows may live under `reviews/SEO_v2/` for comparison and UI
testing; they are data rows, not active policy.

`exceptions/`

Contains real input cases that current rules cannot represent cleanly. These
records preserve unsupported cases without silently expanding the rulebook.

`proposals/`

Contains proposed changes to rulebooks, usually based on one or more exception
records. Proposals are not active rules until promoted into `rules/`.

`notes/`

Contains private or temporary working notes. Notes preserve context during
development but are not distribution artifacts and do not define binding rules.
Decision records that should be distributed belong in `rules/decisions/`.

`scripts/`

Contains lightweight repository validation or maintenance scripts. Scripts may
check rulebook/schema/example consistency, but they do not define naming policy.
Active policy still belongs in `rules/`.

Current workbench entry points:

```text
node scripts/validate_seo_v2_rules.js
node scripts/validate_registry.js <beamline>
node scripts/render_reference.js <beamline> --check
node scripts/render_reference.js <beamline> --write
node scripts/review_server.js <beamline> --port 8765
node scripts/import_seo_review_decisions.js
```

## Workflow

1. Put source material under `inputs/<beamline>/`.
2. Use `temp/` only as local scratch or when the user explicitly points to it.
   Do not treat `temp/` as a distributed workflow input or rule source.
3. Use `standards/` for human-facing standard documents and candidate
   discussion, not as active generation rules.
4. Draft mode reads source material plus `rules/draft/`.
5. Draft mode consults `rules/decisions/` only when active rules are ambiguous.
6. Draft mode first writes raw extraction artifacts under
   `outputs/<beamline>/_work/` for directory, mixed-format, structured, or
   multi-entry source material, then writes generated results under
   `outputs/<beamline>/`.
7. Generated output directories should declare their status in
   `outputs/<beamline>/status.yaml`.
8. Draft mode performs a self-review using `rules/review/` and writes
   `reviews/<beamline>/SELF_REVIEW.md`.
9. Exceptions are recorded under `exceptions/<beamline>/` when current rules are
   insufficient.
10. Review mode reads existing output, applies clear rule-based fixes unless the
    user requested read-only review, and writes a review log to
    `reviews/<beamline>/REVIEW.md`.
11. Human review may use `scripts/review_server.js <beamline>` to save
    row-array decision files under `reviews/<beamline>/`. The server keeps the
    loaded row set in memory and refreshes from disk only on an explicit reload.
12. Historical SEO_v2 DB rows may be imported into `reviews/SEO_v2/` as fixed or
    accepted decision seeds for UI and pipeline tests. Imported seed files remain
    examples of prior accepted rows, not active policy.

## Proposal Promotion

When a proposal is approved:

1. Update the active rulebook under `rules/draft/` or `rules/review/`.
2. Update examples and schemas if the rule affects them.
3. Mark the proposal status as `promoted`.
4. Add links between the promoted proposal and the updated rulebook section.
5. Keep the proposal file in `proposals/rule_changes/` as history; do not move
   it into `rules/`.

## Canonical Data Direction

Markdown tables are acceptable during early design because they are easy to read
and discuss. The long-term direction should be a dual output:

- Human-readable Markdown for review and collaboration.
- Machine-readable JSON or YAML for validation, indexing, and reuse.

The SEO_v2 schema is informal. Stricter validation can be added later without
changing the user-facing workflow.

## Rulebook Direction

The active rulebooks are SEO_v2 / 4GSR standard v1.0 aligned:

- `rules/draft/PV_NAMING_RULEBOOK.md`
- `rules/review/PV_REVIEW_RULEBOOK.md`

The active PV shape is:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

Rules should still be promoted carefully from source-backed decisions. Do not
encode a preference as a mandatory rule until the project owner confirms it.

## Future RAG Direction

RAG may be added after enough examples, notes, and reviewed outputs exist.
The likely retrieval sources are:

- `rules/`
- `examples/`
- `rules/decisions/`
- accepted outputs under `outputs/`
- review reports under `reviews/`
- exceptions and proposals when investigating rule gaps

RAG should support the workflow, not replace explicit rulebooks.
