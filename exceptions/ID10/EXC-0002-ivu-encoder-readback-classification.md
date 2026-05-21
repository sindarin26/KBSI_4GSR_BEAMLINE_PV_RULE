---
id: EXC-0002
beamline: ID10
status: open
created: 2026-05-12
updated: 2026-05-21
source: inputs/ID10/undulator.md
raw_ids:
  - RAW-0112
  - RAW-0113
related_proposals: []
---

# IVU Encoder Classification

The active examples keep `IVU-ENC` as a valid source-backed grouping, but the source note says `EncUS` and `EncDS` may need to be treated as readbacks rather than motors.

Temporary handling: keep these raw items out of `pv_registry.yaml` and account for them through this exception record.

Required decision: decide whether IVU encoder values are motor-like PVs, readback PVs, or metadata attached to IVU gap/girder entries.
