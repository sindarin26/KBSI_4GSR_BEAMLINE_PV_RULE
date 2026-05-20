# ID10 Review

Review mode: active SEO_v2 review-and-fix pass. Source trace identifiers (`source_trace.raw_id`, `source_trace.source_id`, and `source_trace.source_anchor`) were preserved when registry entries were rewritten.

## Applied Fixes

- Rewrote `outputs/ID10/pv_registry.yaml` from historical v0 shape to active SEO_v2 shape for 38 raw items with rule-supported mappings.
- Re-rendered `outputs/ID10/PV_REFERENCE.md` from the rewritten registry using the active SEO_v2 table shape.
- Updated `outputs/ID10/_work/raw_extracted_pvs.yaml` top-level `beamline` and `rulebook_version` to `BL-10C` / `SEO_v2`; legacy raw PVs remain source facts.
- Updated `exceptions/ID10/EXC-0001-status-readback-diagnostic-pvs.md` and `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md` to describe the active SEO_v2 review state.
- Created `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md` for 46 raw items that active rules cannot normalize without owner decisions.
- Updated `outputs/ID10/LEGACY_V0_NOTICE.md` so it no longer contradicts the regenerated SEO_v2 outputs.

## Findings

### Finding 1

- Severity: error
- Location: `outputs/ID10/pv_registry.yaml`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Canonical Source and PV Identity Structure
- Problem: The reviewed registry declared `rulebook_version: v0` and rendered PVs as `ID10:{Area}:{Device}:{AxisOrFunction}`, which is not valid active SEO_v2 output.
- Recommendation: Fixed for rule-supported rows by rewriting the registry to `rulebook_version: SEO_v2` and `BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]`; unresolved rows are now tracked by exception records.

### Finding 2

- Severity: error
- Location: `outputs/ID10/PV_REFERENCE.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Canonical Source
- Problem: The reference document rendered the stale v0 PV set and v0 columns, so it did not match the active SEO_v2 registry contract.
- Recommendation: Fixed by regenerating the reference from `pv_registry.yaml` with `PV Name | Port | Area | Device | Subdevice | Signal | Status | Notes`.

### Finding 3

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Fix Policy, Area, Device, Subdevice
- Problem: 46 raw items need area/device/subdevice choices that active rulebooks do not settle, including masks/attenuator, legacy M1/M2 mirrors, zone plate, sample/detector rows, and SSA aperture rows.
- Recommendation: Keep these rows out of the canonical registry until the owner confirms mappings or approves a rule proposal.

### Finding 4

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0001-status-readback-diagnostic-pvs.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Exception Checks and Source Traceability
- Problem: Status, readback, diagnostic, XBPM, ring, IOC heartbeat, and scan-publish rows remain real source items but do not have settled active SEO_v2 classifications.
- Recommendation: Decide the status/readback/diagnostic naming policy before adding these rows to `pv_registry.yaml`.

### Finding 5

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Fix Policy
- Problem: `RAW-0112` and `RAW-0113` could fit the active `IVU-ENC` grouping, but the source explicitly questions whether they are readbacks rather than motor-like PVs.
- Recommendation: Decide whether IVU encoder values should be registry PVs, readbacks, or metadata attached to IVU entries.

## User Decisions Needed

- Resolve the raw IDs in `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md` by confirming active area/device/subdevice mappings or requesting a rule proposal.
- Decide the status/readback/diagnostic/XBPM/ring/IOC/scan-publish policy tracked by `EXC-0001`.
- Decide the IVU encoder classification tracked by `EXC-0002`.

## Remaining Warnings

- `reviews/ID10/SELF_REVIEW.md` is historical v0 draft context; use this `REVIEW.md` for the active SEO_v2 review state.
- `outputs/ID10/_work/raw_extracted_pvs.yaml` intentionally preserves legacy `raw_pv` and `raw_axis_or_function` values as source facts; normalized active fields are in `pv_registry.yaml`.
- `10C` is used as the active port following the SEO_v2 DB-backed examples; this remains a known Markdown-vs-DB source conflict documented by the active rulebooks.

## Exceptions Or Proposals Recommended

- Create or approve a proposal if zone plate (`ZP`), secondary source aperture (`SSA`), or detector/sample variants require new active SEO_v2 device/subdevice codes.
- Promote a status/readback/diagnostic naming policy before normalizing the `EXC-0001` raw IDs.
- Confirm whether `M1`/`M2` are `HHLM-MIRR` instances or need separate active device policy.
