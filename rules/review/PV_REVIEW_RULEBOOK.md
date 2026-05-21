# PV Naming Review Rulebook

Version: SEO_v2 / 4GSR standard v1.0
Status: active review rulebook
Last updated: 2026-05-20

## Purpose

This rulebook defines how to review generated PV registries and reference
documents under the active SEO_v2 4GSR naming standard.

Review mode is review-and-fix by default. If a violation has a clear correction
under the active rules, apply the correction to `outputs/<beamline>/` and log it
in `reviews/<beamline>/REVIEW.md`.

If the user explicitly asks for read-only review, do not edit generated outputs.

## Required Sources

Before reviewing, read:

1. `ARCHITECTURE.md`;
2. `AGENTS.md`;
3. `rules/draft/PV_NAMING_RULEBOOK.md`;
4. this rulebook;
5. generated output under `outputs/<beamline>/`;
6. source input when available.

Read `rules/decisions/` only when the active rulebooks do not resolve an
ambiguous case.

## Decision Order

Review mode must use this decision order:

1. apply this active review rulebook;
2. check `rules/draft/PV_NAMING_RULEBOOK.md` for the intended generated form;
3. check examples for accepted or rejected patterns;
4. check `rules/decisions/` for rationale only when active rules and examples do
   not resolve the case;
5. if still ambiguous, ask the user or mark the item `decision_required` and use
   the exception/proposal workflow.

Authority order:

```text
active rulebooks > examples > rules/decisions > notes/temp
```

Inputs are source data, not rule authority. Use `inputs/` or explicitly
user-provided paths to verify traceability and source facts, not to introduce
naming policy.

## Review Output

Write the review log to:

```text
reviews/<beamline>/REVIEW.md
```

The review log should include:

```text
Applied Fixes
Findings
User Decisions Needed
Remaining Warnings
Exceptions Or Proposals Recommended
```

If the review is read-only, state that clearly near the top.

Use these severities:

```text
error
warning
info
decision_required
```

Each finding should include:

```text
Severity
Location
Rule
Problem
Recommendation
```

Use file and line references when possible.

## Fix Policy

Apply direct fixes when all of the following are true:

- the correction is supported by an active rulebook or a directly matching
  accepted example;
- the correction does not require a policy choice;
- the correction does not expand the PV list beyond the reviewed source;
- the corrected output can be traced to source material or structured fields.

Direct fixes must not change `source_trace.raw_id`, `source_trace.source_id`, or
`source_trace.source_anchor`. If those identifiers are wrong, report an error
and require re-extraction or a clearly logged regeneration.

Ask the user or mark `decision_required` when the issue involves:

- uncertain area, device, or subdevice assignment;
- a code token not covered by active rules;
- duplicate rendered PV names that require instance or signal policy;
- conflict between the SEO_v2 Markdown standard and SEO_v2 DB data;
- a source conflict.

## Required Checks

### Canonical Source

Check that `pv_registry.yaml` exists when an output is claimed to be generated.

Check that the registry declares:

```yaml
rulebook_version: SEO_v2
```

Check that `PV_REFERENCE.md` explicitly states that `pv_registry.yaml` is the
authoritative source and that the Markdown file should not be hand-edited.

Compare the rendered PV set in `PV_REFERENCE.md` against `pv_registry.yaml`.
Report an error when the reference omits registry PVs, includes stale extra PVs,
or renders PV names that differ from the registry. Markdown table order may
differ only when the content is otherwise identical.

### Raw Extraction And Coverage

When the source is a directory, contains multiple files, contains structured
files such as JSON or XML, or contains more than one PV-like entry, check that
this file exists:

```text
outputs/<beamline>/_work/raw_extracted_pvs.yaml
```

Check that:

- every source file in the requested scope is listed under `extracted_from`;
- explicitly excluded files are listed with `source_state: excluded` and a
  non-empty `exclude_reason`;
- included files with no PV-like entries are listed with `source_state: included`
  and `pv_like_entries: 0`;
- every raw item has a unique `raw_id` matching `RAW-[0-9]{4}`;
- every raw item has a non-null `source_trace.source_anchor`;
- raw IDs follow extraction order unless the self-review logs a full
  regeneration;
- every registry entry references `source_trace.raw_id`;
- every exception record references its related `raw_id` values;
- every registry or exception `raw_id` resolves to an entry in
  `raw_extracted_pvs.yaml`;
- skipped raw items remain in `raw_extracted_pvs.yaml` with `status: skipped` and
  a non-empty `skip_reason`;
- the self-review records this coverage equation:

