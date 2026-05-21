# Scripts

These scripts are internal workbench entry points. They validate or render data
from the active rulebooks and schemas, but they do not define naming policy.

Use:

```text
node scripts/validate_seo_v3_rules.js
node scripts/validate_registry.js ID10
node scripts/render_reference.js ID10 --check
node scripts/render_reference.js ID10 --write
```

`validate_seo_v3_rules.js` checks the active SEO_V3 rulebook shape, schema
presence, examples, and flexible `DEV`/`SUBDEV` token policy.
`validate_seo_v2_rules.js` is a legacy compatibility wrapper that runs the
SEO_V3 validation.

`validate_registry.js <beamline>` checks a generated output directory:

- `rulebook_version: SEO_V3`
- SEO_V3 PV regex
- structured field reconstruction
- accepted area/status values and device/subdevice token syntax from
  `schemas/pv_registry.seo_v3.yaml`
- duplicate PVs
- required `source_trace`
- raw extraction coverage against registry, exceptions, and skipped rows
- `PV_REFERENCE.md` PV set against `pv_registry.yaml`
- `outputs/<beamline>/status.yaml` consistency when present; current generated
  outputs should include it

`render_reference.js <beamline> --write` regenerates the Markdown reference from
the registry. Use `--check` in validation gates.

Bad usage prints a `Usage:` line and exits non-zero. Missing required workbench
files are reported as `FAIL:` messages so validation output remains actionable.
