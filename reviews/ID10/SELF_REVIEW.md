# ID10 Draft Self-Review

## Coverage

- Source files in scope: 7
- Raw extracted entries: 113
- Registry-linked raw IDs: 84
- Exception-linked raw IDs: 29
- Skipped raw IDs: 0
- Coverage union: 113 / 113

```text
raw_id_set(raw_extracted_pvs.yaml)
  == union(raw_ids linked from pv_registry.yaml, raw_ids linked from exceptions/ID10/, raw_ids with status: skipped)
```

Coverage result: pass. Every raw ID is accounted for by the registry or exception records.

## Errors

- None found in the draft pass.

## Warnings

- Status/readback/diagnostic/scan PVs are not normalized in v0 and are recorded in `exceptions/ID10/EXC-0001-status-readback-diagnostic-pvs.md`.
- IVU encoder PVs are not normalized because the source explicitly questions whether they are readbacks; see `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md`.
- Several device tokens are derived from source names and should be confirmed by the beamline manager: M01, M02, KBVM01, KBHM01, ZP01, SSA01, KBSLT01, FMASK01, MMASK01, ATT01.
- FMASK/MMASK/ATT area assignments use provisional PTL assumptions and need verification.
- Coordinate convention is still open; x/y/z axis meanings should be reviewed before approval.

## Assumptions

- Optics devices from `optics motors.json` are assigned to OH unless source evidence says otherwise.
- Sample and detector devices are assigned to EH.
- Source IOC values are preserved in metadata and notes; most rows came from simulation material.

## Exceptions Created

- `exceptions/ID10/EXC-0001-status-readback-diagnostic-pvs.md`
- `exceptions/ID10/EXC-0002-ivu-encoder-readback-classification.md`
