# Current Repository Structure

Status: planning artifact, not an active rulebook, schema, or naming policy.

This file describes the current repository shape as observed on 2026-06-01.
It does not change the authoritative directory responsibilities in
`ARCHITECTURE.md` or `AGENTS.md`.

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
  4GSR_Beamline_PV_Naming_Standard_v1.0/
  BL10A/
  BL9ASIM/
  SEO_v2/

database_pool/
  4GSR_Beamline_PV_Naming_Standard_v1.0/
  BL10A/
  seo_v3_m2_pilot/

fixtures/
  SEO_v2/
  seo_v3_pilot/

outputs/
  ID10/

reviews/
  ID10/
  SEO_v2/
  database_pool_*/

exceptions/
proposals/
examples/
schemas/
scripts/
notes/
plan/
temp/
```

## Active Rule And Procedure Areas

`rules/draft/PV_NAMING_RULEBOOK.md` and
`rules/review/PV_REVIEW_RULEBOOK.md` remain the active generation/review
rulebooks.

`rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md` is the active agent
procedure for converting natural-language or semi-structured `inputs/<pool_id>/`
material into SEO_V3 database-pool rows.

`rules/decisions/` stores decision rationale. Decision records are not active
rules unless promoted into active rulebooks, schemas, or examples.

## Source And Data Areas

`inputs/` contains source material. Current notable source sets include:

- `inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md`
- `inputs/BL10A/`
- `inputs/BL9ASIM/`
- `inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json`

`database_pool/` contains normalized SEO_V3 review datasets. Each pool uses:

```text
database_pool/<pool_id>/manifest.yaml
database_pool/<pool_id>/sources/*.rows.json
database_pool/<pool_id>/decisions/*.decisions.json
```

`fixtures/seo_v3_pilot/abbreviation_registry.json` is the current promoted
pilot abbreviation registry. It is loaded by validators and the review server
as read-only input.

`fixtures/SEO_v2/` contains historical comparison data for legacy review paths.

## Review And Output Areas

`reviews/` contains review reports and human decision files. It includes both
beamline reviews and database-pool milestone closeouts.

`outputs/ID10/` is the current legacy SEO_v2 generated-output path. It remains
available for historical/compatibility workflows and is not the default target
for new SEO_V3 database-pool work.

`exceptions/` and `proposals/` preserve unsupported cases and proposed rule
changes without silently extending active policy.

## Scripts

Current database-pool entry points include:

```text
node scripts/import_database_pool.js --input inputs/BL10A --pool BL10A
node scripts/review_server.js --database-pool BL10A --port 8212
./run_database_pool_workbench.sh
./check_database_pool.sh
node scripts/validate_database_pool.js
```

Current legacy SEO_v2 entry points include:

```text
node scripts/review_server.js ID10 --port 8212
node scripts/validate_registry.js ID10
node scripts/render_reference.js ID10 --check
```

## Planning And Local Context

`notes/` contains private or temporary working notes. In this repository it is
ignored by git, so notes preserve local context but do not become distribution
artifacts unless explicitly promoted elsewhere.

`plan/` and `plan/arch/` are used here for planning diagrams and target/current
architecture notes. They are not currently an active policy directory in
`ARCHITECTURE.md`; files under `plan/` must label themselves as planning
artifacts.

`temp/` is local scratch/reference material and not an active source of truth.
The current abbreviation registry traces to `temp/SEO_v3/...`, which is a
source-of-truth weakness noted in the workflow-alignment gap review.
