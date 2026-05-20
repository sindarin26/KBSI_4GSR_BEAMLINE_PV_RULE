---
id: EXC-0001
beamline: SEO_v2
status: open
created: 2026-05-20
source: inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
raw_ids: []
related_proposals: []
---

# EXC-0001: Duplicate SEO_v2 standardPv Values Need Instance Policy

Status: open
Date: 2026-05-20
Source:

```text
inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
```

## Summary

The SEO_v2 DB corpus contains duplicate rendered PV names. A canonical registry
cannot treat these rows as distinct active PV entries unless an instance policy
or other identity-disambiguation rule is approved.

## Evidence

Validation snapshot:

```text
rows: 2099
duplicate standardPv groups: 148
rows in duplicate groups: 1046
```

Representative duplicate groups:

```text
BL-10C:OH-MOTOR-STG:Able x84
BL-10C:OH-MOTOR-STG:ScanParms x84
BL-10C:OH-MOTOR-STG:Value x84
BL-10C:EH-MOTOR-STG:Able x25
BL-10C:OH-MOTOR-CTRL:CalcMove x10
```

## Why Current Rules Cannot Resolve It

The active SEO_v2 rendered form is:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

The duplicate rows share all rendered identity components. The source rows
usually differ by original `source`, sequence number, or implied motor/slit
instance, but the current active rulebook does not say whether that instance
belongs in `DEV`, `SUBDEV`, `SignalName`, or metadata.

## Temporary Handling

- Do not drop duplicate rows.
- Do not append guessed instance numbers silently.
- Mark affected generated registry entries `decision_required` or `exception`
  until a source-backed instance policy exists.
- Preserve original `seq`, `source`, and `standardPv` values in source metadata.

## Decision Needed

Choose a canonical disambiguation policy for repeated motor/slit/control rows.
Possible directions:

- encode instance in `DEV`, such as `MOTOR01`;
- encode instance in `SUBDEV`, such as `STG01`;
- encode source channel context in `SignalName`;
- keep rendered PV non-unique only as a non-canonical intermediate and require a
  separate unique source identifier for final registries.
