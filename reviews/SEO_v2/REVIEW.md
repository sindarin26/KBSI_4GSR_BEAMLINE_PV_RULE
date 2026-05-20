# SEO_v2 Source Review

Date: 2026-05-20
Mode: architecture promotion source review
Source:

```text
standards/4GSR_Beamline_PV_Naming_Standard_v1.0.md
inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
```

## Summary

The SEO_v2 source package supports promoting the active rulebooks from the
historical v0 shape to:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

The DB corpus contains 2099 rows. Every `standardPv` matches the SEO_v2 rendered
syntax and every `standardPv` decomposes consistently into the row fields
`port`, `area`, `dev`, `subdev`, and `signal`.

## Applied Fixes

- Promoted the active draft and review rulebooks to SEO_v2.
- Added `schemas/pv_registry.seo_v2.yaml`.
- Updated active examples and README/status text to avoid treating the old v0
  shape as current policy.
- Preserved the human-facing standard under `standards/` and the DB corpus under
  `inputs/SEO_v2/`.

## Findings

### warning

Location: `standards/4GSR_Beamline_PV_Naming_Standard_v1.0.md`, port table; `inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json`

Rule: Beamline level

Problem: The Markdown port table lists ports through `10B`, but the DB corpus
uses `10C` for all 2099 rows.

Recommendation: Accept source-backed `10C` in active rules and update the
human-facing port table when the owner confirms the final published range.

### decision_required

Location: `inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json`

Rule: Duplicate PVs

Problem: The DB corpus contains 148 duplicate `standardPv` groups covering 1046
rows. The largest repeated groups are generic motor-family names such as
`BL-10C:OH-MOTOR-STG:ScanParms`, `BL-10C:OH-MOTOR-STG:Able`, and
`BL-10C:OH-MOTOR-STG:Value`.

Recommendation: Do not create a canonical registry from these rows until an
instance policy is approved. Track the case in
`exceptions/SEO_v2/EXC-0001-duplicate-standardpv-instance-policy.md`.

### info

Location: `inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json`

Rule: Code tables

Problem: The DB uses operational codes that are not in the Markdown summary
tables, including `SYS`, `CTRL`, `MOTOR`, `LOGIC`, `UTIL`, `INFO`, `TIME`,
`SAVE`, `SCAN`, `QUEUE`, and `RES`.

Recommendation: Treat these as DB-backed operational extensions in the active
rulebooks, then decide whether to publish them in the human-facing standard.

## User Decisions Needed

- Confirm whether the published port table should include `10C`.
- Decide where motor and slit instance identity belongs when many source rows
  map to the same `standardPv`.
- Decide whether DB-backed operational codes should be added to the published
  Markdown standard tables.

## Remaining Warnings

- Existing `outputs/ID10/` files are historical v0 generated material. They
  should be regenerated before being treated as active SEO_v2 output.

## Exceptions Or Proposals Recommended

- `exceptions/SEO_v2/EXC-0001-duplicate-standardpv-instance-policy.md`
- Open rule items in `proposals/OPEN.md`
