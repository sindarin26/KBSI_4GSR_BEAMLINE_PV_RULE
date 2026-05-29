# BL9ASIM UR3e EH PV Source Inventory

Collected: 2026-05-29

This file is source material for PV naming review. It is not active naming
policy and does not approve any generated SEO_V3 names. The user instruction for
this collection is that all listed UR3e items belong to EH.

## Source Scope

- Pool or working beamline label: `BL9ASIM`
- Target SEO_V3 section/port: `section=BL`, `port=09A`
- Area scope: `EH`
- Source project: `../UR3e_epics_automation_project`
- Current source branch observed: `master`
- Additional branch refs inspected without checkout:
  - `origin/2025_epics`
  - `origin/SOFTIOC_alpha`
  - `origin/SOFTIOC_beta`
  - `origin/softioc_test`
  - `origin/aug2025-update`

## Source Evidence

- Current `master` contains EPICS client PV usage for robot motors, gripper,
  movement mode, target slots, and status/control PVs.
  - `asset/ur3e_rcv.py`
  - `asset/motor_manager.py`
  - `asset/program_manager.py`
  - `asset/alignment_manager.py`
  - `ur3e_gui.ui`
  - `README.md`
- `origin/2025_epics:services/server.py` contains a caproto `PVGroup` simulator
  using `default_prefix="UR3E:SIM:"`.
- `origin/SOFTIOC_alpha:asset/ur3e_epics.py` and
  `origin/SOFTIOC_beta:asset/ur3e_epics.py` contain pythonSoftIOC builder PVs
  using `builder.SetDeviceName("ur:ur3ectr")`.
- `origin/SOFTIOC_alpha:README_SOFTIOC.md` and
  `origin/SOFTIOC_alpha:PV_softioc.md` document the `ur:ur3ectr:` external
  control PV interface.
- `origin/softioc_test:asset/ur3e_epics.py` includes the same `ur:ur3ectr:`
  SoftIOC family and also implements `CURRENT_LOCATION`.
- `origin/aug2025-update:softioc_server.py` contains an older standalone
  SoftIOC variant with `CALL_LOAD`, `CALL_UNLOAD`, `DMOV`, and `ERROR_MSG`.

## Robot Axis Map From Source

The UI and sequence source indicate two movement groups: joint axes `m1` through
`m6`, and pose axes `m7` through `m12`. Source programs use array order:
`BASE, Shoulder, Elbow, Wrist1, Wrist2, Wrist3, X, Y, Z, RX, RY, RZ, speed, acc,
mode`.

| Source PV root | Source label | Source group | EH naming review note |
| --- | --- | --- | --- |
| `ur:m1` | Base | joint | Candidate robot joint axis. |
| `ur:m2` | Shoulder | joint | Candidate robot joint axis. |
| `ur:m3` | Elbow | joint | Candidate robot joint axis. |
| `ur:m4` | Wrist 1 | joint | Candidate robot joint axis. |
| `ur:m5` | Wrist 2 | joint | Candidate robot joint axis. |
| `ur:m6` | Wrist 3 | joint | Also used as theta-like axis in alignment code; needs review. |
| `ur:m7` | X | pose | Candidate Cartesian X axis. |
| `ur:m8` | Y | pose | Candidate Cartesian Y axis. |
| `ur:m9` | Z | pose | Candidate Cartesian Z axis. |
| `ur:m10` | RX | pose | Candidate Cartesian rotation X axis. |
| `ur:m11` | RY | pose | Candidate Cartesian rotation Y axis. |
| `ur:m12` | RZ | pose | Candidate Cartesian rotation Z axis. |
| `urg:m1` | Gripper | gripper | Candidate gripper axis or actuator. |

## Current Motor And Gripper PV Inventory

These are source PVs observed on the current `master` branch. Template strings
such as `ur:m{i}.RBV` were expanded only where the surrounding source establishes
the concrete index range.

### Robot Motor Records

- Motor roots: `ur:m1`, `ur:m2`, `ur:m3`, `ur:m4`, `ur:m5`, `ur:m6`,
  `ur:m7`, `ur:m8`, `ur:m9`, `ur:m10`, `ur:m11`, `ur:m12`
- Commanded value fields used by source: `ur:m1.VAL` through `ur:m12.VAL`
- Readback fields used by source: `ur:m1.RBV` through `ur:m12.RBV`
- Done-moving fields used by source: `ur:m1.DMOV` through `ur:m12.DMOV`
- Tweak fields used through motor object/UI paths: `.TWV`, `.TWR`, `.TWF`
- Velocity/base-velocity fields observed explicitly: `ur:m1.VELO`,
  `ur:m1.VBAS`, `ur:m7.VELO`, `ur:m7.VBAS`

### Robot Status, Mode, And Target PVs

- `ur:MOVE_MODE`
- `ur:FREE_START`
- `ur:FREE_END`
- `ur:MOVE_ALL_STATUS`
- `ur:MOVE_ALL`
- `ur:VELJ`
- `ur:ACCJ`
- `ur:VELP`
- `ur:ACCP`
- `ur:CONTACT`
- `ur:TRANS_STAT`
- `ur:TRANS`
- `ur:TJ1`, `ur:TJ2`, `ur:TJ3`, `ur:TJ4`, `ur:TJ5`, `ur:TJ6`
- `ur:T1`, `ur:T2`, `ur:T3`, `ur:T4`, `ur:T5`, `ur:T6`,
  `ur:T7`, `ur:T8`, `ur:T9`, `ur:T10`, `ur:T11`, `ur:T12`

