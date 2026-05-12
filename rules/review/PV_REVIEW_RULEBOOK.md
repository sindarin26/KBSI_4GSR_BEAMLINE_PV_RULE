# PV Naming Review Rulebook

Version: v0
Status: active review rulebook
Last updated: 2026-05-11

## Purpose

This rulebook defines how to review generated PV identity registries and
reference documents.

The review should find rule violations, ambiguous assumptions, missing
traceability, and cases that require exceptions or rule-change proposals.

Review mode is review-and-fix by default. If a violation has a clear correction
under the active rules, apply the correction to `outputs/<beamline>/` and log it
in `reviews/<beamline>/REVIEW.md`.

If the user explicitly asks for read-only review, do not edit generated outputs.

## Required Sources

Before reviewing, read:

1. `ARCHITECTURE.md`
2. `AGENTS.md`
3. `rules/draft/PV_NAMING_RULEBOOK.md`
4. this rulebook
5. generated output under `outputs/<beamline>/`
6. source input when available

Read `rules/decisions/` only when the active rulebooks do not resolve an
ambiguous case.

## Decision Order

Review mode must use this decision order:

1. Apply this active review rulebook.
2. Check `rules/draft/PV_NAMING_RULEBOOK.md` for the intended generated form.
3. Check examples for accepted or rejected patterns.
4. Check `rules/decisions/` for rationale only when active rules and examples do
   not resolve the case.
5. If still ambiguous, ask the user or mark the item `decision_required` and use
   the exception/proposal workflow.

Authority order:

```text
active rulebooks > examples > rules/decisions > notes/temp
```

If examples or decision records conflict with active rulebooks, the active
rulebooks win.

Inputs are source data, not rule authority. Use `inputs/` to verify traceability
and source facts, not to introduce naming policy.

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

## Finding Format

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
`source_trace.source_anchor`. If those identifiers are wrong, report an error and
require re-extraction or a clearly logged regeneration.

Decision records may explain why a rule exists, but they are not direct-fix
authority. If a correction is supported only by `rules/decisions/`, mark the item
`decision_required` or use the exception/proposal workflow instead of editing the
output directly.

Examples of direct fixes:

```text
WBS -> WBSLT
WBSLIT -> WBSLT
GirderY -> girder_y
TaperGap -> taper_gap
PH1 -> PH01
m1 -> m01
```

Ask the user or mark `decision_required` when the issue involves:

- uncertain area assignment;
- a new device token not covered by active rules;
- status/readback/alarm/diagnostic PV representation;
- coordinate meaning changes;
- a source conflict.

## Required Checks

### Canonical Source

Check that `pv_registry.yaml` exists when an output is claimed to be generated.

Check that the registry declares:

