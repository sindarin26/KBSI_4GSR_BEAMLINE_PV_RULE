# Repository Architecture

This repository defines a repeatable workflow for processing beamline PV source
material into standardized SEO_V3 PV naming review datasets.

The repository is intentionally separate from beamline control software. It
holds rulebooks, examples, schemas, input material, source-backed database-pool
rows, decision overlays, and reviews.

SEO_v2 and v0 paths were removed during the 2026-06-02 hard-reset alignment.
The repository now carries only the active SEO_V3 database-pool workflow.

## Design Goals

- Make SEO_V3 PV review datasets repeatable across pools.
- Keep source rows and human decision overlays separate so review never
  destroys source evidence.
- Keep draft conversion and review responsibilities separate.
- Preserve traceability from source input to source row, decision, exception,
  or proposal.
- Allow deterministic validation scripts or retrieval-based search to be added
  later, after enough approved evidence exists.

## Directory Layout

```text
AGENTS.md
ARCHITECTURE.md
README.md

rules/
  draft/
    PV_NAMING_RULEBOOK.md
    DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md
  review/
    PV_REVIEW_RULEBOOK.md
  decisions/

standards/
  candidates/

inputs/
  4GSR_Beamline_PV_Naming_Standard_v1.0/
    standard.md
  <pool_id>/

database_pool/
  abbreviations/
    registry.json
  <pool_id>/
    manifest.yaml
    sources/
      *.rows.json
    decisions/
      *.decisions.json

examples/
  good/
  bad/
  before_after/

schemas/
  database_pool.seo_v3.yaml

outputs/
  (empty — reserved for future export/render artifacts)

reviews/  # ignored local review workspace
  <beamline-or-pool>/

exceptions/
  <scope>/

proposals/
  rule_changes/

notes/
scripts/
plan/
```

## Directory Responsibilities

`rules/draft/`

Contains rulebooks for generating PV drafts from raw or semi-structured source
material. Draft rules should be written in English so they can be reused by
LLM agents consistently. Database-pool input conversion procedures also live
here so Draft agents see them before converting `inputs/<pool_id>/` source
material into `database_pool/<pool_id>/` rows.

`PV_NAMING_RULEBOOK.md` is currently a skeleton; agents must use the standard
source document under `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md`
and `database_pool/abbreviations/registry.json` as the working policy until
redrafted.

`rules/review/`

Contains rulebooks for validating generated SEO_V3 PV data and documents. The
review rulebook is currently a skeleton with the same fallback authority order
as the draft rulebook.

`rules/decisions/`

Contains decision records and rationale behind active or emerging rules. Agents
may consult this directory when active rulebooks do not fully resolve an
ambiguous case, but approved rules still belong in `rules/draft/` and
`rules/review/`.

`standards/`

Contains human-facing candidate standard documents. These are for discussion
and distribution. They are not active agent rules until promoted into
`rules/draft/`, `rules/review/`, schemas, and examples.

`inputs/`

Contains source material intended to be processed. Use one subdirectory per
pool (e.g. `inputs/BL10A/`, `inputs/BL9ASIM/`). The SEO_V3 standard source
document lives at `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md`.

Input files may include memos or comments, but those claims are source context,
not active rule authority. Approved naming policy belongs in active rulebooks.
When an agent converts natural-language or semi-structured input into SEO_V3
database-pool rows, it must follow
`rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md`.

`database_pool/`

Contains normalized, reviewable SEO_V3 PV candidate datasets and the durable
abbreviation review registry. Use one subdirectory per pool. Each pool keeps a
`manifest.yaml`, source-row files under `sources/*.rows.json`, and human
decision overlays under `decisions/*.decisions.json`.

Canonical database-pool paths are:

```text
database_pool/<pool_id>/manifest.yaml
database_pool/<pool_id>/sources/*.rows.json
database_pool/<pool_id>/decisions/*.decisions.json
database_pool/abbreviations/registry.json
```

Rows in `database_pool/` are source facts, candidates, or human review
decisions. They are not active naming policy until promoted into rulebooks,
schemas, examples, or generated outputs through an explicit review/proposal
step.

Rows produced by agent interpretation (`sourceTrace.sourceKind:
"agent_input_conversion"`) must carry a non-empty top-level `note` with
reviewer-visible source context, mapping assumptions, uncertainty, and
vocabulary gaps. Raw structured candidates may also be preserved in `metadata`,
but metadata-only notes are not enough for workbench review. `reviewNote` is
reserved for human decision overlays under `database_pool/<pool_id>/decisions/`.

Newly generated or regenerated semantic import rows use
`metadata.noteContract: "standard_pv_evidence_v1"`. Under that contract,
top-level `note` must include labeled evidence sections for `Source`, `HTML
candidate`, `Chosen PV`, `Component changes`, `Mapping evidence`,
`Uncertainty/Review required`, and `Vocabulary`, so reviewers can see the
source-backed reasons for the rendered `standardPv` without opening raw
metadata.

