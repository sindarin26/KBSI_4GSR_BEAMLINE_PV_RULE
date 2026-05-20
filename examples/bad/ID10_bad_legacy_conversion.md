# Bad Example: Invalid SEO_v2 Conversion

These examples should be rejected by the active SEO_v2 review rulebook.

```text
ID10:PTL:IVU:girder_y
BL10:IVU:GirderY
BL-10C:OH-WBSLT:Hgap
BL-10C:OH-WBSLT-SLIT:hgap
BL-10C:OH-WB-SLIT:Hgap
BL-10C:OH-MOTOR-STG:ScanParms
BL-10C:OH-MOTOR-STG:ScanParms
```

Problems:

- `ID10:PTL:IVU:girder_y` uses the legacy v0 four-tier shape.
- `BL10:IVU:GirderY` is a legacy source PV, not SEO_v2 rendered output.
- `BL-10C:OH-WBSLT:Hgap` is missing the required `SUBDEV` tier.
- `BL-10C:OH-WBSLT-SLIT:hgap` uses lowercase signal text.
- `BL-10C:OH-WB-SLIT:Hgap` splits the approved `WBSLT` device token.
- Duplicate rendered PV names must be resolved through source-backed instance
  policy or exception handling, not silently accepted in a canonical registry.
