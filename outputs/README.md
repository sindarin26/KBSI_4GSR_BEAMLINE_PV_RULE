# Outputs

Generated PV outputs should live here.

Use one subdirectory per beamline, for example:

```text
outputs/ID10/
```

Generated outputs intended to be current must declare:

```yaml
rulebook_version: SEO_v2
```

Existing `outputs/ID10/` files that still declare `rulebook_version: v0` are
legacy generated material and should be regenerated before use as active
SEO_v2 output.
