# Abbreviation Issue Engine Handoff

Status: handoff artifact, not an active rulebook, schema, or naming policy.
Date: 2026-06-08
Commit: `aa1cf86 Add abbreviation issue engine API foundation`

This document preserves the current abbreviation-workflow state after the
abbreviation issue engine and API foundation goal. Use it to resume later UI or
registry work without depending on ignored local notes.

## Completed Scope

The completed goal built the non-UI foundation for the future
abbreviation-confirm tab.

Implemented behavior:

- Derived abbreviation issues are computed from row components and
  `database_pool/abbreviations/registry.json`.
- Issues support exact-code, meaning-aware, explicit pattern, missing registry,
  candidate/deprecated/rejected, missing component, and meaning-conflict modes.
- Resolution keys are deterministic:
  - `abbreviation:<scope>:<kind>:<code>`
  - `abbreviation:<scope>:<kind>:<code>:<normalizedSourceTerm>`
  - `abbreviation-pattern:<scope>:<kind>:<codePattern>:<normalizedMeaning>`
  - `abbreviation-conflict:<scope>:<kind>:<code>`
  - `abbreviation-missing-component:<poolId>:<uid>:<field>`
- Explicit pattern records are supported in memory and validation, but no
  durable pattern records were added.
- `GET /api/state` exposes row-level `computed.abbreviationIssues`,
  row-level `computed.abbreviationApprovalEligibility`, and top-level
  `abbreviationIssueGroups`.
- Group summaries include stable resolution keys, counts, statuses, affected
  pools, examples, resolution mode, matched pattern, and candidate meanings
  where available.

## Preserved Constraints

The completed goal deliberately did not:

- build the visible abbreviation-confirm tab;
- add a new UI tab button or front-end workflow;
- approve PV rows;
- approve or mutate durable abbreviation registry statuses;
- edit `database_pool/abbreviations/registry.json`;
- regenerate source rows;
- write abbreviation issues into source rows;
- add new mutating abbreviation-confirm, registry, row-approval, or decision
  API endpoints.

The existing `POST /api/decisions` route remains as the pre-existing workbench
decision-save path.

## Current Data State

4GSR pool:

- Row count: `2099`
- Review status: all rows remain `needs_input`
- Note contract: all regenerated semantic rows use
  `metadata.noteContract: "standard_pv_evidence_v1"`
- Current abbreviation issue group count from focused validation: `145`

Abbreviation registry:

- Durable registry path: `database_pool/abbreviations/registry.json`
- Entry count: `50`
- Durable pattern records: `0`
- No registry status mutation occurred in the completed goal.

## Important Review Findings

The main implementation risk found during Gate 3 was meaning ambiguity hidden
behind pattern candidates.

Example:

```text
pvrow_1bb1dc2062f6728f
BL10C-OH:MOTOR-CTRL01:Init
```

The row's subdevice evidence can imply both:

- `Controller instance`
- `Soft motor instance`

The final engine treats this as a blocking `meaning_conflict`:

```text
abbreviation-conflict:global:subdevice:CTRL01
```

This is intentional. The future abbreviation-confirm UI must not silently clear
this by approving a broad `CTRL##` pattern unless the meaning conflict has been
reviewed explicitly.

## Files Added Or Changed

Contract and docs:

- `database_pool/abbreviations/README.md`
- `rules/review/PV_REVIEW_RULEBOOK.md`
- `schemas/database_pool.seo_v3.yaml`
- `scripts/abbreviation_registry_pilot/README.md`

Implementation:

- `scripts/abbreviation_registry_pilot/abbreviation_registry.js`
- `scripts/database_pool_pilot/database_pool.js`
- `scripts/review_server.js`
- `scripts/validate_workflow_docs.js`

Focused test:

- `scripts/test_abbreviation_issue_engine.js`

Local ignored evidence:

- `notes/2026-06-08_abbreviation_issue_engine_api_foundation_goal.md`
- `notes/2026-06-08_abbreviation_issue_engine_api_foundation_evidence.md`

The local notes contain detailed gate evidence, but `notes/` is ignored and
should not be treated as distributed project state.

## Gate Review Record

The completed goal used `../skills/goal-gated-execution` with
`gpt-5.5` and `reasoning_effort=xhigh` reviewers at every required transition.

Recorded gate outcomes:

- Gate 0: `ACCEPTED`
- Gate 1: `ACCEPTED`
- Gate 2: `ACCEPTED`
- Gate 3: initially `BLOCKED`, then fixed and `ACCEPTED`
- Gate 4: `ACCEPTED`
- Final Gate: `ACCEPTED`

Final commit:

```text
aa1cf86ec7a7bf921ac89714841e1e9252d761c5
```

## Validation Commands

Use these checks before starting abbreviation UI work:

```text
node --check scripts/review_server.js
node --check scripts/abbreviation_registry_pilot/abbreviation_registry.js
node --check scripts/test_abbreviation_issue_engine.js
node scripts/validate_workflow_docs.js
node scripts/validate_database_pool.js
node scripts/test_abbreviation_issue_engine.js
git diff --check
```

Forbidden-data checks should produce no output unless a later reviewed goal
explicitly allows a data change:

```text
git diff --name-only -- database_pool/abbreviations/registry.json
git diff --name-only -- 'database_pool/*/sources/*.rows.json'
git diff --name-only -- 'database_pool/*/decisions/*.decisions.json'
```

## Server Note

The default workbench port is `8212`.

During the completed goal, `8212` was sometimes occupied by stale server state,
so live API smoke used substitute ports. At the end of the goal, no server was
running on `8212`.

To inspect the current API state:

```text
node scripts/review_server.js --database-pool 4GSR_Beamline_PV_Naming_Standard_v1.0 --port 8212
```

Then query:

```text
GET /api/state
```

Expected current-worktree summary:

```text
rows: 2099
abbreviationIssueGroups: 145
registryEntries: 50
```

## Next Likely Goal

The next natural goal is the visible abbreviation-confirm tab.

That goal should start from a new goal note and should again use
`../skills/goal-gated-execution` with gate reviews.

Recommended first design questions:

1. Which groups are shown by default: all groups, repeated groups only, or
   repeated groups plus conflicts?
2. How should the UI separate exact, meaning-aware, pattern, and conflict
   resolution modes?
3. What evidence must be shown before a user can confirm an abbreviation or
   pattern?
4. How should PV-row approval create abbreviation evidence without silently
   approving ambiguous meanings?
5. What mutation path should be introduced for registry updates, and how will
   it preserve source-backed review evidence?

Do not add registry mutation or PV-row auto-approval in the UI goal without a
reviewed write contract.
