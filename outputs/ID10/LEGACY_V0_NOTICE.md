# Legacy V0 Output Notice

Historical ID10 outputs in this directory previously used the v0 shape:

```text
ID10:{Area}:{Device}:{AxisOrFunction}
```

The current `pv_registry.yaml` and `PV_REFERENCE.md` have been review-fixed to the active SEO_v2 / 4GSR standard v1.0 shape:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

Legacy source PVs remain preserved in `source_pv`, `source_trace.source_label`, and raw extraction metadata for traceability. Raw items that still need owner policy decisions are tracked under `exceptions/ID10/`.
