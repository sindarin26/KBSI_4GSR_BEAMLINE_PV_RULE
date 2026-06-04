---
id: PROP-0002
status: draft
created: 2026-06-04
related_exceptions: []
target_rulebooks:
  - rules/draft/PV_NAMING_RULEBOOK.md
  - rules/review/PV_REVIEW_RULEBOOK.md
  - schemas/database_pool.seo_v3.yaml
---

# Abbreviation Issue Resolution Contract

## Problem Statement

SEO_V3 database-pool rows store the rendered PV as six source-backed
components:

```text
section, port, area, device, subdevice, signal
```

The current abbreviation registry covers only component code review for:

```text
section, port, area, device, subdevice
```

`signal` remains outside the abbreviation registry and should be reviewed by
signal naming policy instead.

The repository already computes blocking abbreviation issues from row
components and `database_pool/abbreviations/registry.json`, but the resolution
contract is still implicit. Future abbreviation review must make it explicit
that confirming an abbreviation record resolves all derived row issues that
share the same resolution key.

## Current Structural Behavior

Current row files do not persist issue records. Abbreviation issues are derived
from source rows and the abbreviation registry:

```text
row component -> registry lookup -> approved or blocking issue
```

A component is approval-eligible only when the matching registry record exists
and has `status: "approved"`. Missing, candidate, deprecated, and rejected
records remain blocking.

This is already enough for exact-code resolution. For example:

```text
row.port = "10C"
registry entry global/port/10C is approved
=> all port:10C abbreviation issues are resolved when recomputed
```

## Proposed Derived Issue Shape

Abbreviation issues should remain derived, not copied into source rows as
durable data. Any consumer that materializes them should use this shape:

```json
{
  "issueType": "abbreviation",
  "field": "device",
  "kind": "device",
  "code": "PH",
  "sourceTerm": "Pinhole",
  "status": "missing_registry_entry",
  "blocking": true,
  "resolutionKey": "abbreviation:global:device:PH:Pinhole"
}
```

Required fields:

- `issueType`: `abbreviation`
- `field`: source-row field that raised the issue
- `kind`: registry kind, initially `section`, `port`, `area`, `device`, or
  `subdevice`
- `code`: component code used in the rendered PV
- `status`: lookup status such as `missing_registry_entry`, `candidate`,
  `deprecated`, or `rejected`
- `blocking`: true unless the matching registry entry is approved
- `resolutionKey`: stable key used to decide whether a registry confirmation
  resolves the issue

Optional fields:

- `sourceTerm`: source-backed human term or label that the abbreviation
  represents, such as `Pinhole`
- `sourceAnchor`: source row or document anchor used to explain the issue
- `candidateMeanings`: list of conflicting meanings when a code is ambiguous
- `matchedPattern`: approved pattern key when a numbered or patterned code is
  resolved by a pattern rather than an exact code

## Exact Abbreviation Resolution

An exact abbreviation confirmation records an approved registry entry:

```json
{
  "kind": "device",
  "code": "PH",
  "meaning": "Pinhole",
  "status": "approved",
  "scope": "global"
}
```

It resolves issues whose `resolutionKey` identifies the same scope, kind, code,
and meaning:

```text
abbreviation:global:device:PH:Pinhole
```

If a row only has a code but not a source-backed meaning, the issue may fall
back to a code-only key:

```text
abbreviation:global:device:PH
```

Code-only resolution is acceptable for unambiguous standard codes such as a
port identifier, but should be avoided for device/subdevice codes when source
terms are available.

## Pattern Abbreviation Resolution

Some component codes contain a base abbreviation plus an instance suffix. These
should not necessarily create one registry entry per instance.

Example:

```text
SLIT01, SLIT03, SLIT04
```

The preferred long-term structure is a pattern entry:

```json
{
  "kind": "subdevice",
  "codePattern": "SLIT##",
  "baseCode": "SLIT",
  "meaning": "Slit instance",
  "status": "approved",
  "scope": "global"
}
```

An approved pattern entry resolves matching instance issues:

```text
row.subdevice = "SLIT03"
matchedPattern = "SLIT##"
resolutionKey = "abbreviation-pattern:global:subdevice:SLIT##:Slit instance"
```

Pattern approval must be explicit. Approving `SLIT` as a base code must not
silently approve every `SLIT##` instance unless the registry also records the
approved instance pattern.

## Ambiguity And Conflict

The same code can be proposed for multiple meanings. For example, `PH` could
mean `Pinhole` in one source context and another phrase in another context.

When a code has multiple source-backed meanings, the derived issue should
remain blocking and expose a conflict:

```json
{
  "issueType": "abbreviation",
  "field": "device",
  "kind": "device",
  "code": "PH",
  "status": "meaning_conflict",
  "blocking": true,
  "candidateMeanings": ["Pinhole", "Pneumatic Holder"]
}
```

Agents must not resolve a conflict by choosing the most plausible meaning
without owner review or an approved rule.

## Row Approval Interaction

Abbreviation confirmation and row approval are related but separate actions.

An approved abbreviation can make a row eligible for approval by clearing one
blocking issue. It does not by itself approve the row. The row may still have
other unresolved abbreviation, source-trace, duplicate-PV, or signal-naming
issues.

Conversely, approving a row may provide evidence for candidate abbreviations,
but it should not silently promote every abbreviation inside that row. If row
approval is later used to propose abbreviation promotion, ambiguous or duplicate
candidate abbreviations must remain review-gated.

## Data Regeneration Implication

The existing 4GSR source rows are sufficient for exact-code blocking checks
because they contain `section`, `port`, `area`, `device`, and `subdevice`.

They are not sufficient for high-quality meaning-aware abbreviation review.
Future abbreviation confirmation needs source-backed component evidence,
especially:

- source term or label used to justify the abbreviation;
- whether the code is exact or pattern-derived;
- nearby narrative or migration evidence used by the importing agent;
- withheld alternatives and unresolved ambiguity;
- vocabulary status per component.

Therefore, before serious abbreviation review, regenerate the database-pool
source rows from `inputs/` with the enhanced component-evidence contract. The
regeneration should keep issues derived rather than durable, but rows must carry
enough evidence for deterministic issue derivation and reviewer-visible
explanation.

## Expected Impact

- Exact approvals such as `port:10C` can clear repeated blocking issues across
  many rows.
- Device/subdevice approvals can be tied to source terms, not only short codes.
- Instance-bearing codes such as `SLIT01` can be resolved through explicit
  pattern approval rather than many one-off registry entries.
- Ambiguous abbreviations remain blocking until reviewed.
- `signal` naming remains a separate issue class and should not be mixed into
  the abbreviation registry without a separate promoted rule.

## Review Status

Draft for team discussion. Not active naming policy until promoted into the
active rulebooks, schema contract, validators, and any importer/regeneration
prompt used to produce database-pool rows.
