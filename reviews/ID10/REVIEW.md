# ID10 Review

Review mode: generated-output review. No direct fixes were applied in this pass.

## Applied Fixes

- None.

## Findings

- info: `PV_REFERENCE.md` PV set matches `pv_registry.yaml` in this generated pass.
- warning: status/readback/diagnostic/scan PV naming remains open and is tracked by EXC-0001.
- warning: IVU encoder classification remains open and is tracked by EXC-0002.
- warning: unresolved device-token and provisional-area choices are marked `decision_required` in `pv_registry.yaml`.

## User Decisions Needed

- Decide whether final PV naming uses the current 4-tier rulebook or the accelerator-aligned 3-tier candidate.
- Decide status/readback/diagnostic/scan PV naming policy.
- Confirm area assignments for masks and attenuator.
- Confirm final coordinate convention.

## Remaining Warnings

- Generated registry is a v0 draft, not an approved beamline PV standard.

## Exceptions Or Proposals Recommended

- Promote repeated status/readback handling into a formal proposal after the naming structure decision is made.
