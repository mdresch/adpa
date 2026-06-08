# AGENTS.md

## Cursor Cloud specific instructions

### Service Overview

ADPA is a monorepo with two services:
- **Frontend**: Next.js 16 (Pages Router) on port 3000
- **Backend**: Express.js on port 5000

### Starting Services

```bash
# Backend (in server/ directory)
cd server && npm run dev

# Frontend (in root directory; package.json pins port 3000)
pnpm dev
```

**Important**: Next.js 16 defaults to port 5000 (not 3000) if `PORT` env var is set. The `dev` script passes `--port 3000` to avoid conflicting with the backend.

**Slow first page load (Windows / F: drive)**: `✓ Ready` only means the dev server is listening. The **first browser request** still compiles instrumentation and the route (often several minutes on a slow filesystem). Until the terminal shows `GET /… 200`, the tab may spin. Proxied API checks can work earlier: `http://localhost:3000/api/health` → backend.

**Backend restart heads-up (dev)**: Nodemon restarts the Express server on every `server/` code change. While the backend is down, the Next.js UI stays up but proxied `/api/*` calls fail (502/500, toasts, empty panels). In development, a **top-of-screen banner** polls `/api/dev/backend-health` and shows *Backend is restarting* vs *not reachable*. **Agents:** before editing `server/` files, tell the user the backend will reload and API errors are expected for ~30s–2m; after applying server changes, note that nodemon may still be starting and they should wait for `All dependencies initialized successfully` in the backend terminal before re-testing features.

**Faster Turbopack cache on Windows** (do not put `C:\...` in `NEXT_DIST_DIR` — Next treats `distDir` as relative and will error). One-time setup, then use `dev:cache`:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
pnpm dev:cache
```

This creates a junction `.next` → `%LOCALAPPDATA%\adpa-next-cache`. Plain `pnpm dev` is fine if you keep the default `.next` on F:.

### Database & Redis

- PG 16 must be running. Start with: `sudo pg_ctlcluster 16 main start`
- Redis must be running. Start with: `redis-server --daemonize yes`
- DB credentials are in `server/.env` (see the example file for reference)
- Schema setup: apply `server/migrations/000_baseline.sql` using credentials from `server/.env`

### Authentication

- The frontend uses Firebase Auth for login. Without Firebase credentials, use the **demo login** endpoint: `POST /api/v1/auth/demo`
- The backend also supports direct JWT registration: `POST /api/v1/auth/register` with JSON body containing email, a secret credential, name, companyName
- In development (`NODE_ENV=development`), Firebase Auth dependency is non-critical and the server starts without it.

### Startup Dependency System

The backend uses a dependency graph for startup. In development:
- **Critical** (must succeed): Security Config, Database
- **Optional** (server works without them): Redis, Neo4j, RabbitMQ, MongoDB, Pinecone, Langfuse, Upstash, Morphic DB, Firebase Auth

### Running Tests

```bash
# Backend unit tests (Jest)
cd server && npx jest --testPathPattern="<pattern>" --no-coverage

