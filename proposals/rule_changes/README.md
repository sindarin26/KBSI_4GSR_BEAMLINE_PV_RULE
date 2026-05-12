# Rule Change Proposals

Create one Markdown file per proposed rule change.

## File Naming

Use:

```text
proposals/rule_changes/PROP-0001-short-slug.md
```

Increment the numeric ID globally within `proposals/rule_changes/`.

## Required Frontmatter

```yaml
---
id: PROP-0001
status: draft
created: YYYY-MM-DD
related_exceptions: []
target_rulebooks:
  - rules/draft/PV_NAMING_RULEBOOK.md
---
```

Allowed status values:

```text
draft
accepted
promoted
rejected
superseded
```

Each proposal should include:

- problem statement;
- linked exception records;
- proposed rule text;
- examples before and after;
- expected impact on existing outputs;
- review status.

## Promotion

When accepted, a proposal is promoted by editing the active rulebook(s), examples
or schemas as needed, then changing the proposal status to `promoted`. Keep the
proposal file here as history.
