# Bad Example: Invalid SEO_V3 Conversion

These examples should be rejected by the active SEO_V3 review rulebook.

```text
ID10:PTL:IVU:girder_y
BL10:IVU:GirderY
BL-10C:OH-WBSLT:Hgap
BL-10C:OH-WBSLT-SLIT:hgap
BL-10C:OH-WB-SLIT:Hgap
BL10C-OH:WBSLT:Hgap
BL10C-OH:WBSLT-SLIT:hgap
BL10C-OH:MOTOR-STG:ScanParms
BL10C-OH:MOTOR-STG:ScanParms
```

Problems:

- `ID10:PTL:IVU:girder_y` uses the legacy v0 four-tier shape.
- `BL10:IVU:GirderY` is a legacy source PV, not SEO_V3 rendered output.
- `BL-10C:OH-WBSLT:Hgap` uses the old SEO_v2 location separator and is missing
  the required `SUBDEV` tier.
- `BL-10C:OH-WBSLT-SLIT:hgap` uses the old SEO_v2 location separator and
  lowercase signal text.
- `BL-10C:OH-WB-SLIT:Hgap` uses the old SEO_v2 location separator.
- `BL10C-OH:WBSLT:Hgap` is missing the required `SUBDEV` tier.
- `BL10C-OH:WBSLT-SLIT:hgap` uses lowercase signal text.
- Duplicate rendered PV names must be resolved through source-backed instance
  policy or exception handling, not silently accepted in a canonical registry.