```text
raw_id_set(raw_extracted_pvs.yaml)
  == union(
       raw_ids linked from pv_registry.yaml,
       raw_ids linked from exceptions/<beamline>/,
       raw_ids with status: skipped
     )
```

Report an error when the coverage equation is missing or does not balance.

### PV Identity Structure

Each active PV must follow:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

Regex:

```text
^BL-[0-9]{2}[A-Z]:[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+:[A-Z][A-Za-z0-9]*$
```

Report an error for missing tiers, extra unapproved tiers, lowercase
area/device/subdevice tokens, underscores in `SignalName`, or the older v0
shape:

```text
ID10:{Area}:{Device}:{AxisOrFunction}
```

### Structured Field Consistency

If structured fields are present, verify:

```text
pv == section + "-" + port + ":" + area + "-" + device + "-" + subdevice + ":" + signal
```

Report an error for mismatches.

Minimum expected fields:

```yaml
section: BL
port: 10C
area: OH
device: MONO
subdevice: CRYS
signal: Theta
pv: BL-10C:OH-MONO-CRYS:Theta
```

### Beamline Level

`section` must be `BL`.

`port` must match:

```text
[0-9]{2}[A-Z]
```

Do not reject `10C` solely because it is absent from the SEO_v2 Markdown port
table. Report an info or warning note that the Markdown and DB sources disagree
when that conflict affects the reviewed scope.

### Area

Accepted area values:

```text
FE
PTL
OH
EH
SYS
```

Report an error for unknown area values unless the entry is explicitly marked
`decision_required` or `exception`.

Report an error when an unknown area is silently defaulted to `PTL`. SEO_v2 does
not allow the old v0 unknown-area default.

### Device

Accepted device values:

```text
ATT
CCD
CTRL
FRMASK
HHLM
ION
IVU
KBHM
KBSLT
KBVM
MONO
MOTOR
MVMASK
SH
SMPL
WBSLT
```

Report an error for unknown device codes unless the entry is explicitly marked
`decision_required` or `exception`.

Warn when `MOTOR` hides a known physical device and the entry has no source
metadata or note explaining the generic mapping.

### Subdevice

Accepted subdevice values:

```text
BODY
CRYS
CTRL
DIAG
ENC
GIRD
INFO
LOGIC
MIRR
QUEUE
RES
SAVE
SCAN
SLIT
STG
TIME
UTIL
VALV
```

Report an error for missing subdevice or unknown subdevice codes unless the
entry is explicitly marked `decision_required` or `exception`.

### SignalName

`SignalName` must match:

```text
^[A-Z][A-Za-z0-9]*$
```

Report an error for lowercase/underscore v0-style suffixes such as:

```text
girder_y
taper_gap
scan_x
```

Report a warning when signal conversion appears lossy and no note preserves the
source label.

### Duplicate PVs

Report an error for duplicate `pv` values in a canonical registry.

If reviewing SEO_v2 DB-derived source material, duplicate `standardPv` values
must not be fixed by dropping rows or silently appending guessed instance
numbers. Mark them `decision_required` or create/recommend an exception or
proposal.

### Source Traceability

Each registry entry must include `source_trace`.

Minimum shape:

```yaml
source_trace:
  raw_id: RAW-0001
  source_id: inputs/SEO_v2/source.json
  source_line: null
  source_anchor: /0/standardPv
  source_label: BL-10C:OH-MONO-CRYS:Theta
```

Report an error when an entry cannot be traced to input material,
user-provided source, or an explicit generated assumption.

If `outputs/<beamline>/_work/raw_extracted_pvs.yaml` exists, report an error when
a registry entry lacks `source_trace.raw_id` or references a `raw_id` that cannot
be resolved in that extraction file.

Report an error when a registry entry or raw extracted item has a null or missing
`source_trace.source_anchor`.

### Status Values

Status should be one of:

```text
proposed
reviewed
approved
decision_required
exception
deprecated
legacy
```

Report a warning for missing status in draft output.

### Optional Metadata

Missing EGU, IOC, vendor, physical specification, original source PV, or note is
not an error unless the user requested a full metadata registry.

Report optional metadata gaps as info or warning only when they materially limit
review usefulness.

## Exception Checks

If an item cannot fit the active rules, check whether:

- it is marked `decision_required` or `exception`;
- the issue is described in notes;
- an exception record exists or is recommended.

Do not turn a one-off exception into a new rule during review.

## Review Stance

Review mode should improve generated outputs by default when fixes are clear and
rule-based.

Review mode must stay read-only when the user explicitly asks for review-only or
audit-only behavior.

Review mode must not make ambiguous policy decisions silently.
