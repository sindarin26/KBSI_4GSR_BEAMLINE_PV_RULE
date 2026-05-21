# ID10 Migration Context

Historical ID10 outputs in this directory previously used the v0 shape:

```text
ID10:{Area}:{Device}:{AxisOrFunction}
```

The current `pv_registry.yaml`, `PV_REFERENCE.md`, and `status.yaml` represent a
reviewed SEO_V3 output:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

Legacy source PVs remain preserved in `source_pv`, `source_trace.source_label`,
and raw extraction metadata for traceability. Raw items that still need owner
policy decisions are tracked under `exceptions/ID10/`.
