---
id: PROP-0001
status: draft
created: 2026-05-29
related_exceptions:
  - exceptions/BL9ASIM/EXC-0001-third-party-epics-suffix-tier-boundary.md
target_rulebooks:
  - rules/draft/PV_NAMING_RULEBOOK.md
  - rules/review/PV_REVIEW_RULEBOOK.md
---

# Third-Party EPICS Suffix Mapping Policy

## Problem Statement

The SEO_V3 rendered PV shape is:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

Third-party EPICS support modules often provide existing suffix grammar that
does not fit directly into one `SignalName` token. Eurotherm is the first
BL9ASIM example: the measured temperature/process value is exposed as
`:PV:RBV`. If rendered directly, it would add an extra colon and look like a
four-tier PV:

```text
BL09A-EH:EURO-TC:PV:RBV
```

The same class of issue can occur with areaDetector, motor records, vendor
drivers, or any EPICS support that carries its own suffix tree.

## Scope Clarification

In this proposal, `standardPv` means the canonical PV label stored in the
review/database-pool registry. It does not mean that the controls system must
immediately broadcast a new EPICS PV with that name.

Runtime deployment is a separate decision. A reviewed `standardPv` may later be
used as:

1. documentation and search metadata only;
2. an alias or soft PV name in a deployed IOC;
3. a target name for a future IOC refactor;
4. a rejected candidate if the team decides the vendor PV must remain the only
   operational name.

This proposal only covers how to record and review the naming relationship
without breaking the SEO_V3 three-tier contract.

## Proposed Default Rule

Do not modify upstream third-party EPICS templates only to satisfy the SEO_V3
rendered PV shape.

For third-party support PVs:

1. Treat the vendor PV or suffix as source evidence, not as the final
   `standardPv`.
2. Record SEO_V3 `standardPv` candidates with one canonical `SignalName` token.
3. Preserve the original vendor PV or suffix in source trace or metadata.
4. If a lossless canonical mapping is not obvious, mark the row
   `needs_input` or create an exception.
5. Do not imply runtime aliasing or additional EPICS broadcasting unless a
   separate deployment decision explicitly says so.

## Candidate Mapping Examples

Eurotherm source suffixes:

| Source suffix | Candidate SEO_V3 signal | Notes |
| --- | --- | --- |
| `:SP` | `TempSet` or `Setpoint` | Needs team decision on signal vocabulary. |
| `:SP:RBV` | `TempSetRbv` or `SetpointRbv` | Preserve vendor suffix in metadata. |
| `:PV:RBV` | `TempRbv` or `ProcessTempRbv` | This is the TC/process temperature readback. |
| `:AUTOTUNELOOP` | `AutotuneLoop` | Autotune naming policy still needs review. |

areaDetector source suffixes:

| Source suffix | Candidate SEO_V3 signal | Notes |
| --- | --- | --- |
| `AcquireTime` | `AcquireTime` | Already one token; likely compatible. |
| `AcquireTime_RBV` | `AcquireTimeRbv` | Normalize `_RBV` if the rulebook adopts `Rbv`. |
| `FilePath_RBV` | `FilePathRbv` | File/status PV policy still needs review. |
| `MarStatus_RBV` | `MarStatusRbv` | marCCD-specific status policy still needs review. |

## Options For Team Review

### Option A: Canonical Wrapper Signals

Map third-party suffixes into SEO_V3-compatible canonical `SignalName` values.
Keep the vendor suffix in metadata/source trace.

Pros:

- Preserves the three-tier SEO_V3 rendered shape.
- Avoids editing third-party templates.
- Keeps standard PVs comparable across vendors.

Cons:

- Requires a maintained mapping table.
- Some vendor suffix semantics may be ambiguous.

### Option B: Allow A Vendor Suffix Subpath In Metadata Only

Keep `standardPv` canonical, but add a structured metadata field such as
`vendorSuffix`, `vendorPv`, or `sourceSignalPath`.

Pros:

- Avoids changing the rendered PV grammar.
- Keeps source trace lossless.

Cons:

- Requires database-pool schema and UI support for the metadata.

### Option C: Rewrite Local IOC Templates

Change a local copy, fork, or site-specific substitution layer of the IOC
templates so vendor suffixes use a separator such as `.` or another local
convention. This does not mean editing the upstream GitHub project directly.

Pros:

- May make local PVs easier to parse with a site-specific convention.

Cons:

- Diverges from upstream support modules.
- May make maintenance and upgrades harder because upstream updates must be
  reviewed and re-applied against the local changes.
- `.` is not currently allowed in the promoted SEO_V3 `SignalName` grammar.

### Option D: Permit Third-Party Rendered Exceptions

Allow selected third-party PVs to render with additional colon-delimited lower
tiers below `SignalName`.

Pros:

- Preserves vendor PVs exactly.

Cons:

- Weakens the SEO_V3 contract.
- Makes parsing and comparison less deterministic.
- Could normalize the exception into the rule instead of keeping it rare.

## Recommended Direction

Start with Option A plus Option B:

- `standardPv` stays SEO_V3-shaped as a registry/canonical label.
- third-party suffixes stay in source trace/metadata.
- a small mapping table is created for reviewed vendor suffixes.
- unknown suffixes remain `needs_input` or exception-linked.
- deployed EPICS PV names are not changed by this proposal alone.

Avoid Option C unless the controls team explicitly wants local IOC divergence.
Avoid Option D unless a concrete deployed system cannot be wrapped without
breaking operations.

If Option C is selected for a deployed IOC, record it as a local maintenance
contract: the local template changes must be reviewed whenever the upstream
third-party support module is updated.

## Expected Impact

- BL9ASIM Eurotherm TC/readback rows can be drafted without producing
  four-tier-looking standard PVs.
- Rayonix/ADmarCCD and ADCore detector rows can preserve source suffixes while
  using SEO_V3-compatible signal names.
- Review tooling should expose both the canonical candidate signal and the
  source/vendor suffix so reviewers can verify the mapping.
- Runtime aliasing, soft PV creation, or IOC renaming remains a later
  controls/deployment decision.

## Review Status

Draft for team discussion. Not active naming policy until promoted into the
active draft/review rulebooks and any needed schemas/examples.
