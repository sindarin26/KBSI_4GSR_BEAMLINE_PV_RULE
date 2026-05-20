# PV Naming Structure Options

Date: 2026-05-12
Status: historical discussion candidate, superseded by SEO_v2 promotion

This document records the historical structure-level discussion before the
SEO_v2 promotion fixed the active beamline PV naming standard.

The repository previously used a v0 rule kit. The active naming syntax was
changed on 2026-05-20 by updating active rulebooks, schemas, and examples.

## Current Situation

There are two practical directions.

### Option A: Accelerator-Aligned 3-Tier Structure

Candidate shape:

```text
[SEC/SYS]-[SUBSYS]:[DEV]-[SUBDEV]:[SignalName]
```

Example:

```text
BLP-10A:WBSLT-SLIT:Hgap
BLF-10A:IVU-GIRD:Y
BLE-10A:SMPL-STG:X
```

This option follows the style of the accelerator division naming pattern more
closely. The first colon tier combines beamline section/system and beamline port.
The second colon tier combines the main device and subdevice. The third tier is
the signal name.

Strengths:

- Easy to distribute as one simple standard document.
- Aligns more naturally with existing accelerator-side PV naming conventions.
- Makes `DEV` vs `SUBDEV` explicit.
- Keeps every PV at three colon-separated tiers.
- Handles sensors, controllers, and submechanisms through `SUBDEV`.

Risks:

- `PTL`, `FE`, `OH`, and `EH` are not separated as independent colon tiers.
- `BLP` can mix PTL and optics hutch concepts unless the standard defines the
  boundary carefully.
- String sorting may not naturally follow upstream-to-downstream operator views.
- Beamline-local server or IOC separation by hutch/area may require extra
  metadata or conventions outside the PV string.

### Option B: Beamline-Local 4-Tier Structure

Current v0 rulebook shape:

```text
{Prefix}:{Area}:{Device}:{AxisOrFunction}
```

Example:

```text
ID10:PTL:IVU:girder_y
ID10:OH:WBSLT01:hgap
ID10:EH:STG01:x
```

This option treats the beamline as its own naming domain. The area is a separate
colon tier so `PTL`, `FE`, `OH`, and `EH` can be grouped and reviewed directly.

Strengths:

- Directly supports area-level grouping for beamline operation.
- Makes stable upstream/optics areas easier to separate from experiment-side
  systems.
- Helps prevent accidental access across area boundaries.
- Sorts naturally by beamline prefix, area, device, and axis/function.
- Keeps the PV string focused on beamline manager workflow.

Risks:

- Less aligned with accelerator-side 3-tier naming style.
- Requires accepting that beamline PVs can have an independent convention.
- Device substructure may be less explicit unless encoded in device or
  axis/function rules.
- A future institution-wide standard may require migration.

## Shared Principles To Preserve

Regardless of the final structure, keep these principles:

- Group related PVs together for operation and review.
- Keep names intuitive for beamline managers.
- Preserve a clear separation concept for `PTL`, `FE`, `OH`, and `EH`, either in
  the PV string or in associated metadata.
- Use two-digit numbering for expandable instances where numbering is needed.
- Use approved device tokens such as `WBSLT` consistently.
- Keep `DEV` vs `SUBDEV` or equivalent device/subcomponent logic explicit.
- Keep source traceability from input material to generated output.

## Historical Working Decision

At the time of this discussion:

- Distribute a simple human-facing standard document first.
- Complete this repository as a v0 working rule kit.
- Keep the then-current active rulebooks usable until the final structure
  decision was made.
- Treat the 3-tier accelerator-aligned structure as a candidate, not an active
  replacement yet.
- If the 3-tier structure is accepted later, update `rules/draft/`,
  `rules/review/`, `schemas/`, and examples together.

That later promotion happened on 2026-05-20 using the SEO_v2 shape:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

## Open Questions For Review

- Should the final standard prioritize accelerator-side naming alignment or
  beamline-local operation?
- Should `OH` be added explicitly if the 3-tier structure is chosen?
- Should `PTL`, `FE`, `OH`, and `EH` live in the PV string, metadata, or both?
- Should single devices always carry a subdevice such as `BODY`, `CTRL`, or
  `STG`?
- Should final signal names use CamelCase or lowercase/underscore?
