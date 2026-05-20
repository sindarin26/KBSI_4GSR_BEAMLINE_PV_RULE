# PV Naming Draft Rulebook

Version: SEO_v2 / 4GSR standard v1.0
Status: active draft-generation rulebook
Last updated: 2026-05-20

## Purpose

This rulebook defines how agents create or normalize beamline PV identity data
using the SEO_v2 4GSR beamline naming standard provided by the project owner.

The active PV name shape is now the SEO_v2 three-tier form:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

Example:

```text
BL-10C:OH-MONO-CRYS:Theta
```

Do not use the older v0 shape `ID10:{Area}:{Device}:{AxisOrFunction}` for new
active output. Older v0 files remain historical examples or legacy generated
material unless they are regenerated under this rulebook.

## Source Authority

The SEO_v2 source package originally referenced by the project owner is:

```text
temp/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0.md
temp/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
```

The promoted in-repository copies are:

```text
standards/4GSR_Beamline_PV_Naming_Standard_v1.0.md
inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
```

Because `temp/` is local scratch, it is not automatically an active rule source
in ordinary work. It was valid for this promotion because the user explicitly
requested the repository be overhauled from `temp/SEO_v2`; future work should
prefer the promoted in-repository copies.

Use this authority order while drafting:

1. this active draft rulebook;
2. `rules/review/PV_REVIEW_RULEBOOK.md`;
3. the SEO_v2 Markdown standard for human-facing structure and core code tables;
4. the SEO_v2 DB JSON for observed operational code values and exact examples;
5. examples under `examples/`;
6. `rules/decisions/` only when the active rulebooks do not resolve a case.

If the Markdown standard and DB JSON conflict, preserve the conflict in notes,
self-review, exception, or proposal material instead of silently choosing a
policy. Current known conflicts are documented in
`rules/decisions/2026-05-20_seo_v2_promotion.md`.

## Normal User Flow

When the user provides source material under `inputs/<beamline>/` and asks for a
PV list, create:

```text
outputs/<beamline>/_work/raw_extracted_pvs.yaml
outputs/<beamline>/pv_registry.yaml
outputs/<beamline>/PV_REFERENCE.md
reviews/<beamline>/SELF_REVIEW.md
```

If the active rules cannot represent an input item cleanly while generating or
editing outputs, create an exception record under:

```text
exceptions/<beamline>/
```

Only read-only contexts may recommend an exception without creating the
artifact.

## Required Sources

Before drafting, read:

1. `ARCHITECTURE.md`;
2. `AGENTS.md`;
3. this rulebook;
4. relevant input material under `inputs/` or user-specified paths.

Read `rules/decisions/` only when this rulebook does not resolve an ambiguity.

## PV Identity Structure

Use exactly three colon-separated tiers:

```text
beamline_level:device_level:signal_level
```

Rendered form:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

Canonical registry fields should store the rendered PV and its components:

```yaml
section: BL
port: 10C
area: OH
device: MONO
subdevice: CRYS
signal: Theta
pv: BL-10C:OH-MONO-CRYS:Theta
```

`pv` must equal:

```text
section + "-" + port + ":" + area + "-" + device + "-" + subdevice + ":" + signal
```

Do not drop `SUBDEV`. If the source does not provide a meaningful subdevice,
use a rule-supported placeholder such as `BODY`, `CTRL`, or `STG`, and record
the assumption.

## Beamline Level

The active beamline level is:

```text
BL-[PORT]
```

Rules:

- `section` is `BL` for current 4GSR beamline PVs.
- `port` should match `[0-9]{2}[A-Z]`, such as `10C`.
- Use the port explicitly provided by source material or user instruction.
- For the SEO_v2 DB reference set, the observed port is `10C`.

The SEO_v2 Markdown port table lists `01A` through `10B`, while the SEO_v2 DB
uses `10C` for every row. Do not reject `10C` solely because it is absent from
the Markdown table; record the source conflict when it matters.

## Area

`AREA` identifies the physical or functional location. Use uppercase tokens.

Core Markdown standard codes:

```text
FE
PTL
OH
EH
```

SEO_v2 DB-backed operational extension:

```text
SYS
```

Meanings:

```text
FE  = Front End
PTL = Photon Transport Line
OH  = Optical Hutch
EH  = Experimental Hutch
SYS = beamline control/system utilities observed in the SEO_v2 DB
```

Do not default unknown areas to `PTL`. If the source does not identify an area
and no active mapping resolves it, mark the item `decision_required` and create
or recommend an exception.

## Device

`DEV` identifies the main device assembly or system family. Use uppercase
tokens, preserving standard abbreviations.

Core Markdown standard device codes:

```text
IVU
FRMASK
MVMASK
MONO
HHLM
WBSLT
KBSLT
KBVM
KBHM
ION
SMPL
ATT
SH
CCD
```

