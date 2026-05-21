---
id: EXC-0003
beamline: ID10
status: open
created: 2026-05-20
updated: 2026-05-21
source: inputs/ID10/
raw_ids:
  - RAW-0001
  - RAW-0002
  - RAW-0003
  - RAW-0004
  - RAW-0005
  - RAW-0006
  - RAW-0007
  - RAW-0008
  - RAW-0009
  - RAW-0010
  - RAW-0011
  - RAW-0012
  - RAW-0013
  - RAW-0014
  - RAW-0015
  - RAW-0016
  - RAW-0017
  - RAW-0018
  - RAW-0028
  - RAW-0029
  - RAW-0030
  - RAW-0031
  - RAW-0032
  - RAW-0033
  - RAW-0034
  - RAW-0035
  - RAW-0048
  - RAW-0049
  - RAW-0050
  - RAW-0051
  - RAW-0052
  - RAW-0053
  - RAW-0054
  - RAW-0055
  - RAW-0056
  - RAW-0057
  - RAW-0058
  - RAW-0059
  - RAW-0060
  - RAW-0061
  - RAW-0062
  - RAW-0063
  - RAW-0070
  - RAW-0071
  - RAW-0072
  - RAW-0073
related_proposals: []
---

# Unresolved Legacy Device And Area Mappings

These raw PVs are real source items, but active SEO_V3 review could not normalize them without making policy choices that the rulebooks do not settle.

Temporary handling: keep them out of `pv_registry.yaml` and account for them through this exception record.

Required decisions:

- Confirm area assignments for front mask, movable mask, and attenuator rows before using `FRMASK`, `MVMASK`, or `ATT` in active output.
- Decide whether legacy `M1`/`M2` mirrors map to `HHLM-MIRR` or require another owner-approved device/subdevice token.
- Decide whether zone plate (`ZP`), sample-stage (`SAM`), detector (`DET`), and secondary source aperture (`SSA`) source rows have owner-approved active device/subdevice mappings or require a rule proposal.
