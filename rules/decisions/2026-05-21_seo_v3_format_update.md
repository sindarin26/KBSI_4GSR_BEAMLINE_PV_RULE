# SEO_V3 Format Update Decision

Date: 2026-05-21
Status: active decision context for SEO_V3 rulebook update

## Decision

Promote the active PV rendered shape to:

```text
[SEC/SYS][PORT]-[AREA]:[DEV]-[SUBDEV]:[SignalName]
```

Example:

```text
BL01A-OH:HHLM-MIRR:Pitch
```

This replaces the SEO_v2 rendered shape:

```text
BL-[PORT]:[AREA]-[DEV]-[SUBDEV]:[SignalName]
```

## Rationale

The owner clarified that the first tier should read as a location name, followed
by device name and signal name. The location tier now combines section/system,
port, and area as `[SEC/SYS][PORT]-[AREA]`.

The owner also clarified that `DEV` and `SUBDEV` abbreviations are not fixed
active enumerations. They should remain source-backed and traceable, then be
refined through future database work.

## Active Consequences

- Active registries use `rulebook_version: SEO_V3`.
- Active PV reconstruction is:

```text
section + port + "-" + area + ":" + device + "-" + subdevice + ":" + signal
```

- `DEV` and `SUBDEV` are validated by token syntax, not by a closed code list.
- Source-backed new device/subdevice abbreviations are allowed.
- Guessed or unclear abbreviations should be marked `decision_required` and
  routed through exceptions or proposals.

## Migration Note

Existing SEO_v2 source packages and review records remain historical context.
They can support migration notes and traceability, but they are no longer the
active rendered PV policy.
