# SEO_v2 Promotion Decision

Date: 2026-05-20
Status: active decision context for SEO_v2 rulebook promotion

This record documents the promotion of the user-provided SEO_v2 material into
the active repository rulebooks.

If this decision record conflicts with an active rulebook, the active rulebook
wins. This document preserves rationale and source conflicts.

## Promoted Source Material

The project owner requested that the repository rules be overhauled from:

```text
temp/SEO_v2/
```

The originally referenced source files are:

```text
temp/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0.md
temp/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
```

The promoted in-repository copies are:

```text
standards/4GSR_Beamline_PV_Naming_Standard_v1.0.md
inputs/SEO_v2/4GSR_Beamline_PV_Naming_Standard_v1.0_DB.json
```

The Markdown document defines the human-facing 4GSR naming scheme. The DB JSON
contains 2099 observed standard PV mappings.

## Active Shape

The active PV shape is now:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

The previous v0 shape is no longer active for new generated outputs:

```text
ID10:{Area}:{Device}:{AxisOrFunction}
```

## Source-Backed Code Scope

The Markdown standard defines the core areas:

```text
FE
PTL
OH
EH
```

The DB corpus additionally uses:

```text
SYS
```

The Markdown standard defines device and subdevice code tables, while the DB
corpus also uses operational codes such as:

```text
CTRL
MOTOR
LOGIC
UTIL
INFO
TIME
SAVE
SCAN
QUEUE
RES
```

The active rulebooks accept these DB-backed operational extensions because the
user explicitly asked to base the overhaul on the SEO_v2 package, not only the
Markdown summary.

## Known Source Conflicts

The Markdown port table lists `01A` through `10B`, but every DB row uses `10C`.
The active rulebooks therefore accept `10C` when it is source-backed and require
the conflict to be recorded when relevant.

The DB corpus contains duplicate `standardPv` values. These duplicates are not
silently valid canonical registry duplicates. They require an instance policy,
source metadata, or exception/proposal handling before canonical generated
outputs can claim uniqueness.

## Validation Snapshot

The SEO_v2 DB corpus was inspected on 2026-05-20:

```text
rows: 2099
ports: 10C
areas: EH, FE, OH, PTL, SYS
devices: CTRL, HHLM, ION, MONO, MOTOR, WBSLT
subdevices: CRYS, CTRL, DIAG, INFO, LOGIC, MIRR, QUEUE, RES, SAVE, SCAN, SLIT, STG, TIME, UTIL
standardPv syntax mismatches: 0
field-to-render mismatches: 0
duplicate rendered PV groups: present
```

## Follow-Up Rule Items

Open items are tracked in:

```text
proposals/OPEN.md
```
