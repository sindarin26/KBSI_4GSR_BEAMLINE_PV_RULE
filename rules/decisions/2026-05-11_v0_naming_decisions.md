# V0 PV Naming Decisions

Date: 2026-05-11
Status: historical v0 decision context, superseded as active policy

This document records the historical v0 decisions and the reasoning behind them.
Those decisions were superseded as active policy on 2026-05-20 when the project
owner requested the repository be overhauled from `temp/SEO_v2`.

If this decision record conflicts with an active rulebook, the active rulebook
wins. This document is rationale and history, not the canonical rule source.

## Goal

The v0 workflow focuses on PV identity naming.

It does not fully define motor metadata, EPICS record fields, status PVs,
hardware IOC mapping, or final schema details.

## Prefix

Use `ID10` for v0.

`ID` means insertion device. Bending magnet beamlines may use a `BM` form later.
If the facility later requires an explicit beamline marker such as `BL-ID10`,
the generator/rendering policy should change rather than manually rewriting the
conceptual data model.

## PV Identity Structure

Use this structure:

```text
ID10:{Area}:{Device}:{AxisOrFunction}
```

Examples:

```text
ID10:PTL:IVU:girder_y
ID10:OH:DCM01:yaw
ID10:EH:STG01:x
ID10:OH:PH01:m01
ID10:OH:WBSLT01:hgap
```

## Area Tier

Use these area values:

```text
PTL
FE
OH
EH
```

Reasoning:

- Stable upstream/optics areas can be separated from frequently changing
  experiment-side systems through IOC, container, virtual environment, or
  physical server boundaries.
- Putting the area near the front of the PV name reduces accidental access and
  improves sorting/searching for beamline managers.
- `EH` represents experiment-hutch or user-facing operation zones. Some
  beamlines may not physically have an experiment hutch; user-facing areas can
  still be modeled later with `EH01`, `EH02`, etc. if needed.

If an area is unknown during draft generation, use `PTL` provisionally and add a
note such as:

```text
assumed PTL; verify area later
```

## Device Tier

The device tier should represent the main device unit recognized by operators.

Submechanisms usually remain in `AxisOrFunction` unless they are independently
operated, independently owned by an IOC/server, or commonly searched as a
standalone device.

Reasoning:

- Keeping the main device stable prevents the device tier from changing for
  every mechanical subcomponent.
- The v0 scope is PV identity naming, not a complete mechanical decomposition
  model.

## IVU Legacy Migration

The shared simulation material lists `Gap`, `TaperGap`, `Harmonic`, and
`Girder*` as motor PVs under IVU.

Preferred v0 migration:

```text
BL10:IVU:Gap          -> ID10:PTL:IVU:gap
BL10:IVU:TaperGap     -> ID10:PTL:IVU:taper_gap
BL10:IVU:Harmonic     -> ID10:PTL:IVU:harmonic
BL10:IVU:GirderX      -> ID10:PTL:IVU:girder_x
BL10:IVU:GirderY      -> ID10:PTL:IVU:girder_y
BL10:IVU:GirderPitch  -> ID10:PTL:IVU:girder_pitch
BL10:IVU:GirderYaw    -> ID10:PTL:IVU:girder_yaw
```

Do not convert legacy names by simple string replacement. Classify each legacy
PV into area, device, axis/function, and notes.

## Numbering

Use two digits for expandable items:

```text
PH01
PH02
PH12
DCM01
STG01
m01
m02
```

Reasoning: this avoids lexical sort problems such as `PH1`, `PH10`, `PH2`.

For v0 drafting, use two-digit indices for device-class instances when the
source is silent, except approved unindexed source-level devices such as `IVU`.

## Axis And Function Suffixes

Use lowercase suffixes in v0.

Use underscores for multi-word function suffixes:

```text
taper_gap
girder_pitch
```

For directionless or non-geometric mechanism axes, use:

```text
m01
m02
```

The final coordinate convention remains open. The current working assumption is:

```text
x = X-ray beam propagation direction
z = vertical/up direction
y = remaining axis from the right-hand rule
```

## White Beam Slit Token

Use `WBSLT` for White Beam Slit.

`SLT` is preferred over `SLIT` because the letter `I` can be confused with the
number `1` in PV names and UI displays. Treat `WBSLT` as an approved single
device token in v0 rather than splitting it into `WB-SLT`.

Use abbreviated axis/function suffixes:

```text
ID10:OH:WBSLT01:hgap
ID10:OH:WBSLT01:vgap
ID10:OH:WBSLT01:top
ID10:OH:WBSLT01:bot
ID10:OH:WBSLT01:inb
ID10:OH:WBSLT01:outb
```

## Output Direction

Use one canonical registry and one rendered human document per source/beamline
prefix.

```text
outputs/ID10/
  pv_registry.yaml
  PV_REFERENCE.md
```

`pv_registry.yaml` is authoritative. `PV_REFERENCE.md` is rendered
documentation. Draft self-review belongs in `reviews/ID10/SELF_REVIEW.md`.
Review/fix logs belong in `reviews/ID10/REVIEW.md`.

If one input batch contains multiple prefixes, split outputs by prefix.

## Exception Handling

If an item does not fit the active rules:

1. Do not invent a new rule silently.
2. Mark the item as `decision_required` or `exception`.
3. Record the case under `exceptions/<beamline>/`.
4. If the pattern is repeated or important, create a proposal under
   `proposals/rule_changes/`.
5. Promote only approved changes into `rules/`.

## Open Items

- Final coordinate convention.
- Status/readback/alarm/diagnostic PV naming beyond the v0 exception policy.
- Canonical table columns.
- No-hyphen rendering comparison examples.
