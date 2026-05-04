# AGENTS.md

Instructions for AI agents working on **ADPA-PROJECT-CHARTER** in this repo.
Keep changes small, focused, and aligned with existing patterns.

## Project context (ADPA)
- Full-stack monorepo: **Next.js (Pages Router)** frontend at repo root,
  **Express + TypeScript** backend in `/server`.
- Document generation is a core feature. **All document content must be stored
  as Markdown** (JSONB in PostgreSQL). Export to PDF/DOCX only on demand.
- Primary database: **Supabase PostgreSQL**. Use parameterized queries,
  UUID primary keys, JSONB for flexible content.
- Real-time: **Supabase Realtime** for DB changes and presence; **Socket.io**
  for complex business events (jobs, AI progress, notifications).

## ADPA-PROJECT-CHARTER focus
- Project charter generation aligns with PMBOK templates and standards.
- Source of truth for templates and generation:
  - `/server/src/modules/documentGenerator/`
  - `/server/src/modules/documentTemplates/`
  - `/server/src/modules/enhancedTemplateProcessor/`
- Useful docs:
  - `/docs/06-features/pmbok/`
  - `/docs/06-features/TEMPLATE_CONTENT_STRUCTURE.md`
  - `/docs/06-features/TEMPLATE_VALIDATION_SAFEGUARDS.md`

## Must-follow engineering rules
- **TypeScript strict mode**. Avoid `any` unless justified.
- **Markdown storage rule** is mandatory for all documents.
- Use Joi/express-validator for input validation; central error handling.
- Prefer existing utilities in `/lib` and `/server/src/utils`.
- Add succinct comments only when logic is not self-explanatory.
- Avoid non-ASCII unless the file already contains it.

## Repo map
- Frontend pages: `/app` (Pages Router), UI in `/components`, hooks in `/hooks`.
- Backend app: `/server/src` (routes, services, modules, middleware).
- Database migrations: `/server/migrations`.
- Documentation: `/docs`.

## Workflow expectations
- Read before you write. Reuse existing patterns and helpers.
- Keep edits tight and minimal; avoid broad refactors unless requested.
- Add/adjust tests when behavior changes.
- Run relevant tests or lint checks before reporting success.
  - Frontend: `npm run test:db-unit`, `npm run test:db-integration`
  - Backend: `cd server && npm test`

## Dependency policy
- When adding dependencies, use the package manager (pnpm in root,
  npm in `/server`) and install the latest stable version.

## Git expectations
- Commit changes with clear messages.
- Do **not** push without explicit user approval.

## If unsure
- Ask a clarifying question or point to the specific file/line that is
  ambiguous. Do not guess on data model or security behavior.

## Cursor Cloud specific instructions

### Services overview
| Service | Port | Start command | Notes |
|---------|------|---------------|-------|
| Express backend | 5000 | `cd server && npx nodemon --exec "npx tsx" src/server.ts` | Override REDIS_URL, DATABASE_URL, DB_SSL, BACKEND_URL env vars to point at local PG/Redis instead of injected cloud secrets |
| Next.js frontend | 3000 | `PORT=3000 npx next dev -p 3000` | Must set PORT=3000; the Cloud VM injects PORT=5000 by default; also set BACKEND_URL to the local backend |

### Environment gotchas
- **Injected secrets override `.env` files**: The Cloud Agent VM injects system env vars (DATABASE_URL, REDIS_URL, etc.) that take precedence over dotenv. Always pass local overrides as env vars in front of the start command.
- **pnpm workspace**: Both root and `server/` are in `pnpm-workspace.yaml`. Running `pnpm install` at root installs deps for both workspaces. Do not run `npm install` in `server/`.
- **pnpm build approval**: After `pnpm install`, run `pnpm approve-builds --all` to allow postinstall scripts (esbuild, etc.) to execute. The `@pinecone-database/pinecone` package may need its `dist/` directory manually extracted from the npm tarball (see setup notes).
- **PG + Redis**: The update script starts local PG and Redis. The dev database, user, and baseline migration must exist. Run `server/migrations/000_baseline.sql` against the local DB if empty.
- **Frontend auth**: The frontend login page uses Firebase Auth SDK. Without valid Firebase credentials, browser-based login fails. The backend REST API (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`) works independently with JWT.
- **Non-critical dependencies**: The backend startup graph marks Redis, Neo4j, RabbitMQ, MongoDB, Pinecone, and Langfuse as non-critical. The server starts and serves requests even if these services are unavailable.
- **ESLint**: The repo uses `.eslintrc.json` but ESLint 9 requires flat config. `next lint` is not available in Next.js 16. Use `ESLINT_USE_FLAT_CONFIG=false npx eslint <path>` for linting.
- **Backend tests**: `cd server && npx jest --config jest.config.js --forceExit --passWithNoTests --testPathPattern="<pattern>"`. Some tests may hang waiting for external services; use `--forceExit` and target specific test patterns.
