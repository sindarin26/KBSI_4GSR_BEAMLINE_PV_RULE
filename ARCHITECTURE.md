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

reviews/
  <beamline>/

exceptions/
  <beamline>/

proposals/
  rule_changes/

notes/
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
`schemas/pv_registry.v0.yaml` currently defines an informal v0 registry
contract. A stricter validation schema may replace or extend it later.

`outputs/`

Contains generated PV draft outputs. Use one subdirectory per beamline.
Intermediate extraction artifacts live under `outputs/<beamline>/_work/`.
For audited or distributed generated outputs, keep `_work/raw_extracted_pvs.yaml`
with the output so registry entries remain traceable to source material.

`reviews/`

Contains review reports. Use one subdirectory per beamline.

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
7. Draft mode performs a self-review using `rules/review/` and writes
   `reviews/<beamline>/SELF_REVIEW.md`.
8. Exceptions are recorded under `exceptions/<beamline>/` when current rules are
   insufficient.
9. Review mode reads existing output, applies clear rule-based fixes unless the
   user requested read-only review, and writes a review log to
   `reviews/<beamline>/REVIEW.md`.

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

The v0 schema is informal. Stricter validation can be added later without
changing the user-facing workflow.

## Rulebook Direction

The active v0 rulebooks are intentionally small and explicit:

- `rules/draft/PV_NAMING_RULEBOOK.md`
- `rules/review/PV_REVIEW_RULEBOOK.md`

Rules should be promoted gradually from observed decisions. Do not encode a
preference as a mandatory rule until the project owner confirms it.

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