# Full test suite (117 files, takes several minutes)
cd server && npm test
```

### Lint

ESLint has a pre-existing configuration issue: ESLint 9 requires flat config (`eslint.config.js`) but the project uses legacy `.eslintrc.json`. The `pnpm lint` / `next lint` commands currently don't work due to this incompatibility. This is a known codebase issue, not an environment problem.

### Environment Files

- Frontend: `.env.local` (see `.env.local.example`)
- Backend: `server/.env` (see `server/.env.example`)
- Key env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `BACKEND_URL` (for frontend proxy)

### API Proxy

The Next.js frontend proxies `/api/*` requests to the backend via `next.config.mjs` rewrites. The `BACKEND_URL` env var controls where API calls are forwarded (defaults to the Express backend port in local dev).

### Package Managers

- Frontend: `pnpm` (v10.32.1, declared in `packageManager` field)
- Backend: `npm` (uses separate package.json in `server/`)
- Both are installed via `pnpm install` from root (workspace setup in `pnpm-workspace.yaml`)

### Build Scripts Approval

The `pnpm.onlyBuiltDependencies` field in root `package.json` controls which packages can run postinstall scripts. Key packages that need it: `puppeteer`, `sharp`, `esbuild`.

### Document GenUI workspace

Split-pane page for governance documents: source text (left) + OpenUI advisor (right) at `/projects/{projectId}/documents/genui?docId={documentId}`.

| Topic | Detail |
| --- | --- |
| **Agent skill (maintain/extend)** | `.agents/skills/adpa-genui-workspace/SKILL.md` — document split-pane; `.agents/skills/adpa-openui-chat/SKILL.md` — `/openui-chat` + Gemini threads |
| **Human codedoc** | `docs/codedocs/genui-workspace.md`, `docs/codedocs/openui-chat.md` |
| **Not the same as** | Project OpenUI Chat (`/openui-chat`, `server/src/modules/openuiChat`, `GOOGLE_AI_API_KEY` in `server/.env`) |
| **Step 2 LLM (document)** | `POST /api/chat` with `systemPrompt` → Mistral or Google Gemini (`GENUI_LLM_PROVIDER`, `MISTRAL_*` or `GOOGLE_AI_API_KEY` in `.env.local`) |
| **Step 2 export** | Client PDF/Word/HTML — `lib/genui/reportExport.ts`, `GenuiReportExportBar.tsx` |
| **Step 3 (reserved)** | Presentation snapshots + blob artifacts — `docs/superpowers/specs/2026-05-21-genui-step3-presentations-design.md`, `lib/genui/presentationSnapshot.ts` |
| **Layout modes** | **Focused** (timeline/gantt/kanban, no cover) vs **full report** — `lib/openui/layoutPlan.ts`; starter prompts in `lib/documents/genui-prompts.ts` |
| **Rendering (both surfaces)** | `projectOpenUILibrary` = genui-lib + ADPA extensions (`lib/openui/adpaGenuiExtensionDefs.ts`); same on `FullScreen` + `Renderer`; `buildOpenUISystemPrompt()` |
| **Add Lang components** | `defineComponent` → `adpaGenuiExtensionDefs.ts` (+ optional `layoutPlan.ts`); stack-wide — see genui skill checklist (do not change doc fetch/`docId` wiring) |
| **Key files** | `app/projects/[id]/documents/genui/page.tsx`, `app/openui-chat/`, `lib/openui/layoutPlan.ts`, `lib/openui/systemPrompt.ts`, `components/openui-chat/AssistantMessage.tsx` |

Load the matching skill before changing GenUI layout, OpenUI chat, prompts, or structured UI output. Do not use bare `openuiLibrary` when prompts mention Bullets.

### Product features (canonical routes)

After infra startup succeeds, verify **user-facing features** still load—not only Postgres/Redis. The backend dependency graph does not cover these.

| Feature | Route | Smoke check |
| --- | --- | --- |
| OpenUI Chat (canonical advisor) | `/openui-chat` | Page loads; `GET /api/v1/openui-chat/threads` returns 200 when signed in |
| AI template generation | `/ai` | Thin route shell loads; workspace fetches `/api/ai-providers`, `/api/templates`, `/api/projects` (needs `ai.generate`) |
| Document GenUI | `/projects/{id}/documents/genui?docId=…` | See genui skill |
| Legacy OpenUI URL | `/ai/openui-chat` | **Redirect** to `/openui-chat` via `next.config.mjs` (restart dev after config change) |

**`/ai` implementation:** `app/ai/page.tsx` dynamically imports `app/ai/ai-workspace.tsx` so first navigation does not block on a ~1k-line compile. Workspace waits for auth before API calls and uses 20s per-request timeouts.

**Planned:** feature boot/health panel (post-login) listing route + API probe pass/fail alongside optional deps (Neo4j, Mongo, etc.).
