Migration runner scripts
========================

This folder contains small node scripts to apply SQL migrations directly against a Postgres database for development or emergency fixes.

Files:
- migrate-051.js — applies server/migrations/051_create_checklist_items_and_project_financial_rollup.sql
- migrate-401.js — applies server/migrations/401_add_parent_id_to_project_tasks.sql

Usage
-----

1. Add connection details to `server/.env` (or export `DATABASE_URL` in your environment). Example in cmd.exe:

```
set DATABASE_URL=postgres://user:password@host:5432/dbname
npm run migrate:401
```

Or in PowerShell:

```
$env:DATABASE_URL = "postgres://user:password@host:5432/dbname"
npm run migrate:401
```

Notes
-----
- The scripts load `server/.env` first, then fallback to any environment variables already present.
- Always run migrations against a test database and take backups prior to applying to production.
