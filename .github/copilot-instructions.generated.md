## ADPA — Copilot / AI coding instructions

Purpose: Give an AI coding agent the minimal, actionable knowledge to be productive immediately. Use only discoverable files and patterns — do not invent workflows.

- Read first: `.cursorrules` (root), `README.md` (root), and `server/migrations/050_create_projects_table.sql` for SQL/migration style.

- Big picture (quick):
  - Frontend: Next.js in `app/` (Pages Router), TypeScript, Tailwind, Radix UI; core contexts: `contexts/AuthContext.tsx`, `contexts/WebSocketContext.tsx`.
  - Backend: Express in `server/src/` (feature modules under `server/src/modules/`), `server/src/services/` for business logic.
  - Data: Supabase (Postgres) is primary DB; Redis + Bull for queues; AI provider integrations in `server/src/modules/ai/`.

- Project-specific rules (must follow):
  - Store all long-form content as Markdown in JSONB columns (see `documents` table and `server/src/modules/documentGenerator/`).
  - Use UUID primary keys and database defaults like `gen_random_uuid()`; create required extensions (`pgcrypto`/`uuid-ossp`) in migrations.
  - SQL migrations: every `server/migrations/*.sql` follows UP/DOWN within `BEGIN; ... COMMIT;`. Use `IF NOT EXISTS`, add comments and indexes, and parameterize queries in code.
  - TypeScript strict mode: prefer explicit types; avoid `any` unless justified using a comment.
  - Git: commit locally but DO NOT push branches without explicit user approval.

- Key files / examples to reference:
  - Migration style: `server/migrations/050_create_projects_table.sql`
  - Document generation: `server/src/modules/documentGenerator/`
  - Queue integration: `server/src/services/queueService.ts`
  - Frontend patterns: `app/`, `hooks/use-api.ts`, `contexts/AuthContext.tsx`

- Developer commands (copyable):
  - Install deps (root): `pnpm install`
  - Install server deps: `cd server && npm install`
  - Run frontend: `pnpm dev`
  - Run backend: `cd server && npm run dev`
  - Create migration: `supabase migration new <name>` then `supabase db push` (preferred)
  - Run a raw migration: `psql $DATABASE_URL -f server/migrations/<file>.sql`
  - Tests: frontend tests live under `__tests__/` (see `jest.config.js`); server tests via `cd server && npm test`.

- Integration points & considerations:
  - Supabase: RLS is enabled — check `server/.env` and policies before schema changes.
  - Redis/Bull: used for background jobs (AI generation, exports); inspect `server/src/services/queueService.ts` and `server/src/modules/*/jobs`.
  - Real-time: Socket.io + Supabase realtime; check `contexts/WebSocketContext.tsx` and `lib/supabase`.

- When making code or schema changes:
  1. Validate rules in `.cursorrules` (Markdown storage, DB-first).
  2. Match migration patterns (UP/DOWN, extension creation, comments).
  3. Run unit/integration tests locally and a dry-run migration if possible.
  4. Ask the repository owner before pushing branches.

If you want, I can replace the original `.github/copilot-instructions.md` with this file, or expand sections (migration template, PR checklist, sample SQL).