```yaml
rulebook_version: v0
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

The only normal exemption is a single-PV ad hoc user request. If this exemption
is used, the registry entry still needs `source_trace`.

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
Report an error when any raw ID is unaccounted for or referenced without existing
in `raw_extracted_pvs.yaml`.

Do not double-count a raw ID that appears in both the registry and an exception
record. This overlap is allowed only when the registry entry is marked
`decision_required` or `exception` and the exception record cross-links the same
case. Report an error for other duplicate accounting, such as the same raw ID in
multiple registry entries.

Spot-check extraction against source files. For text and Markdown, compare
PV-like token matches and source lines. For JSON and XML, compare the number of
PV-labeled objects/elements against extracted raw entries. Report a warning when
the extraction appears incomplete but the exact count cannot be proven manually.

### PV Identity Structure

Each PV must follow:

```text
{Prefix}:{Area}:{Device}:{AxisOrFunction}
```

For ID10 v0, the prefix must be:

```text
ID10
```

Report an error for missing tiers or extra unapproved tiers.

### Area

Area must be one of:

```text
PTL
FE
OH
EH
```

Glossary:

```text
PTL = photon transport line
FE = front end
OH = optics hutch
EH = experiment hutch or user-facing experiment operation zone
```

If `PTL` is used for an unknown area, the entry must include a note such as:

```text
assumed PTL; verify area later
```

Report a warning or `decision_required` finding if the source suggests a more
specific area but the output uses assumed `PTL`.

Default v0 area examples:

```text
IVU -> PTL
DCM01 -> OH
WBSLT01 -> OH
PH01 -> OH
STG01 -> EH
```

### Device

Device tokens should be uppercase except approved mixed tokens are not currently
defined in v0.

Expandable indexed devices should use two-digit numbers when numbered:

```text
PH01
STG01
WBSLT01
```

Report a warning for one-digit indices such as `PH1` or `m1`.

For v0, warn when a device-class instance appears unnumbered without an explicit
rule or note. Approved unindexed source-level devices include `IVU`.

### AxisOrFunction

Axis/function suffixes must be lowercase.

The suffix vocabulary is open in v0. Review format and traceability, not whether
the suffix appears in a closed vocabulary list.

Multi-word suffixes should use underscores:

```text
taper_gap
girder_pitch
```

Report an error for CamelCase suffixes in new v0 output, such as:

```text
GirderPitch
TaperGap
```

Report a warning when coordinate-related choices appear ambiguous and no note is
provided.

If `x`, `y`, or `z` is copied directly from an explicit source label, a
per-entry coordinate note is not required. If the output infers or changes
coordinate meaning, a note is required.

### Status, Readback, Alarm, And Diagnostic PVs

V0 does not define a complete naming policy for non-motor status, readback,
alarm, or diagnostic PVs.

Report `decision_required` if such PVs appear in the source but are silently
dropped or converted without an approved rule.

Do not require EPICS record fields such as `.VAL`, `.RBV`, `.DMOV`, and `.VELO`
to appear as separate PV identity entries.

### White Beam Slit

White Beam Slit must use:

```text
WBSLT
```

Report an error for v0 outputs that use:

```text
WBS
WB-SLIT
WBSLIT
SLITWB
```

Accepted suffixes for the v0 WBSLT blade controls:

```text
hgap
vgap
top
bot
inb
outb
```

### Composite Device Tokens

Composite device tokens should use `-` unless they are approved single tokens.

Approved single tokens in v0:

```text
IVU
WBSLT
```

Report a warning if a composite device token appears concatenated without a
hyphen and without an approved single-token rule.

### Legacy Migration

Report an error when an output appears to be a blind string replacement from a
legacy PV without v0 classification.

Examples of invalid or suspicious migration:

```text
ID10:IVU:Gap
ID10:PTL:IVU:GirderY
```

Preferred IVU examples:

```text
ID10:PTL:IVU:gap
ID10:PTL:IVU:taper_gap
ID10:PTL:IVU:girder_y
ID10:PTL:IVU:girder_pitch
```

### PV String Consistency

If structured fields are present, verify:

```text
pv == prefix + ":" + area + ":" + device + ":" + axis_or_function
```

Report an error for mismatches.

### Source Traceability

Each registry entry must include `source_trace`.

Minimum shape:

```yaml
source_trace:
  raw_id: RAW-0001
  source_id: inputs/ID10/raw_pv_source.md
  source_line: null
  source_anchor: /motors/0/yaw
  source_label: DCM yaw
```

Report an error when an entry cannot be traced to input material, user-provided
source, or an explicit generated assumption.

If `outputs/<beamline>/_work/raw_extracted_pvs.yaml` exists, report an error when
a registry entry lacks `source_trace.raw_id` or references a `raw_id` that cannot
be resolved in that extraction file.

Report an error when a registry entry or raw extracted item has a null or missing
`source_trace.source_anchor`.

Warn when a normalized PV shares no recognizable device, axis, or function token
with the raw PV or `source_label`, unless the entry includes a note explaining
the mapping. This is a sanity check for accidental rewrites; it is not a new
naming rule.

### Duplicate PVs

Report an error for duplicate PV names in the same registry.

### Status Values

Status should be one of:

```text
proposed
reviewed
approved
decision_required
exception
deprecated
```

Report a warning for missing status in draft output.

`decision_required` means the registry has a temporary representation that needs
human judgment. `exception` means current rules cannot represent the item
cleanly and an exception record exists or is required.

### Optional Metadata

Missing `EGU`, `Init`, `Low`, `High`, `Velocity`, IOC, vendor, or physical
specification is not an error in v0 unless the user requested a full metadata
registry.

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
