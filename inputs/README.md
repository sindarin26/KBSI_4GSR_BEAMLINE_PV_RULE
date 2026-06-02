# Inputs

Source material intended for processing lives here.

Use one subdirectory per pool, for example:

```text
inputs/BL10A/
inputs/BL9ASIM/
```

The active SEO_V3 standard source document lives at:

```text
inputs/4GSR_Beamline_PV_Naming_Standard_v1.0/standard.md
```

Source files under `inputs/<pool_id>/` are not active naming policy. Agents
convert them into reviewable SEO_V3 database-pool rows under
`database_pool/<pool_id>/sources/` using either the mechanical importer or the
agent conversion procedure in
`rules/draft/DATABASE_POOL_INPUT_CONVERSION_RULEBOOK.md`.
