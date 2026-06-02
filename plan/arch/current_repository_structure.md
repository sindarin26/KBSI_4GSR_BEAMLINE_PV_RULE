# Current Repository Structure

Status: planning artifact, not an active rulebook, schema, or naming policy.

This file describes the current repository shape as observed on 2026-06-02
after the SEO_v2 / v0 hard-reset alignment.

## Current Top-Level Roles

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
  4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md
  BL10A/
  BL9ASIM/

database_pool/
  abbreviations/
  4GSR_Beamline_PV_Naming_Standard_v1.0/   # manifest only, empty sources/decisions
  BL10A/                                    # manifest only, empty sources/decisions

outputs/
  (empty — reserved for future export/render artifacts)

exceptions/
  BL9ASIM/

proposals/
  rule_changes/

examples/
  good/   bad/   before_after/   (READMEs only after the hard reset)

schemas/
  database_pool.seo_v3.yaml

scripts/
  database_pool_pilot/
  abbreviation_registry_pilot/
  seo_v3_pilot/
  lib/
    yaml_subset.js
  import_database_pool.js
  review_server.js
  validate_database_pool.js
  validate_workflow_docs.js

notes/   # git-ignored
reviews/ # git-ignored
plan/
```

## Active Rule And Procedure Areas

`rules/draft/PV_NAMING_RULEBOOK.md` and
`rules/review/PV_REVIEW_RULEBOOK.md` are skeletons after the hard reset; they
list the fallback authority order to use until they are redrafted.

`rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md` is the active agent
procedure for converting natural-language or semi-structured `inputs/<pool_id>/`
material into SEO_V3 database-pool rows.

`rules/decisions/` stores decision rationale. Decision records are not active
rules unless promoted into active rulebooks, schemas, or examples.

## Source And Data Areas

`inputs/` contains source material. Current notable source sets include:

- `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md` (SEO_V3 standard
  source document, working policy reference)
- `inputs/BL10A/` (BL10A pool source files: txt/json/xml/md)
- `inputs/BL9ASIM/` (BL9ASIM pool source files: md)

`database_pool/` contains the active SEO_V3 review datasets. Each pool uses:

```text
database_pool/<pool_id>/manifest.yaml
database_pool/<pool_id>/sources/*.rows.json   # currently empty
database_pool/<pool_id>/decisions/*.decisions.json   # currently empty
```

The hard reset cleared previously imported pilot rows; re-import or agent
conversion is required before any pool carries reviewable rows again.

`database_pool/abbreviations/registry.json` is the current source-of-truth
abbreviation review registry. It carries explicit source, status, rationale,
and usage evidence for each abbreviation record.

## Review And Output Areas

`reviews/` contains local ignored review reports and human decision files.
After the hard reset only `reviews/workflow_alignment/` remains as the planning
record of this alignment.

`outputs/` is empty after the hard reset. It is reserved for future
generated/exported artifacts derived from approved SEO_V3 evidence.

`exceptions/` and `proposals/` preserve unsupported cases and proposed rule
changes without silently extending active policy. Current items:

- `exceptions/BL9ASIM/EXC-0001-third-party-epics-suffix-tier-boundary.md`
- `proposals/rule_changes/PROP-0001-third-party-epics-suffix-policy.md`

## Scripts

Current database-pool entry points:

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
node scripts/review_server.js --database-pool BL10A --port 8212
./run_database_pool_workbench.sh
./check_database_pool.sh
node scripts/validate_database_pool.js
```

Legacy SEO_v2 entry points (`validate_seo_v2_rules.js`, `validate_registry.js`,
`render_reference.js`, `build_review_queue.js`, `validate_review_queue.js`,
`apply_decisions.js`, `import_seo_review_decisions.js`, `lib/pv_workbench.js`)
were removed during the hard reset.

## Planning And Local Context

`notes/` contains private or temporary working notes. In this repository it is
ignored by git. After the hard reset only the workflow-alignment context notes
remain (`2026-06-01_workflow_alignment_context.md`,
`2026-06-01_workflow_alignment_goal.md`,
`2026-06-02_uncommitted_abbreviation_structure_review.md`).

`plan/` and `plan/arch/` are used here for planning diagrams and target/current
architecture notes. They are not currently an active policy directory in
`ARCHITECTURE.md`; files under `plan/` must label themselves as planning
artifacts.
