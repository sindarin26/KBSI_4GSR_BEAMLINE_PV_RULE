# Legacy Migration Example

Source-style legacy PVs:

```text
BL10:IVU:GirderY
BL10:IVU:EncUS
BL10:WBS:Hgap
BL10:WBS:Top
BL10:DCM:Theta
```

Preferred SEO_V3 output when the port and component mapping are confirmed:

```text
BL10C-FE:IVU-GIRD:Y
BL10C-FE:IVU-ENC:US
BL10C-OH:WBSLT-SLIT:Hgap
BL10C-OH:WBSLT-SLIT:Top
BL10C-OH:MONO-CRYS:Theta
```

Notes:

- The old `ID10:{Area}:{Device}:{AxisOrFunction}` shape is no longer active for
  new output.
- IVU submechanisms move into `SUBDEV` when the source supports the split.
- Signal text uses upper-initial CamelCase/PascalCase, not lowercase
  underscore suffixes.
- `WBSLT` remains the approved White Beam Slit device token.
