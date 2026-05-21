# Scripts

These scripts are internal workbench entry points. They validate or render data
from the active rulebooks and schemas, but they do not define naming policy.

Use:

```text
node scripts/validate_seo_v2_rules.js
node scripts/validate_registry.js ID10
node scripts/render_reference.js ID10 --check
node scripts/render_reference.js ID10 --write
node scripts/review_server.js ID10 --port 8765
node scripts/import_seo_review_decisions.js
```

`validate_seo_v2_rules.js` checks the promoted SEO_v2 source package, active
rulebook shape, schema presence, examples, and known DB duplicate tracking.

`validate_registry.js <beamline>` checks a generated output directory:

- `rulebook_version: SEO_v2`
- SEO_v2 PV regex
- structured field reconstruction
- accepted area/device/subdevice/status values from
  `schemas/pv_registry.seo_v2.yaml`
- duplicate PVs
- required `source_trace`
- raw extraction coverage against registry, exceptions, and skipped rows
- `PV_REFERENCE.md` PV set against `pv_registry.yaml`
- `outputs/<beamline>/status.yaml` consistency when present; current generated
  outputs should include it

`render_reference.js <beamline> --write` regenerates the Markdown reference from
the registry. Use `--check` in validation gates.

`review_server.js <beamline>` starts a local browser review UI. It reads
`outputs/<beamline>/_work/raw_extracted_pvs.yaml`, `pv_registry.yaml`, and
exception frontmatter once into a server-side memory cache. Browser filters run
against the rows already loaded in RAM, and the UI asks the server to refresh
from disk only when the user clicks `Reload`.

The review UI saves SEO-DB-like JSON row arrays:

- `reviews/<beamline>/review_decisions.json`
- `reviews/<beamline>/accepted_decisions.json`
- `reviews/<beamline>/fixed_decisions.json`

These decision files are data inputs for later dataset updates; the browser UI
itself is not a canonical naming policy source.

`import_seo_review_decisions.js` converts the historical SEO_v2 DB JSON row
array into `reviews/SEO_v2/review_decisions.json`,
`reviews/SEO_v2/accepted_decisions.json`, and
`reviews/SEO_v2/fixed_decisions.json`. These files are test seeds and reusable
decision examples, not active rulebooks.

Bad usage prints a `Usage:` line and exits non-zero. Missing required workbench
files are reported as `FAIL:` messages so validation output remains actionable.
