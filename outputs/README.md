# Outputs

Generated PV outputs should live here.

Use one subdirectory per beamline, for example:

```text
outputs/ID10/
```

Generated outputs intended to be current must declare:

```yaml
rulebook_version: SEO_V3
```

Each output directory should include:

```text
pv_registry.yaml
PV_REFERENCE.md
_work/raw_extracted_pvs.yaml
status.yaml
```

`status.yaml` records whether the directory is `draft`, `reviewed`, `approved`,
or `legacy` and points to the canonical registry, reference, raw extraction, and
review log.

Validate a current output directory with:

```text
node scripts/validate_registry.js <beamline>
node scripts/render_reference.js <beamline> --check
```
