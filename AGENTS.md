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

# Frontend (in root directory, MUST specify port)
pnpm dev --port 3000
```

**Important**: Next.js 16 defaults to port 5000 (not 3000) if `PORT` env var is set. Always pass `--port 3000` to avoid conflicting with the backend.

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
- **Critical** (must succeed): Security Config, Database, Azure Backend (just a ping that warns on failure)
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
| **Agent skill (maintain/extend)** | `.agents/skills/adpa-genui-workspace/SKILL.md` — architecture, file map, env vars, rendering pitfalls, checklist |
| **Human codedoc** | `docs/codedocs/genui-workspace.md` (linked from `docs/codedocs/index.md` as `/docs/genui-workspace`) |
| **Not the same as** | Project OpenUI Chat (`/openui-chat`, `server/src/modules/openuiChat`) — different API and persistence |
| **Step 2 LLM** | `POST /api/chat` with `systemPrompt` → Mistral (`MISTRAL_API_KEY`, `MISTRAL_MODEL` in `.env.local`) |
| **Rendering** | OpenUI Lang via `CustomAssistantMessage` + `openuiLibrary` (`@openuidev/react-ui/genui-lib`); see skill for `assistantMessage` override pitfall |
| **Key files** | `app/projects/[id]/documents/genui/page.tsx`, `genui-workspace.css`, `app/api/chat/route.ts`, `components/openui-chat/AssistantMessage.tsx` |

Load the skill before changing GenUI layout, prompts, chat proxy, or structured UI output.
