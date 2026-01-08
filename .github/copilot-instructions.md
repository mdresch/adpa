## ADPA — Copilot / AI coding instructions

Purpose: Minimal, actionable guidance to get an AI coding agent productive quickly. Only use discoverable files and patterns in the repo.

- Read first: [/.cursorrules](.cursorrules), [README.md](README.md), and [server/migrations/050_create_projects_table.sql](server/migrations/050_create_projects_table.sql) for migration style.

- Big picture:
  - **Frontend:** Next.js app under [app/](app/) (Pages Router), TypeScript, Tailwind, Radix UI. Key files: [contexts/AuthContext.tsx](contexts/AuthContext.tsx), [contexts/WebSocketContext.tsx](contexts/WebSocketContext.tsx), [hooks/use-api.ts](hooks/use-api.ts).
  - **Backend:** Express app in [server/src/](server/src/) with feature modules at [server/src/modules/](server/src/modules/) and business logic in [server/src/services/](server/src/services/).
  - **Data & infra:** Supabase (Postgres) is the primary DB; Redis + Bull for background jobs; AI providers integrated under [server/src/modules/ai/]. Realtime uses Socket.io and Supabase realtime.

- Project-specific rules (enforceable from repo):
  - Store long-form content as Markdown inside JSONB columns (see [server/src/modules/documentGenerator/](server/src/modules/documentGenerator/)).
  - Use UUID primary keys and DB defaults (`gen_random_uuid()`); ensure required extensions are created in migrations.
  - Migrations: all files in [server/migrations/](server/migrations/) follow explicit UP/DOWN inside `BEGIN; ... COMMIT;` and prefer `IF NOT EXISTS`.
  - TypeScript: repository uses strict typing—prefer explicit types and avoid `any` unless justified with a comment.
  - Git workflow: commit locally but do not push branches or open PRs without owner approval.

- Key examples & entry points:
  - Migration pattern: [server/migrations/050_create_projects_table.sql](server/migrations/050_create_projects_table.sql)
  - Document generator: [server/src/modules/documentGenerator/](server/src/modules/documentGenerator/)
  - Queue service: [server/src/services/queueService.ts](server/src/services/queueService.ts)
  - Frontend entry: [app/page.tsx](app/page.tsx) and global styles at [app/globals.css](app/globals.css)

- Developer commands (copy/paste):
  - Install (root): `pnpm install`
  - Server deps: `cd server && npm install`
  - Start frontend (dev): `pnpm dev`
  - Start backend (dev): `cd server && npm run dev`
  - Run frontend tests: `pnpm test` (see `jest.config.js` and `__tests__/`)
  - Run server tests: `cd server && npm test`
  - Run Playwright e2e: `pnpm playwright test`
  - Create migration: `supabase migration new <name>` then `supabase db push`

- Integration notes:
  - Check environment files in [server/.env.example](server/.env.example) and the [supabase/](supabase/) folder before running migrations or local dev.
  - Redis/Bull and queue jobs live under [server/src/modules/*/jobs] and are configured in [server/src/services/queueService.ts](server/src/services/queueService.ts).
  - AI provider adapters and key rotation live in [server/src/modules/ai/]. Prefer reading existing adapters before adding new providers.

- When editing code or schema:
  1. Confirm the rule in [/.cursorrules](.cursorrules) if changes touch content storage or DB design.
  2. Follow migration template visible in [server/migrations/](server/migrations/) (UP/DOWN, explicit transactions).
  3. Run unit and e2e tests locally; if changing DB schema, run a dry migration against a local/dev database.
  4. Do not push branches or open PRs without explicit owner approval.

If anything here is unclear or you want me to add a migration template, PR checklist, or sample SQL snippet, tell me which one to expand.