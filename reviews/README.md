# Reviews

Review logs should live here.

Draft self-review writes:

```text
reviews/<beamline>/SELF_REVIEW.md
```

Review mode writes:

```text
reviews/<beamline>/REVIEW.md
```

Review mode normally fixes clear rule violations directly in `outputs/` and uses
`REVIEW.md` as a log of applied fixes, remaining warnings, and decisions needed.
If the user explicitly asks for read-only review, `REVIEW.md` contains findings
only and generated outputs are not edited.

Use one subdirectory per beamline, for example:

```text
reviews/ID10/
```

Source-package promotion reviews may use a named source directory, such as:

```text
reviews/SEO_v2/
```

Historical SEO_v2 seed rows are fixtures, not review outputs. Keep them under:

```text
fixtures/SEO_v2/review_decisions.json
```