### Gripper PVs

- Motor root: `urg:m1`
- Motor fields observed: `urg:m1.VAL`, `urg:m1.RBV`, `urg:m1.TWV`,
  `urg:m1.VBAS`, `urg:m1.VELO`, `urg:m1.STATUS`
- Scalar control/status PVs: `urg:OPEN`, `urg:CLOSE`, `urg:SPEED`,
  `urg:FORCE`, `urg:STATUS`, `urg:CLOSED_POSITION`

## Caproto Simulator PVs

`origin/2025_epics:services/server.py` defines a caproto IOC with
`default_prefix="UR3E:SIM:"`. The full simulator PV names are:

- `UR3E:SIM:ON_START`
- `UR3E:SIM:LOAD`
- `UR3E:SIM:UNLOAD`
- `UR3E:SIM:ON_SAMPLE`
- `UR3E:SIM:ON_SAMPLE_RBV`
- `UR3E:SIM:NUM_SAMPLE`
- `UR3E:SIM:NUM_SAMPLE_RBV`
- `UR3E:SIM:EXPERIMENT_NAME`

These simulator PVs are sample load/unload control and state PVs, not the robot
axis motor PVs themselves.

## SoftIOC External Control PVs

The newer SoftIOC family uses prefix `ur:ur3ectr:`. The common PVs documented
or implemented in the `SOFTIOC_alpha`, `SOFTIOC_beta`, and `softioc_test`
branches are:

- `ur:ur3ectr:LOADED_SAMPLE_NUMBER`
- `ur:ur3ectr:ERR_MSG_SOFT`
- `ur:ur3ectr:ERR_MSG_HARD`
- `ur:ur3ectr:SEQ_DONE`
- `ur:ur3ectr:SELECTED_SAMPLE`
- `ur:ur3ectr:EXP_NAME`
- `ur:ur3ectr:LOAD`
- `ur:ur3ectr:UNLOAD`
- `ur:ur3ectr:E_STOP`
- `ur:ur3ectr:CLEAR_ERROR`
- `ur:ur3ectr:CLEAR_LOADED_SAMPLE`

`ur:ur3ectr:CURRENT_LOCATION` is documented in `SOFTIOC_alpha` and implemented
in `origin/softioc_test:asset/ur3e_epics.py`. Treat it as a candidate
documented status PV until the intended implementation branch is confirmed.

The older `origin/aug2025-update:softioc_server.py` variant uses the same
`ur:ur3ectr:` prefix but includes older names:

- `ur:ur3ectr:ERROR_MSG`
- `ur:ur3ectr:CURRENT_LOCATION`
- `ur:ur3ectr:DMOV`
- `ur:ur3ectr:CALL_LOAD`
- `ur:ur3ectr:CALL_UNLOAD`

These older names should be treated as historical or migration candidates unless
the user selects that branch as the authoritative interface.

## Candidate Classification For Naming Review

All rows in this file should begin as reviewable source facts, not approved
standard names.

- Robot axes: likely EH robot/arm motor axes.
- Gripper: likely EH robot gripper actuator and gripper command/status PVs.
- `UR3E:SIM:*`: caproto simulator sample handling interface.
- `ur:ur3ectr:*`: SoftIOC sample handling, sequence state, external command,
  and error/status interface.
- `ur:T*` and `ur:TJ*`: target slot or trajectory target PVs; final role needs
  user review.
- `.RBV`, `.DMOV`, error PVs, and status PVs: readback/status/diagnostic
  category candidates, not ordinary motor-name examples unless the active rule
  explicitly covers them.

## Confirmed Drafting Decisions

- `BL9ASIM` is the pool/source label only.
- Draft SEO_V3 PV candidates should render with the rule-conformant beamline
  prefix `BL09A-...`, using `section=BL` and `port=09A`.
- User-provided area for this source package is `EH`.
- BL9ASIM should model three UR3e robot instances as `UR01`, `UR02`, and
  `UR03`, with `2.5 m`, `4.5 m`, and `6.5 m` retained as location metadata.

## Open Questions Before Standard PV Drafting

1. Choose the primary device/subdevice concept for the robot arm: for example
   one UR3e device with joint/pose/gripper subdevices, or separate robot-arm and
   gripper devices.
2. Decide whether joint labels `Base`, `Shoulder`, `Elbow`, `Wrist1`,
   `Wrist2`, `Wrist3` should become signal names, subdevice meanings, or
   instance metadata.
3. Decide whether pose axes `X`, `Y`, `Z`, `RX`, `RY`, `RZ` should be modeled
   as signals under a pose subdevice or as individual axis subdevices.
4. Confirm whether `ur:m6` should be named as `Wrist3`, `Theta`, or both with
   one treated as context metadata.
5. Confirm whether `UR3E:SIM:*` caproto PVs should be included in the same EH
   standardization batch or kept as simulator/test-interface examples.
6. Confirm which SoftIOC branch is authoritative for sample handling:
   `SOFTIOC_alpha/beta` names such as `LOAD` and `UNLOAD`, or the older
   `aug2025-update` names such as `CALL_LOAD` and `CALL_UNLOAD`.