SEO_v2 DB-backed operational extensions:

```text
CTRL
MOTOR
```

Use `CTRL` for beamline control/system utility channels when the source maps
them to `SYS-CTRL-*` in SEO_v2. Use `MOTOR` only when the source or SEO_v2 DB
represents a generic motor record family rather than a named physical assembly;
preserve the source label and add metadata or notes when the physical device is
hidden by the generic token.

Do not invent new device codes silently. If source material requires a device
outside the active list, mark it `decision_required` and use the
exception/proposal workflow.

## Subdevice

`SUBDEV` identifies a physical component, sensor, controller, or logical unit
inside the device. Use uppercase tokens.

Core Markdown standard subdevice codes:

```text
GIRD
BODY
STG
CTRL
ENC
MIRR
SLIT
CRYS
DIAG
VALV
```

SEO_v2 DB-backed operational extensions:

```text
INFO
LOGIC
QUEUE
RES
SAVE
SCAN
TIME
UTIL
```

Use the smallest subdevice that preserves the SEO_v2 grouping. Examples:

```text
IVU-GIRD
IVU-ENC
MONO-CRYS
HHLM-MIRR
WBSLT-SLIT
ION-DIAG
SYS-CTRL-LOGIC
```

## SignalName

`SignalName` identifies the quantity, function, command, status, or record-level
signal. Use upper-initial CamelCase/PascalCase with no underscores:

```text
^[A-Z][A-Za-z0-9]*$
```

Examples:

```text
X
Y
Z
Theta
Pitch
Yaw
Roll
Hgap
Vgap
Hcen
Vcen
Curr
CurrSetpt
PosRB
ScanParms
```

When converting source names with separators, underscores, lowercase EPICS
record names, or multiple colon tiers, tokenize the source and render an
upper-initial signal. Preserve source-specific abbreviations when they are
needed for traceability. If the conversion is lossy or unclear, add a note or
mark the item `decision_required`.

EPICS record fields such as `.VAL`, `.RBV`, `.DMOV`, and `.VELO` are not
separate PV identity tiers. Preserve them as source metadata or signal details
only when the source standard explicitly maps them into `SignalName`.

## Instance And Duplicate Policy

Use two-digit instance numbers when multiple same-class devices or subdevices
must be distinguished and the source standard provides or requires an instance.

Do not add instance numbers just to make a duplicate disappear. If source
material or SEO_v2 mappings produce duplicate rendered PV names, keep the source
rows traceable and mark the conflict `decision_required` or `exception` until
the owner decides whether the instance belongs in `DEV`, `SUBDEV`,
`SignalName`, metadata, or a separate source field.

Canonical registries must not contain duplicate `pv` values unless the duplicate
rows are explicitly marked `exception` and linked to an exception record that
documents the unresolved collision.

## Legacy Migration

Do not migrate legacy PV names by blind string replacement.

Classify each source item into:

```text
section
port
area
device
subdevice
signal
notes
```

Examples:

```text
BL10:IVU:GirderY   -> BL-10C:FE-IVU-GIRD:Y
BL10:IVU:EncUS     -> BL-10C:FE-IVU-ENC:US
BL10:WBS:Hgap      -> BL-10C:OH-WBSLT-SLIT:Hgap
BL10:DCM:Theta     -> BL-10C:OH-MONO-CRYS:Theta
```

If the source does not identify the correct area, subdevice, or port, do not
invent it silently. Record the assumption or route the case through exceptions.

## Source Extraction

Do not generate `pv_registry.yaml` directly from memory.

When source material is provided as a directory, inspect every file under that
directory unless the user narrows the scope. Source material may be split across
Markdown, plain text, JSON, XML, CSV, DB JSON, or free-form notes.

Inputs are source data, not rule authority. A note or memo under `inputs/` may
explain local context, but it must not create or override naming policy unless
an active rulebook or direct user instruction supports it.

Create a raw extraction list before normalization when the source is a
directory, contains multiple files, contains structured files such as JSON or
XML, or contains more than one PV-like entry:

```text
outputs/<beamline>/_work/raw_extracted_pvs.yaml
```

A PV-like entry is any source item that is intended to become, describe, or map
to a PV. Count:

- tokens matching common legacy PV forms, such as `BL10:IVU:GirderY`;
- tokens matching SEO_v2 rendered form,
  `BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]`;
- table rows, JSON objects, or XML elements with fields explicitly labeled as
  PV names, source PVs, devices, areas, subdevices, axes, signals, or controls;
- source rows that name a device and signal/function even when a legacy PV
  string is missing.

Record every source file in scope under `extracted_from`. Do not limit this list
to files that produced extracted PV rows.

Each extracted item must receive a stable `raw_id` in this format:

```text
RAW-0001
```

Assign raw IDs in deterministic order:

