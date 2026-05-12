# Exceptions

This directory contains real cases that the active rulebooks cannot represent
cleanly.

Agents should create an exception record when an input item cannot be handled by
current rules while generating or editing outputs. In read-only contexts, agents
may recommend an exception record instead of creating it.

Exception records should include:

- source file or user-provided source;
- `raw_id` and source trace when `raw_extracted_pvs.yaml` exists;
- beamline/prefix;
- unsupported case;
- why current rules do not cover it;
- proposed temporary output status, such as `decision_required` or `exception`;
- link to the registry entry when the same `raw_id` is also kept in
  `pv_registry.yaml`;
- optional link to a rule-change proposal.

## File Naming

Use:

```text
exceptions/<beamline>/EXC-0001-short-slug.md
```

Increment the numeric ID within each beamline directory.

## Required Frontmatter

```yaml
---
id: EXC-0001
beamline: ID10
status: open
created: YYYY-MM-DD
source: path/or/user-message
raw_ids: []
related_proposals: []
---
```

Allowed status values:

```text
open
linked_to_proposal
resolved
rejected
```

Approved rules do not live here. Approved rules live in `rules/`.
