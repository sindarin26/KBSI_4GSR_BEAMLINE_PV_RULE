# ID10 Review

Review mode: active SEO_v2 review-and-fix pass. Source trace identifiers (`source_trace.raw_id`, `source_trace.source_id`, and `source_trace.source_anchor`) were preserved; this pass did not expand the PV list or promote exceptions/proposals into active rules.

## Applied Fixes

- Rewrote `outputs/ID10/pv_registry.yaml` from historical v0 shape to active SEO_v2 shape for 38 raw items with rule-supported mappings.
- Re-rendered `outputs/ID10/PV_REFERENCE.md` from the rewritten registry using the active SEO_v2 table shape.
- Updated `outputs/ID10/_work/raw_extracted_pvs.yaml` top-level `beamline` and `rulebook_version` to `BL-10C` / `SEO_v2`; legacy raw PVs remain source facts.
- Updated `exceptions/ID10/EXC-0001-status-readback-diagnostic-pvs.md` and `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md` to describe the active SEO_v2 review state.
- Created `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md` for 46 raw items that active rules cannot normalize without owner decisions.
- Added `outputs/ID10/status.yaml` and replaced the legacy notice with `outputs/ID10/MIGRATION_CONTEXT.md` so the output state is machine-readable and the v0 history is clearly contextual.
- Hardened `scripts/render_reference.js` so a missing or unparseable registry reports a concise `FAIL:` message instead of a Node stack trace.
- Hardened `scripts/validate_registry.js` so missing `PV_REFERENCE.md` is reported as a validator error without attempting to read the missing file, and missing/unloadable schema files fail clearly.
- Hardened `scripts/validate_seo_v2_rules.js` so missing required workbench files are reported before the script exits instead of falling through to file-read errors.
- Clarified `README.md`, `scripts/README.md`, and `proposals/OPEN.md` so schema/script roles and active `PV_REFERENCE.md` columns do not contradict the active rulebooks.

## Findings

### Finding 1

- Severity: error
- Location: `scripts/render_reference.js`
- Rule: executable command surface / workbench scripts must fail clearly on missing files
- Problem: `node scripts/render_reference.js NO_SUCH --check` previously surfaced a raw Node `ENOENT` stack trace when the registry was missing.
- Recommendation: Fixed by checking for `outputs/<beamline>/pv_registry.yaml` and catching parse/render failures with concise `FAIL:` messages.

### Finding 2

- Severity: error
- Location: `scripts/validate_registry.js`, `scripts/validate_seo_v2_rules.js`
- Rule: executable command surface / validators should produce actionable failure output
- Problem: Some missing-file paths could continue into lower-level file reads after reporting the missing file, making the failure less clear for workbench users.
- Recommendation: Fixed by short-circuiting missing registry/reference/schema paths and by exiting `validate_seo_v2_rules.js` after required-file checks fail.

### Finding 3

- Severity: info
- Location: `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, `scripts/README.md`
- Rule: workbench clarity
- Problem: No blocking mismatch found. The repository presents itself as an internal SEO_v2 extraction/registry/render/validation workbench; directory roles for `standards/`, `inputs/`, `outputs/`, `reviews/`, `exceptions/`, `proposals/`, `schemas/`, and `scripts/` are aligned with the active agent workflow.
- Recommendation: Keep active policy in `rules/`; keep scripts as validators/renderers and standards as human-facing distribution/discussion material.

### Finding 4

- Severity: info
- Location: `outputs/ID10/pv_registry.yaml`, `outputs/ID10/PV_REFERENCE.md`, `outputs/ID10/status.yaml`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Canonical Source, PV Identity Structure, Structured Field Consistency
- Problem: No active output error found. The ID10 registry declares `rulebook_version: SEO_v2`, has 38 unique rendered PVs, reconstructs PV names from structured fields, uses schema-accepted area/device/subdevice/status values, and the rendered reference PV set is current.
- Recommendation: Continue treating `pv_registry.yaml` as canonical and regenerate `PV_REFERENCE.md` through `scripts/render_reference.js` rather than hand-editing it.

### Finding 5

- Severity: info
- Location: `outputs/ID10/PV_REFERENCE.md`
- Rule: `rules/draft/PV_NAMING_RULEBOOK.md` — Rendered Reference
- Problem: No renderer artifact found. The generated table uses `PV Name | Port | Area | Device | Subdevice | Signal | Status | Notes` and no `[object Object]` rendering artifacts were found.
- Recommendation: Use `node scripts/render_reference.js ID10 --check` in validation gates to catch drift.

### Finding 6

- Severity: decision_required
- Location: `exceptions/SEO_v2/EXC-0001-duplicate-standardpv-instance-policy.md`, `proposals/OPEN.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Duplicate PVs
- Problem: The SEO_v2 DB corpus still contains duplicate rendered `standardPv` groups; active rules do not decide whether disambiguation belongs in `DEV`, `SUBDEV`, `SignalName`, metadata, or another source field.
- Recommendation: Keep this tracked as an exception/open proposal item until the owner approves a canonical instance policy.

