---
id: EXC-0001
beamline: BL9ASIM
status: linked_to_proposal
created: 2026-05-29
source: inputs/BL9ASIM/eh_additional_equipment_source_inventory.md
raw_ids: []
related_proposals:
  - proposals/rule_changes/PROP-0001-third-party-epics-suffix-policy.md
---

# Third-Party EPICS Suffixes And SEO_V3 Tier Boundary

BL9ASIM source material includes third-party EPICS support references for
Eurotherm and areaDetector-based detector control.

Examples:

- Eurotherm support exposes temperature/process readback as `:PV:RBV`.
- Eurotherm support exposes setpoint and readback pairs such as `:SP` and
  `:SP:RBV`.
- ADCore and ADmarCCD expose suffixes such as `AcquireTime`,
  `AcquireTime_RBV`, `FilePath`, `FilePath_RBV`, `MarStatus_RBV`, and
  `DetectorDistance`.

These suffixes are real source facts, but directly appending colon-bearing
vendor suffixes into the SEO_V3 rendered PV would make the PV appear to have
more than the approved three rendered tiers:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

For example, directly rendering a Eurotherm source suffix could produce a shape
like:

```text
BL09A-EH:EURO-TC:PV:RBV
```

That shape is not valid SEO_V3 because `:PV:RBV` introduces an extra colon in
the signal tier.

## Why Current Rules Do Not Cover This

The active SEO_V3 discussion contract defines a single `SignalName` tier after
the second colon. It does not yet define how to map third-party EPICS suffix
trees into that signal tier while preserving source traceability.

This is not only a Eurotherm issue. Any vendor IOC or EPICS support module may
bring existing suffix grammar that uses `:`, `_RBV`, or other local conventions.

## Temporary Handling

- Do not modify upstream third-party support templates just to fit SEO_V3.
- Do not render colon-bearing vendor suffixes directly into `standardPv`.
- Keep the original third-party suffix in source metadata or source trace.
- Use reviewable SEO_V3 candidate signal names only after an explicit mapping
  decision.
- Treat `standardPv` as a registry/canonical label. Do not infer that a new
  runtime EPICS PV, alias, or soft record must be broadcast with that name.

## Required Decision

Decide whether third-party EPICS support suffixes should be:

1. translated into SEO_V3-compatible canonical signal names while preserving the
   vendor suffix in metadata/source trace;
2. allowed as a special lower-tier exception under the signal field;
3. rewritten in local IOC templates to use another separator such as `.`;
4. handled by another explicit compatibility profile.

Until the linked proposal is accepted and promoted, BL9ASIM third-party suffix
items should remain source facts or decision-required candidates, not approved
standard PVs.
