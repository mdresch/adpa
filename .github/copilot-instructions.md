## ADPA — Copilot / AI coding instructions

Purpose: give an AI coding agent immediate, actionable knowledge to be productive in this repository. Use only discoverable conventions (files, folders, scripts) — do not invent processes.

- Read these files first: `.cursorrules` (root) for project rules, `README.md` (root), and `server/migrations/050_create_projects_table.sql` for migration patterns. Key code areas: `server/src/modules/`, `server/src/services/queueService.ts`, and `app/` (frontend pages).

- Big picture: Next.js frontend in `app/` (Pages Router), Express backend in `server/src/`, Supabase Postgres as primary DB, Redis (Bull) for queues. Persist text as Markdown in JSONB columns. UUID primary keys throughout.

- Conventions to follow (strict):
  - All long-form text stored as Markdown in JSONB (see `documents` table and document generator module).
  - Use UUID primary keys and `gen_random_uuid()` for defaults. Ensure `pgcrypto`/`uuid-ossp` extension present when creating UUID defaults (migrations follow this pattern).
  - Parameterize SQL queries (no string interpolation in SQL).
  - TypeScript strict mode is enabled; prefer explicit types and avoid `any` unless justified.
  - Git: commit locally but DO NOT push without explicit user approval.

- Migrations: follow existing pattern in `server/migrations/*.sql`:
  - Provide UP and DOWN sections wrapped in `BEGIN; ... COMMIT;`.
  - Ensure extensions used (e.g., `CREATE EXTENSION IF NOT EXISTS pgcrypto;`) are created at top of UP.
  - Add indexes and comments alongside table/column creation. Use `IF NOT EXISTS` where appropriate to be idempotent.
  - When altering existing tables add column with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and create index (drop index in DOWN before dropping column).

- Database-specific tips:
  - Use `to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))` for combined full-text indices (see recent migrations).
  - Currency codes are 3-letter ISO and budget is DECIMAL(15,2) with CHECK (budget >= 0) when present in schema.
  - RLS is used in Supabase; avoid making schema changes that assume open access — check `server/.env` and Supabase CLI flows.

- Real-time and background: Prefer Supabase Realtime for DB CDC and Socket.io for server-side business events (jobs/AI progress). When touching real-time code, check both `contexts/WebSocketContext.tsx` and Supabase usage under `lib/supabase`.

- Where to look for examples:
  - Migration pattern: `server/migrations/050_create_projects_table.sql` (UP/DOWN, extension, comments, indexes).
  - Document generation: `server/src/modules/documentGenerator/` (Markdown → exports).
  - AI orchestration: `server/src/modules/ai/` and usage patterns in `server/src/services/`.

- Developer workflows (commands the agent can mention or use):
  - Install: `pnpm install` (root), `cd server && npm install` for server dev deps.
  - Run frontend: `pnpm dev` (root). Run backend: `cd server && npm run dev`.
  - Migrations: prefer Supabase CLI: `supabase migration new <name>` then `supabase db push`. For raw SQL: `psql $DATABASE_URL -f server/migrations/<file>.sql`.
  - Tests: frontend uses `npm run test:db-unit` / `test:db-integration`; backend tests in `server` via `npm test`.

- Before making code or schema changes check:
  1. `.cursorrules` for mandatory rules (Markdown storage, DB-first, commit-but-don't-push).  
  2. `server/migrations/` to match naming/patterns and UP/DOWN expectations.  
  3. `server/.env` and `README.md` for environment expectations and Supabase usage.

- Safety and finalization: run unit/integration tests locally and run a migration dry-run where possible. Always add table/column comments in migrations. When done, ask the user for permission before pushing the branch.

If anything in these instructions is unclear or you need more examples (for instance, the exact SQL style used in `050_create_projects_table.sql`), tell me which section to expand and I will update this file.
