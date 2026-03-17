# ADPA Database Migrations

This directory contains the database migrations for the ADPA Framework.

## New Baseline System

As of March 2026, the migration system has been consolidated into an authoritative baseline.

- `000_baseline.sql`: The full schema of the production database at the time of consolidation.
- `archive/`: Contains all legacy incremental migrations that were absorbed into the baseline.

## Migration Commands

All migration tasks should be performed using the following `npm` commands from the project root:

- `npm run migrate`: Runs all pending migrations in numerical order.
- `npm run migrate:reset`: **DESTRUCTIVE** - Resets the local `public` schema and applies the baseline + any pending migrations.
- `npm run migrate:dev`: Resets the database and runs all seed scripts.
- `npm run migrate:baseline`: Regenerates the `000_baseline.sql` from the current production database (Supabase).

## Workflow for New Migrations

1. Create a new `.sql` file in this directory following the naming convention: `XXX_description.sql` (e.g., `001_add_new_feature_table.sql`).
2. Run `npm run migrate` to apply it to your local database.
3. Commit both the new migration file and the updated `000_baseline.sql` if you regenerated it.

## Tracking

Migrations are tracked in the `schema_migrations` table in the database.
You can check the status of migrations by running:
`npx tsx server/scripts/check-migrations.ts`
