# Migration Pilot Scripts

This directory contains pilot-only validation for small database-pool migration
experiments.

Run the M4 validation:

```text
node scripts/migration_pilot/validate_m4_small_migration.js
```

The M4 check verifies:

- exact controlled row counts for the `4GSR_Beamline_PV_Naming_Standard_v1.0`
  and `BL10A` pilot pools;
- deterministic `uid` values and `rowId == standardPv`;
- explicit `sourceTrace` on every row;
- tracked source paths rather than `temp/` source references;
- HTML/DB-only operational rows remain `needs_input`;
- abbreviation registry issues block silent acceptance or approval;
- duplicate `standardPv` conflict reporting runs for both pools.

These scripts do not promote rows into active rulebooks, schemas, or generated
outputs.
