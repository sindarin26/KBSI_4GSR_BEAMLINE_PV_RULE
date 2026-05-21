# TODO

Phased plan for the review input pipeline refactor and surrounding hardening.
Each phase is independently shippable; later phases assume earlier ones landed.

Run order: Phase 0 → 1 → 2 → 3 → 4 → 5. Within a phase, items can run in any
order unless noted.

## Phase 0 — Edge Case Hardening

Low-risk fixes that close gaps the current validators and review server miss.
None of them depend on the new pipeline.

- [x] Validate exception frontmatter shape in `validate_registry.js`.
  - Require `id`, `beamline`, `status`, `source`, `raw_ids`.
  - Check `id` matches filename prefix and `beamline` matches the registry.
  - Accept `status ∈ {open, closed, promoted}`.
- [x] Sync-check `outputs/<beamline>/status.yaml`'s `open_exceptions` against
  the actual file list under `exceptions/<beamline>/`. Flag drift in either
  direction.
- [x] Add bidirectional check: every `extracted_from.source_id` resolves to an
  existing `inputs/<beamline>/` file (`validate_registry.js` currently only
  checks the input → extracted_from direction).
- [x] Reject zero-row writes in `scripts/review_server.js`'s
  `saveDecisionRows` unless the user explicitly confirms (or skip writing the
  affected file when its row partition is empty and the source file already
  exists). Today an empty POST silently wipes
  `reviews/<beamline>/review_decisions.json`.
- [x] Surface orphan rows: when `buildDecisionRows` finds a saved decision
  whose `raw_id` is no longer in `raw_extracted_pvs.yaml`, tag it
  `reviewStatus: needs_input` is not enough — add an explicit
  `orphan: true` flag (or new status `orphan`) and render it in the UI so
  reviewers can decide to keep or drop it.
