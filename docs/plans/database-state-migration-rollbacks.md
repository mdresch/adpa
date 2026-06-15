# Implementation Plan: Database State & Migration Rollbacks

## Goal Description
Address the AEV rollback vulnerability where `git reset --hard HEAD` only reverts code, leaving local PostgreSQL or Neo4j databases in a dirty, mutated state if a feature validation fails after applying a schema change.

## Proposed Changes

### `scripts/`
- [NEW] `rollback-db-state.sh` / `.ps1`: A script that leverages `drizzle-kit` to execute `migrate:down` or restores the local database from a pre-execution snapshot.
- [NEW] `snapshot-db-state.sh` / `.ps1`: A script to snapshot the state before execution begins.

### `.agents/skills/adpa-aev-workflow/SKILL.md`
- [MODIFY] Update the "Rollback Policy" section. Before running `git reset`, agents must invoke the DB state rollback script to ensure full environment sanitization.

## Verification Plan
- **Manual Verification**: Introduce a dummy Drizzle migration, execute the AEV workflow, and manually trigger a failure at Gate 3. Verify that the rollback policy correctly undoes both the code commit and the database schema changes, returning the DB to its exact prior state.
