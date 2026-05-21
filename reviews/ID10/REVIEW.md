# ID10 Review

Review mode: active SEO_V3 review-and-fix pass. Source trace identifiers
(`source_trace.raw_id`, `source_trace.source_id`, and
`source_trace.source_anchor`) were preserved; this pass did not expand the PV
list or promote exceptions/proposals into active rules.

## Applied Fixes

- Migrated the 38 reviewed ID10 registry PVs from the SEO_v2 rendered form to
  the active SEO_V3 rendered form:
  `[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]`.
- Updated `outputs/ID10/pv_registry.yaml`, `outputs/ID10/status.yaml`, and
  `outputs/ID10/_work/raw_extracted_pvs.yaml` to `rulebook_version: SEO_V3`.
- Re-rendered `outputs/ID10/PV_REFERENCE.md` from `pv_registry.yaml`.
- Updated `outputs/ID10/MIGRATION_CONTEXT.md` so SEO_v2 is historical context,
  not the current output policy.
- Kept legacy source PVs only in `source_pv`, `source_trace.source_label`, raw
  extraction facts, and metadata.
- Follow-up review fix: aligned `examples/good/ID10_minimal_registry.yaml` to a
  single `BL10C` beamline and source-backed ID10 example.
- Follow-up review fix: removed the SEO_v2-style `SYS-CTRL-LOGIC` triple from
  active subdevice examples and hardened `validate_seo_v3_rules.js` to catch
  both regressions.

## Findings

### Finding 1

- Severity: info
- Location: `outputs/ID10/pv_registry.yaml`, `outputs/ID10/PV_REFERENCE.md`,
  `outputs/ID10/status.yaml`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Canonical Source, PV Identity
  Structure, Structured Field Consistency
- Problem: No active output error found after SEO_V3 migration. The registry
  declares `rulebook_version: SEO_V3`, has 38 unique rendered PVs, and each PV
  reconstructs from structured fields as
  `section + port + "-" + area + ":" + device + "-" + subdevice + ":" + signal`.
- Recommendation: Continue treating `pv_registry.yaml` as canonical and
  regenerate `PV_REFERENCE.md` through `scripts/render_reference.js`.

### Finding 2

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0003-unresolved-legacy-device-area-mappings.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Fix Policy, Area, Device,
  Subdevice
- Problem: 46 raw ID10 items still need owner-confirmed area/device/subdevice
  choices, including masks/attenuator, legacy M1/M2 mirrors, zone plate,
  sample/detector rows, and SSA aperture rows.
- Recommendation: Keep these rows out of the canonical registry until mappings
  are confirmed or a rule proposal is approved.

### Finding 3

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0001-status-readback-diagnostic-pvs.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Exception Checks and Source
  Traceability
- Problem: Status, readback, diagnostic, XBPM, ring, IOC heartbeat, and
  scan-publish rows remain real source items but do not have settled active
  SEO_V3 classifications.
- Recommendation: Decide the status/readback/diagnostic naming policy before
  adding these rows to `pv_registry.yaml`.

### Finding 4

- Severity: decision_required
- Location: `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Fix Policy
- Problem: `RAW-0112` and `RAW-0113` could fit `IVU-ENC`, but the source
  explicitly questions whether they are readbacks rather than motor-like PVs.
- Recommendation: Decide whether IVU encoder values should be registry PVs,
  readbacks, or metadata attached to IVU entries.

### Finding 5

- Severity: decision_required
- Location: `exceptions/SEO_v2/EXC-0001-duplicate-standardpv-instance-policy.md`,
  `proposals/OPEN.md`
- Rule: `rules/review/PV_REVIEW_RULEBOOK.md` — Duplicate PVs
- Problem: The historical SEO_v2 DB corpus contains duplicate rendered
  `standardPv` groups. SEO_V3 allows flexible `DEV`/`SUBDEV` tokens, but still
  does not decide where duplicate-instance disambiguation belongs.
- Recommendation: Keep this tracked until the owner approves a canonical
  instance/disambiguation policy.

## User Decisions Needed

- Resolve the raw IDs in `EXC-0003` by confirming area/device/subdevice mappings
  or requesting a rule proposal.
- Decide the status/readback/diagnostic/XBPM/ring/IOC/scan-publish policy
  tracked by `EXC-0001`.
- Decide the IVU encoder classification tracked by `EXC-0002`.
- Resolve historical duplicate `standardPv` groups if those DB rows should
  become canonical registry entries.

## Remaining Warnings

- `reviews/ID10/SELF_REVIEW.md` is historical v0 draft context; use this
  `REVIEW.md` for the active SEO_V3 review state.
- `outputs/ID10/_work/raw_extracted_pvs.yaml` intentionally preserves legacy
  `raw_pv` and `raw_axis_or_function` values as source facts.
- `10C` is retained from the historical ID10 source material; SEO_V3 validates
  its syntax and does not require a fixed port table yet.

## Exceptions Or Proposals Recommended

- Promote a status/readback/diagnostic naming policy before normalizing the
  `EXC-0001` raw IDs.
- Confirm whether `M1`/`M2` are `HHLM-MIRR` instances or need separate active
  device policy.
- Create or approve a proposal if zone plate (`ZP`), secondary source aperture
  (`SSA`), detector/sample variants, or beamline manager prose inputs require
  recurring device/subdevice conventions.