`database_pool/abbreviations/registry.json` is the source-of-truth file for
SEO_V3 abbreviation review records. Each record carries explicit source,
status, rationale, and usage evidence. Candidate records remain
review-required and must not unblock silent row approval.

`examples/`

Contains examples used to stabilize generation and review behavior.

- `examples/good/`: valid examples.
- `examples/bad/`: intentionally invalid examples.
- `examples/before_after/`: transformation examples.

Examples are currently sparse — ID10 / SEO_v2 examples were removed during the
2026-06-02 alignment. New examples should be added as approved SEO_V3 evidence
accumulates.

`schemas/`

Contains the active machine-readable schema definition,
`schemas/database_pool.seo_v3.yaml`, which defines the informal SEO_V3
database-pool contract. A stricter validation schema may replace or extend the
informal contract later.

`outputs/`

Reserved for future generated or exported artifacts derived from approved
SEO_V3 evidence. Currently empty. Source rows and decision overlays live under
`database_pool/`, not under `outputs/`.

`reviews/`

Contains local review reports and local human review decision files. Use one
subdirectory per pool. `reviews/` is ignored by git and is not a distribution
artifact. Browser review decisions live under
`database_pool/<pool_id>/decisions/`, not under `reviews/`.

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

Current entry points:

```text
node scripts/import_database_pool.js --input inputs/<pool_id> --pool <pool_id>
node scripts/import_database_pool.js --input inputs/<pool_id> --pool <pool_id> --write
node scripts/review_server.js --database-pool <pool_id> --port 8212
node scripts/validate_database_pool.js
./run_database_pool_workbench.sh [pool_id ...]
./check_database_pool.sh
```

## Workflow

1. Put source material under `inputs/<pool_id>/`.
2. Use `standards/candidates/` for human-facing candidate standard discussion,
   not as active generation rules.
3. Draft mode reads source material plus `rules/draft/`.
4. Draft mode consults `rules/decisions/` only when active rules are ambiguous.
5. Draft mode converts source material into SEO_V3 database-pool rows under
   `database_pool/<pool_id>/sources/`. Rows default to
   `reviewStatus: "needs_input"`. Agent-converted rows must include a
   reviewer-visible top-level `note`; human review comments belong in decision
   overlay `reviewNote`. Regenerated semantic import rows must use the
   `standard_pv_evidence_v1` note contract.
6. Draft mode performs a self-review using `rules/review/` and writes local
   `reviews/<beamline-or-pool>/SELF_REVIEW.md`.
7. Exceptions are recorded under `exceptions/<scope>/` when current rules are
   insufficient.
8. Review mode reads existing database-pool source rows and decision overlays,
   applies clear rule-based decisions to the overlay unless the user requested
   read-only review, and writes a local review log to
   `reviews/<beamline-or-pool>/REVIEW.md`.
9. Human review uses `scripts/review_server.js --database-pool <pool_id>` to
   load explicit pools and save workbench decision overlays under
   `database_pool/<pool_id>/decisions/workbench.decisions.json`.
10. When source material under `inputs/<pool_id>/` is natural-language or
    semi-structured inventory that the importer cannot parse safely, Draft
    agents convert it directly into reviewable database-pool rows after
    consulting `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md`.

## Proposal Promotion

When a proposal is approved:

1. Update the active rulebook under `rules/draft/` or `rules/review/`.
2. Update examples and schemas if the rule affects them.
3. Mark the proposal status as `promoted`.
4. Add links between the promoted proposal and the updated rulebook section.
5. Keep the proposal file in `proposals/rule_changes/` as history; do not move
   it into `rules/`.

## Canonical Data Direction

Canonical PV data lives as machine-readable JSON under
`database_pool/<pool_id>/sources/` and `database_pool/<pool_id>/decisions/`,
governed by `schemas/database_pool.seo_v3.yaml`. Markdown is acceptable for
human review and discussion, not as canonical data.

## Rulebook Direction

The active generation/review rulebooks are:

- `rules/draft/PV_NAMING_RULEBOOK.md` (skeleton)
- `rules/review/PV_REVIEW_RULEBOOK.md` (skeleton)

The active database-pool input conversion procedure is:

- `rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md`

The active SEO_V3 PV shape is:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

Rules should be promoted carefully from source-backed decisions. Do not encode
a preference as a mandatory rule until the project owner confirms it.

## Future Retrieval Direction

A retrieval/evidence index over approved database-pool rows, approved
abbreviation records, and curated examples may be added later — once enough
approved evidence exists to make retrieval useful. Retrieval should support
the workflow, not replace explicit rulebooks. Likely retrieval sources:

- `rules/`
- `examples/`
- `rules/decisions/`
- approved rows under `database_pool/<pool_id>/`
- approved abbreviation records
- exceptions and proposals when investigating rule gaps
