# Final Workflow Goal

Status: planning artifact, not an active rulebook, schema, or naming policy.

This file states the intended long-term workflow so future agents can check
their work before changing importer, database-pool, review, or abbreviation
behavior. Updated after the 2026-06-02 hard-reset alignment that removed all
SEO_v2 / v0 paths.

## Target Workflow

```text
inputs/<pool_id>/
  rough natural-language, semi-structured, or structured source material

agent conversion or explicit mechanical importer
  source-backed, review-required normalization

database_pool/<pool_id>/sources/*.rows.json
  immutable source facts and candidate SEO_V3 rows

database_pool/<pool_id>/decisions/*.decisions.json
  human decision overlays keyed by stable row uid

web review UI
  merged source rows plus decision overlays
  row review, conflict review, and abbreviation review

approved evidence
  curated examples, approved rows, abbreviation records, proposals, and active
  rules only after explicit review/promotion
```

## Core Principles

Source material goes under `inputs/`. Claims inside input files are evidence
for traceability, not active naming policy by themselves.

Source rows under `database_pool/<pool_id>/sources/*.rows.json` preserve what
was extracted or inferred from source material. They should remain immutable
where practical so re-import, review history, and audit can be understood.

Human decisions live separately under
`database_pool/<pool_id>/decisions/*.decisions.json`. The web UI displays the
effective row by overlaying decisions on source rows. Review decisions must not
overwrite source facts silently.

Agent conversion and the mechanical importer are separate paths. The mechanical
importer extracts PV-like tokens and applies known mapping logic. Agent
conversion handles natural-language or semi-structured source material using
`rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md`.

Abbreviation choices are reviewable evidence. A code that looks plausible is
not approved until it has gone through the abbreviation workflow.

PV row approval and abbreviation approval are related but must not collapse
into a silent global promotion. If every component abbreviation in a row is
already approved and unambiguous, the row may be treated as approval-eligible.
If a human approves a PV row that uses candidate abbreviations, the action
should create source-backed abbreviation usage evidence and may promote only
unambiguous abbreviation records. Any code/meaning/scope conflict must require
explicit review before promotion.

Approved rows, approved abbreviation records, curated examples, and relevant
notes should become searchable retrieval evidence for future agents. Retrieval
supports consistency; it does not override active rulebooks or promote policy
automatically.

Before any implementation resumes from this planning state, agents must run a
fresh review gate over the current scope. Completion of future goals must also
record reviewer/subagent evidence, or an explicit fallback self-review if no
subagent tool is available.

## Long-Term Consistency Requirement

When the approved evidence base is sparse, different agents may generate
different candidate rows from the same rough source input. That is expected,
and those differences should remain visible for review.

After enough source-backed approved rows, approved abbreviation records, and
curated examples exist, different agents should converge on the same normalized
SEO_V3 rows for the same source input.

Cross-agent consistency evaluation should start only after the readiness gates
are met:

- approved device abbreviations exist;
- approved subdevice abbreviations exist;
- enough non-conflicting approved rows exist;
- expected outputs have source evidence and written justification;
- disagreements route to `exceptions/` or `proposals/`.

## Non-Goals For Alignment Work

- Do not treat database-pool rows as active naming policy without promotion.
- Do not approve abbreviations by inference.
- Do not use retrieval results as binding authority.
- Do not merge source rows and human decisions into one destructive file.
- Do not expand the importer into natural-language interpretation without an
  explicit goal and review gate.
- Do not reintroduce a second web workbench.
- Do not reintroduce the removed SEO_v2 / v0 paths.

## Future Agents Should Check

Before changing this workflow, future agents should verify:

1. Does the change preserve source traceability from `inputs/` to source row,
   decision, exception, proposal, or output?
2. Does the change keep source facts and human overlays separate?
3. Does the change avoid silently promoting examples, candidate abbreviations,
   or retrieval evidence into active policy?
4. Does the change keep the web UI as a review surface, not the primary source
   interpreter?
5. Does the change include the required review gate before implementation and
   recorded reviewer evidence before completion?
6. Does abbreviation approval avoid silently promoting ambiguous code, meaning,
   or scope choices?
