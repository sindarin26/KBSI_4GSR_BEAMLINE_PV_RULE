# 4GSR Beamline PV Naming Standard Candidate

Date: 2026-05-12
Status: candidate standard, not an active rulebook

This candidate is a human-facing PV naming standard based on an
accelerator-aligned three-tier PV shape.

It is intended for discussion and distribution. It does not replace the active
agent rulebooks until it is explicitly promoted.

## Purpose

Define a compact PV naming standard for 4GSR beamline control system signals.

The standard should:

- keep beamline PVs grouped by physical/system area;
- make device and subdevice structure visible;
- remain readable in operator GUIs, alarm tools, and archiver views;
- align with existing accelerator-side naming style where practical;
- preserve enough structure for later automated validation.

## Candidate PV Shape

Use three colon-separated tiers:

```text
[SEC/SYS]-[SUBSYS]:[DEV]-[SUBDEV]:[SignalName]
```

Example:

```text
BLP-10A:WBSLT-SLIT:Hgap
BLF-10A:IVU-GIRD:Y
BLE-10A:SMPL-STG:X
```

## Tier Definitions

### Tier 1: System And Port

```text
[SEC/SYS]-[SUBSYS]
```

`SEC/SYS` identifies the beamline system or section.

Initial candidate codes:

| Code | Meaning | Notes |
| --- | --- | --- |
| `BLF` | Beamline front-end | Storage ring/front-end/source-adjacent side |
| `BLP` | Beamline photon transport line | PTL and optics transport area |
| `BLE` | Beamline end-station | Experiment/user-facing area |

`SUBSYS` identifies the beamline port, such as:

```text
10A
10B
```

Open issue: if optics hutch separation must be explicit, decide whether `OH`
becomes a separate `SEC/SYS` code or metadata field.

### Tier 2: Device And Subdevice

```text
[DEV]-[SUBDEV]
```

`DEV` is the main device assembly. Use the smallest operator-recognized device
unit that should stay stable across subcomponent changes.

`SUBDEV` identifies the controlled subcomponent, sensor, body, stage, controller,
or functional unit inside the device.

Decision guide:

| Question | Use `DEV` For | Use `SUBDEV` For |
| --- | --- | --- |
| What is the installed device? | Device assembly | Not applicable |
| Which part is being controlled or read? | Not applicable | Component, body, stage, sensor, controller |
| Does it need separate operation/search? | Usually `DEV` | Sometimes `SUBDEV` |

If a device has no meaningful subcomponent, use a stable placeholder such as
`BODY`, `CTRL`, or `STG` rather than dropping the hyphen.

Initial candidate device codes:

| Code | Meaning | Code | Meaning |
| --- | --- | --- | --- |
| `IVU` | In-vacuum undulator | `FRMASK` | Fixed/front mask |
| `MONO` | Monochromator | `MVMASK` | Movable mask |
| `HHLM` | High heat load mirror | `WBSLT` | White beam slit |
| `KBVM` | Vertical KB mirror | `KBSLT` | KB slit |
| `KBHM` | Horizontal KB mirror | `ION` | Ion chamber |
| `SMPL` | Sample stage | `ATT` | Attenuator |
| `SH` | Shutter | `CCD` | Detector/camera |

Initial candidate subdevice codes:

| Code | Meaning | Code | Meaning |
| --- | --- | --- | --- |
| `BODY` | Main body | `CTRL` | Controller or PLC |
| `GIRD` | Girder | `STG` | Stage |
| `ENC` | Encoder | `MIRR` | Mirror unit |
| `SLIT` | Slit unit | `CRYS` | Crystal unit |
| `DIAG` | Diagnostics | `VALV` | Valve unit |

### Tier 3: Signal

```text
[SignalName]
```

`SignalName` identifies the physical quantity, function, or record-level signal.

Candidate examples:

| Signal | Meaning |
| --- | --- |
| `X`, `Y`, `Z` | Position axes |
| `Pitch`, `Yaw`, `Roll` | Angular axes |
| `Top`, `Bot`, `Inb`, `Outb` | Slit blade positions |
| `Hgap`, `Vgap` | Horizontal/vertical gap |
| `Hcen`, `Vcen` | Horizontal/vertical center |
| `Curr`, `Volt` | Current/voltage |
| `Stat` | Status |
| `RB` | Readback |
| `Setpt` | Setpoint |

Open issue: decide whether the final signal convention uses CamelCase or the
current v0 active rulebook style of lowercase and underscores.

## Syntax Rules

- Use colon (`:`) between the three tiers.
- Use hyphen (`-`) inside Tier 1 and Tier 2.
- Keep the Tier 2 hyphen even for simple devices.
- Use two-digit instance numbers when multiple instances are expected.
- Use approved abbreviations from the standard table.
- Do not create new device/subdevice codes silently; route gaps through review
  or proposal workflow.

## Examples

```text
BLF-10A:IVU-GIRD:Y
BLF-10A:IVU-ENC:US
BLP-10A:MONO-CRYS:Theta
BLP-10A:WBSLT-SLIT:Vgap
BLP-10A:ION-BODY:Curr
BLE-10A:SMPL-STG:X
BLE-10A:CCD-BODY:Stat
BLE-10A:ATT-STG:Pos
```

## Relationship To Current V0 Rulebook

The current active v0 rulebook uses:

```text
ID10:{Area}:{Device}:{AxisOrFunction}
```

This candidate uses:

```text
[SEC/SYS]-[SUBSYS]:[DEV]-[SUBDEV]:[SignalName]
```

Do not mix the two as active rules. Use this document for human discussion until
the project owner promotes one structure into the active rulebooks and schemas.

