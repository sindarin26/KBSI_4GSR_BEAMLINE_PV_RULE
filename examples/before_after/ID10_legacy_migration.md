# ID10 Legacy Migration Example

Source-style legacy PVs:

```text
BL10:IVU:Gap
BL10:IVU:TaperGap
BL10:IVU:GirderY
BL10:WBS:Hgap
BL10:WBS:Top
```

Preferred v0 output:

```text
ID10:PTL:IVU:gap
ID10:PTL:IVU:taper_gap
ID10:PTL:IVU:girder_y
ID10:OH:WBSLT01:hgap
ID10:OH:WBSLT01:top
```

Notes:

- IVU remains the main device tier.
- IVU submechanisms move into `axis_or_function`.
- White Beam Slit uses the approved `WBSLT` token.
