---
id: EXC-0001
beamline: ID10
status: open
created: 2026-05-12
updated: 2026-05-21
source: inputs/ID10/status and xbpm.txt
raw_ids:
  - RAW-0078
  - RAW-0079
  - RAW-0080
  - RAW-0081
  - RAW-0082
  - RAW-0083
  - RAW-0084
  - RAW-0085
  - RAW-0086
  - RAW-0087
  - RAW-0088
  - RAW-0089
  - RAW-0090
  - RAW-0091
  - RAW-0092
  - RAW-0093
  - RAW-0094
  - RAW-0095
  - RAW-0096
  - RAW-0097
  - RAW-0098
  - RAW-0099
  - RAW-0100
  - RAW-0101
  - RAW-0102
  - RAW-0103
  - RAW-0104
related_proposals: []
---

# Status, Readback, Diagnostic, And Scan PVs

These raw PVs are real source items, but the active SEO_V3 review did not normalize them because their device/subdevice classification still requires an owner decision.

Temporary handling: keep them out of `pv_registry.yaml` and account for them through this exception record.

Required decision: define status/readback/diagnostic, XBPM, ring, IOC heartbeat, and scan-publish naming before promoting these into the canonical registry.