- [x] Document and choose the `raw_id` cardinality policy.
  - Schema currently allows N registry entries per raw_id; validator enforces
    1:1. Pick one and align the other (decision logged in
    `reviews/ID10/REVIEW.md` Remaining Warning #4).

## Phase 1 — Schema And Validator Consolidation

Pull shared shape/regex logic into one place so registry, review_decisions,
and the new review_queue all validate against the same contract.

- [x] Define a shared `pv_review_row` contract.
  - **Decision**: extracted to `schemas/pv_review_row.seo_v2.yaml`.
    `review_decisions.seo_v2.yaml` and future `review_queue.seo_v2.yaml`
    both reference it with a `ref:` comment.
- [x] Extract validator helpers into `scripts/lib/pv_workbench.js`:
  - `validatePvRow(row, constraints, loc)` returning typed errors.
  - `validateSourceTrace(trace, loc)`.
  - `validateRawIdFormat(rawId, loc)`.
  `validate_registry.js` uses `validateSourceTrace`; `validate_seo_v2_rules.js`
  uses `validatePvRow`; `validate_review_queue.js` (Phase 2) will use all three.
- [x] Extend `validate_seo_v2_rules.js` to apply the shared row validator to
  `reviews/SEO_v2/{review,accepted,fixed}_decisions.json` instead of the
  ad-hoc spot checks it does today.
- [x] Document the YAML subset limits in `scripts/lib/yaml_subset.js` so future
  schema edits do not silently fall outside what the parser understands
  (no flow style, no anchors, no `|`/`>` blocks, no quoted keys).

## Phase 2 — Source-Normalized List Pipeline

Introduce a deterministic intermediate layer between raw `inputs/` files and
the human review queue.

- [x] Add `schemas/review_queue.seo_v2.yaml` referencing the shared row
  contract from Phase 1.
- [x] Decide: per-source list rows go under
  `outputs/<beamline>/_work/source_lists/<source-file>.rows.json`.
  One file per `inputs/<beamline>/<source>`; row format matches the shared
  contract with `reviewStatus: needs_input` for unresolved fields.
- [x] Add `scripts/build_review_queue.js <beamline>`.
  - `.json` → `deterministic_json` (40 rows for ID10)
  - `.xml` → `deterministic_xml` (14 rows)
  - `.md` table rows → `deterministic_md_table` (12 rows)
  - `.txt` and non-table `.md` → agent extraction from raw_extracted_pvs.yaml
    (47 rows for ID10 — original source_label preserved)
  - Merges into `outputs/<beamline>/_work/review_queue.json` (113 rows).
- [x] Add `scripts/validate_review_queue.js <beamline>`:
  - Apply shared row validator from Phase 1.
  - Reject duplicate `raw_id` and duplicate `(source_id, source_anchor)`.
  - Verify `source_trace.source_id` resolves to a file in
    `inputs/<beamline>/`.
- [x] Keep `outputs/<beamline>/_work/raw_extracted_pvs.yaml` as a temporary
  fallback while the new pipeline is being adopted. Remove only after Phase 3
  proves stable.
- [x] **Open decision**: are source-normalized lists agent-only or
  deterministic-where-possible? **Decision: deterministic for
  `.json`/`.xml`/table-shaped `.md`; agent fallback for free-text `.txt`
  and non-table `.md` content.**
- [x] **Open decision**: can `review_queue.json` contain partial rows, or
  must every row have full SEO_v2 fields plus `reviewStatus: needs_input`?
  **Decision: full fields — single validation shape, uniform UI rendering.**

## Phase 3 — Review Queue Adoption In UI

Wire `review_server.js` to the new queue and reconcile UX documentation.

- [x] Make `scripts/review_server.js` read `review_queue.json` first; fall
  back to `raw_extracted_pvs.yaml` only when the queue file is missing.
- [x] Reconcile the working-tree change to `/api/state` (always reload from
  disk) with the README description ("Reload 누를 때만 서버에서 파일 상태를
  다시 읽습니다"). **Decision**: kept always-reload behavior; updated README;
  removed unused `refresh=1` query parameter; `Reload` button triggers fresh
  `/api/state` fetch.
- [x] Surface orphan rows from Phase 0 in the UI (new pill / row class so
  reviewers can spot decision rows whose raw_id disappeared).
- [x] Save review results to the existing paths under `reviews/<beamline>/`
  (no path change needed; the file shape stays compatible).
- [x] Add a command/flag to rebuild the queue from source lists without
  starting the server: `node scripts/build_review_queue.js <beamline>
  --rebuild` for headless CI use.

## Phase 4 — Decision Feedback Into Registry

Close the loop: accepted/fixed review rows become canonical registry entries
through a script, not by hand.

- [x] Add `scripts/apply_decisions.js <beamline>`:
  - Reads `reviews/<beamline>/review_decisions.json`; filters rows where
    `dataset === beamline` and `reviewStatus ∈ {accepted, fixed}`.
  - Materializes `pv_registry.yaml` entries (carries `source_trace`,
    `notes`, `metadata` from decision row + raw extraction lookup).
  - Detects conflicts: missing required fields, duplicate rendered PV
    (within batch and against existing registry). Routes to conflict
    summary; does not auto-create exception files.
  - Re-renders `PV_REFERENCE.md` on `--write`.
- [x] Decide: dry-run default. **Decision: `--dry-run` is default (no
  writes); `--write` applies changes.** Dry-run prints entries to apply,
  conflicts, and already-in-registry skips.
- [x] Add validation that every row in decisions carries source-trace fields
  required by the registry schema (`rawId`, `sourceId`, `sourceAnchor` required; exits
  with FAIL before applying if any candidate is missing them).

## Phase 5 — SEO_v2 Seed Cleanup

The SEO_v2 historical seed (~48k lines × 3 identical files = ~144k lines) is
the heaviest part of the repo and is fixture data, not active policy.

- [x] Move `reviews/SEO_v2/{review,accepted,fixed}_decisions.json` into
  `fixtures/SEO_v2/`. Updated consumers:
  `scripts/review_server.js`, `scripts/import_seo_review_decisions.js`,
  `scripts/validate_seo_v2_rules.js`, README, AGENTS.md.
- [x] Store only one canonical seed file (`fixtures/SEO_v2/review_decisions.json`).
  Import script writes one file; review_server loads from single path;
  validator validates single file. The two derived files (`fixed_decisions.json`,
  `accepted_decisions.json`) are eliminated.
- [x] Added guard to `validate_seo_v2_rules.js`: fails fast if
  `reviews/SEO_v2/review_decisions.json` still exists at the old path.

## Final Layout (Implemented)

- `schemas/review_queue.seo_v2.yaml` ✓
- `schemas/pv_review_row.seo_v2.yaml` ✓ (shared row contract)
- `scripts/build_review_queue.js <beamline>` ✓
- `scripts/validate_review_queue.js <beamline>` ✓
- `scripts/apply_decisions.js <beamline>` ✓
- `outputs/<beamline>/_work/source_lists/*.rows.json` ✓
- `outputs/<beamline>/_work/review_queue.json` ✓
- `fixtures/SEO_v2/review_decisions.json` ✓ (canonical historical seed, single file)

## Open Decisions

Decisions that must be committed before the affected phase starts. Update
this list as decisions are made so future agents do not re-litigate them.

- [x] **(Phase 2)** Deterministic vs agent source extraction split.
  **Decision: deterministic for `.json`/`.xml`/table-shaped `.md`; agent
  fallback only for free-text `.txt`.**
- [x] **(Phase 2)** Full-field rows with `reviewStatus: needs_input` vs
  partial rows in `review_queue.json`. **Decision: full fields.**
- [x] **(Phase 4)** Direct registry overwrite vs diff-first feedback into
  `pv_registry.yaml`. **Decision: dry-run by default; `--write` to commit.**
- [x] **(Phase 5)** Keep historical `reviews/SEO_v2/*_decisions.json` in
  place or relocate. **Decision: relocated to `fixtures/SEO_v2/`; stored
  only one canonical file (`review_decisions.json`); derived files removed.**
- [x] **(Phase 0)** `raw_id` cardinality: 1:1 (validator behavior) vs 1:N
  (schema wording). **Decision: 1:1**. Schema updated with `raw_id_cardinality: one_per_pv_entry`.