1. sort included `source_id` values lexically;
2. within each file, use source order;
3. for text and Markdown, source order is line order;
4. for JSON, source order is object/array order in the serialized file;
5. for XML, source order is document order.

Use this extraction shape:

```yaml
raw_id: RAW-0001
status: extracted
source_trace:
  source_id: inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
  source_line: null
  source_anchor: /0/standardPv
  source_label: BL-10C:OH-MONO-CRYS:Theta
raw_pv: BL-10C:OH-MONO-CRYS:Theta
raw_source_pv: "$(PREFIX):Mono:Theta"
raw_area: OH
raw_device: MONO
raw_subdevice: CRYS
raw_signal: Theta
raw_metadata:
  seq: 1
  note: Monochromator crystal angle
```

For text and Markdown, set `source_line` when known and use a `line:<number>`
anchor. For JSON, use a JSON Pointer style `source_anchor`. For XML, use an
XPath-like `source_anchor`. `source_anchor` must not be `null`.

If a PV-like raw item is intentionally not normalized, keep it in
`raw_extracted_pvs.yaml` with:

```yaml
status: skipped
skip_reason: explain why this item is not represented in the registry or exceptions
```

Skipped entries must not exist only as prose in `SELF_REVIEW.md`.

Before finalizing, perform a raw ID coverage check:

```text
raw_id_set(raw_extracted_pvs.yaml)
  == union(
       raw_ids linked from pv_registry.yaml,
       raw_ids linked from exceptions/<beamline>/,
       raw_ids with status: skipped
     )
```

Every registry or exception `raw_id` must resolve to an entry in
`raw_extracted_pvs.yaml`.

## Canonical Registry

The canonical output is:

```text
outputs/<beamline>/pv_registry.yaml
```

The registry should store PV identity fields separately from rendered PV names.
Use the SEO_v2 registry contract in:

```text
schemas/pv_registry.seo_v2.yaml
```

Minimum registry-level fields:

```yaml
beamline: BL-10C
rulebook_version: SEO_v2
pvs: []
```

Minimum fields for each PV entry:

```yaml
rulebook_version: SEO_v2
source_trace:
  raw_id: RAW-0001
  source_id: inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
  source_line: null
  source_anchor: /0/standardPv
  source_label: BL-10C:OH-MONO-CRYS:Theta
section: BL
port: 10C
area: OH
device: MONO
subdevice: CRYS
signal: Theta
pv: BL-10C:OH-MONO-CRYS:Theta
source_pv: "$(PREFIX):Mono:Theta"
status: proposed
notes: []
```

`source_trace` is required. If a raw extraction list exists, `raw_id` is also
required and must resolve to that list. Do not emit registry entries that cannot
be traced to input material, user-provided source, or an explicit generated
assumption.

Optional metadata may be included when available:

```yaml
metadata:
  seq: null
  note: null
  source: null
  egu: null
  ioc: null
```

Metadata should not block PV identity generation unless the user explicitly
requires a full technical registry.

## Rendered Reference

Create a human-readable reference document:

```text
outputs/<beamline>/PV_REFERENCE.md
```

The rendered document should clearly state that `pv_registry.yaml` is
authoritative.

Add a clear banner near the top:

```text
Generated from pv_registry.yaml. Do not hand-edit this file directly.
```

Use a stable table shape:

```text
PV Name | Port | Area | Device | Subdevice | Signal | Status | Notes
```

Include optional metadata columns only when useful and available.

## Review Report

Draft mode must run a self-review and write:

```text
reviews/<beamline>/SELF_REVIEW.md
```

The report should list:

- errors;
- warnings;
- assumptions;
- decision-required items;
- duplicate PV collisions;
- exceptions created or recommended.

## Exception Handling

If an item does not fit this rulebook:

1. do not invent a new rule silently;
2. keep the item in the registry only if a temporary representation is useful;
3. set status to `decision_required` or `exception`;
4. add a clear note;
5. when generating or editing outputs, create an exception record under
   `exceptions/<beamline>/`;
6. in read-only contexts, recommend an exception record instead of creating one;
7. if the case should become a general rule, recommend a proposal under
   `proposals/rule_changes/`.

## Status Values

Use these status values:

```text
proposed
reviewed
approved
decision_required
exception
deprecated
legacy
```

Most draft outputs should start as `proposed`.

Use `decision_required` when a registry entry can be represented temporarily but
needs human judgment. Use `exception` when the active rules cannot represent the
item cleanly and an exception record has been created or is required. Use
`legacy` only for preserved historical output that should not be treated as an
active SEO_v2 result.

## Drafting Priorities

When information is missing, classify it:

- Blocking: cannot form a SEO_v2 PV identity.
- Assumable: can continue with a recorded assumption supported by source
  evidence.
- Optional metadata: can be left null/TBD.

For SEO_v2, `area`, `device`, `subdevice`, and `signal` are blocking unless the
source or active rulebook provides a clear mapping.