### Finding 7

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Fix Policy, Area, Device, Subdevice
- Problem: 46 raw ID10 items need area/device/subdevice choices that active rulebooks do not settle, including masks/attenuator, legacy M1/M2 mirrors, zone plate, sample/detector rows, and SSA aperture rows.
- Recommendation: Keep these rows out of the canonical registry until the owner confirms mappings or approves a rule proposal.

### Finding 8

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0001-status-readback-diagnostic-pvs.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Exception Checks and Source Traceability
- Problem: Status, readback, diagnostic, XBPM, ring, IOC heartbeat, and scan-publish rows remain real source items but do not have settled active SEO_v2 classifications.
- Recommendation: Decide the status/readback/diagnostic naming policy before adding these rows to `pv_registry.yaml`.

### Finding 9

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Fix Policy
- Problem: `RAW-0112` and `RAW-0113` could fit the active `IVU-ENC` grouping, but the source explicitly questions whether they are readbacks rather than motor-like PVs.
- Recommendation: Decide whether IVU encoder values should be registry PVs, readbacks, or metadata attached to IVU entries.

## User Decisions Needed

- Resolve duplicate SEO_v2 `standardPv` groups by approving an instance/disambiguation policy or deciding that duplicate rendered PVs remain non-canonical source rows only.
- Resolve the raw IDs in `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md` by confirming active area/device/subdevice mappings or requesting a rule proposal.
- Decide the status/readback/diagnostic/XBPM/ring/IOC/scan-publish policy tracked by `EXC-0001`.
- Decide the IVU encoder classification tracked by `EXC-0002`.

## Remaining Warnings

- `reviews/ID10/SELF_REVIEW.md` is historical v0 draft context; use this `REVIEW.md` for the active SEO_v2 review state.
- `outputs/ID10/_work/raw_extracted_pvs.yaml` intentionally preserves legacy `raw_pv` and `raw_axis_or_function` values as source facts; normalized active fields are in `pv_registry.yaml`.
- `10C` is used as the active port following the SEO_v2 DB-backed examples; this remains a known Markdown-vs-DB source conflict documented by the active rulebooks.
- ~~`validate_registry.js` currently enforces one registry entry per `source_trace.raw_id`, while the informal schema only requires the raw ID to exist when raw extraction exists.~~ **Resolved (Phase 0)**: 1:1 raw_id policy is now the documented contract. `schemas/pv_registry.seo_v2.yaml` has been updated with `raw_id_cardinality: one_per_pv_entry`. The validator already enforced this; the schema now matches.

## Exceptions Or Proposals Recommended

- Create a formal rule-change proposal from `exceptions/SEO_v2/EXC-0001-duplicate-standardpv-instance-policy.md` if duplicate SEO_v2 `standardPv` rows should become canonical registry entries.
- Create or approve a proposal if zone plate (`ZP`), secondary source aperture (`SSA`), or detector/sample variants require new active SEO_v2 device/subdevice codes.
- Promote a status/readback/diagnostic naming policy before normalizing the `EXC-0001` raw IDs.
- Confirm whether `M1`/`M2` are `HHLM-MIRR` instances or need separate active device policy.
