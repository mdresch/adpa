# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADPA (Advanced Document Processing & Automation) is a **governed** enterprise platform that generates standards-aligned documentation (PMBOK, BABOK, DMBOK) using multi-provider AI, with enterprise integrations (Confluence, SharePoint, GitHub) and real-time collaboration.

The codebase is organized into four logical tiers with enforced boundaries — know which tier you're editing before you start:

- **Intelligence Tier (advisory-only)**: Python FastAPI services for AI/PMBOK reasoning. Returns advisory JSON only; never mutates state.
- **Orchestration Tier (authority)**: `.NET 10` / `.NET Aspire` under `orchestrator/` — `Adpa.AppHost` (service discovery/telemetry orchestrator), `Adpa.Orchestrator` (sole execution authority for governance "rituals"), `Adpa.ServiceDefaults`, `Adpa.Web` (Blazor **Governor Portal** for high-integrity decisions).
- **Experience Tier (read-only/decision)**: The Next.js frontend (`app/`) — the **Researcher Dashboard** — for exploration and AI-assisted drafting. It proxies `/api/*` to the Express backend (see API Proxy below) and `/api/Ritual|ritual/*` to the .NET orchestrator when `orchestratorUrl` is configured.
- **Data Tier (append-only)**: PostgreSQL (Azure Database for PostgreSQL Flexible Server) is the governance ledger and primary DB — migrated off Supabase; `server/migrations/000_baseline.sql` still creates extensions/shims defensively so the schema also boots on a Supabase host if needed. Redis for cache/sessions/Bull queues; RabbitMQ (MassTransit) for orchestration messaging; Neo4j/Qdrant/Pinecone for knowledge graph/RAG (optional in dev).

Most day-to-day work happens in the Next.js frontend (root) and the Express backend (`server/`) — two Node projects joined in a single pnpm workspace (`pnpm-workspace.yaml` lists both `.` and `server`).

## Commands

### Install
```bash
pnpm install                    # installs both root (Next.js) and server/ (Express) — single pnpm workspace
```

### Dev servers
```bash
pnpm dev                        # Next.js frontend, port 3000 (pinned via --port flag)
cd server && npm run dev        # Express backend, port 5000 (nodemon + tsx)

# Full stack via .NET Aspire (recommended when touching orchestrator/governance):
dotnet watch run --project orchestrator/Adpa.AppHost   # Aspire dashboard: http://localhost:18888
```
Postgres and Redis must be running before the backend starts (they're "critical" dependencies in dev; Neo4j/RabbitMQ/MongoDB/Pinecone/Langfuse/Upstash/Firebase Auth are optional and the server starts without them).

Nodemon restarts the Express server on every `server/` file change; while it restarts (~30s–2m), the Next.js UI stays up but proxied `/api/*` calls will fail. Wait for `All dependencies initialized successfully` in the backend terminal before re-testing.

### Build
```bash
pnpm build                      # next build
cd server && npm run build      # scripts/build-production.mjs + tsc-alias
```

### Lint
```bash
pnpm lint                       # currently broken: ESLint 9 requires flat config but repo has legacy .eslintrc.json — known issue, not an environment problem
cd server && npm run lint       # eslint .
```

### Tests
```bash
# Frontend (Jest) — roots: __tests__/, components/, lib/, server/src/__tests__/, server/src/modules/ai/tests/
npx jest <path-or-name-pattern>

# Backend (Jest, from server/)
cd server && npm test                                       # full suite (~117 files, several minutes)
cd server && npx jest --testPathPattern="<pattern>" --no-coverage   # single test file/pattern, fast
cd server && npm run test:unit                               # jest.config.js, --maxWorkers=50%
cd server && npm run test:coverage

# Governed feature packets (fast, no DB — required before committing non-trivial backend changes)
cd server && npm run test:features                # runs every entry in governed-features.manifest.json
cd server && npm run test:features -- <id>         # e.g. rag, doc-gen, infrastructure, compliance
cd server && npm run verify:governed-features      # validates manifest/skill/guard structure

# Integration tests (spins up docker-compose.test.yml)
cd server && npm run test:integration

# Playwright e2e
pnpm playwright test
```

### Database
```bash
pnpm migrate         # tsx server/scripts/run-migrations.ts
pnpm migrate:dev      # reset + seed, for local dev
```
Local baseline schema: `server/migrations/000_baseline.sql`. Migrations are numbered SQL files in `server/migrations/`.

## Architecture

### Frontend (`/` — Next.js 16, Pages Router-style routing conventions)
- `app/` — pages (despite the directory name, routing follows the pre-existing Pages Router patterns in this repo — check sibling files before assuming App Router semantics)
- `components/` — React components, `components/ui/` is the Radix UI primitive layer
- `contexts/` — `AuthContext`, `WebSocketContext` (Socket.io client state)
- `hooks/` — `use-api.ts`, `use-auth.ts`, etc.
- `lib/` — API client, auth utilities, Drizzle schema (`lib/morphic/db/schema.ts`)

### Backend (`server/src/`)
- `routes/` — Express route handlers (REST endpoints)
- `services/` — business logic (`aiService.ts`, `unifiedAIService.ts`, `documentGenerationService.ts`, `queue/queueClient.ts`, job services)
- `modules/` — feature modules, each roughly self-contained: `ai/`, `documentGenerator/`, `documentTemplates/`, `enhancedTemplateProcessor/`, `multiStageDocumentProcessor/`, `context*` (contextGathering, contextInjection, contextFreshness, contextRepository, contextRetrieval, contextOrchestrator, contextAccessControl, contextBundle), `rag/`, `knowledge-graph/`, `compliance/`, `ip-governance/`, `template-lifecycle/`, `projects/`, `agents/`, `openuiChat/`, `document-dependency-graph/`, `cascading-regeneration/`, `codacy/`
- `database/` — connection, migrations runner
- `jobs/` / `workers/` — Bull queue job definitions and workers (`worker.ts` is a separate entrypoint from `server.ts` — API and worker processes can run split via `ADPA_PROCESS_ROLE`, see `start:api` vs `start:worker` scripts)

### API Proxy (`next.config.mjs`)
Next.js rewrites forward `/api/*` to the Express backend (`backendUrl`) **except** paths starting with `morphic|auth|chat|genui|openui-chat|keepalive|dev|Ritual/ritual`, which are handled by Next.js API routes or the .NET orchestrator directly. `/ai/openui-chat` redirects to the canonical `/openui-chat`.

### Real-time: two systems, different purposes
- **Supabase Realtime** (`postgres_changes`, presence, broadcast) — for direct DB change notifications and presence; no backend code needed, RLS enforced automatically.
- **Socket.io** (`contexts/WebSocketContext.tsx` + Express `socket.ts`) — for backend-initiated events requiring business logic: job progress, AI generation streaming, approval workflow events.
Use Supabase Realtime for "a row changed," Socket.io for "the server decided something happened."

### Document generation
All document content is stored as **Markdown in JSONB columns** — this is a hard rule, not a style preference. PDF/DOCX are export-time conversions from Markdown, never the canonical storage format. Pipeline stages: context gathering → variable resolution → content structuring → AI generation → QA → format/export (see `server/src/modules/multiStageDocumentProcessor/`).

### AI provider layer
Multi-provider (OpenAI, Google Gemini, Anthropic, Mistral, Ollama, xAI, DeepSeek via Vercel AI SDK) with failover, usage tracking, and cost analytics in `server/src/modules/ai/` and `services/aiProviderService.ts` / `unifiedAIService.ts`. Langfuse provides tracing (`ENABLE_LANGFUSE_NATIVE_SDK`); OTLP export is separate and normally left off (`ENABLE_LANGFUSE_TRACING=false`).

### GenUI / OpenUI (two distinct surfaces — don't conflate them)
- **Document GenUI**: `/projects/{id}/documents/genui?docId=...` — split-pane (source text + OpenUI advisor) for a single document. Skill: `.agents/skills/adpa-genui-workspace/SKILL.md`.
- **Project OpenUI Chat**: `/openui-chat`, backed by `server/src/modules/openuiChat`, uses `GOOGLE_AI_API_KEY`. Skill: `.agents/skills/adpa-openui-chat/SKILL.md`.
Both render through the shared `projectOpenUILibrary` (genui-lib + ADPA extensions in `lib/openui/adpaGenuiExtensionDefs.ts`) and `buildOpenUISystemPrompt()`. Load the matching skill before touching layout, prompts, or structured output — don't use bare `openuiLibrary` when prompts mention Bullets.

## Governance & Development Process

This repo enforces process, not just code style — these gates are load-bearing, not suggestions.

### Governed Feature Loop (required for non-trivial backend features)
Business intent (spec) → Contract Guards (Jest tests written **before** implementation) → `SKILL.md` (intent) → code → registration in `server/governed-features.manifest.json`. Adding tests under `server/src/__tests__/modules/<new>/` without a matching manifest entry **fails CI**. Reference: `.agents/skills/adpa-governed-feature-loop/SKILL.md`. Canonical example: the `rag` packet (`npm run test:rag-features`).

Existing packets (manifest `id`s): `rag`, `doc-gen`, `test-teardown-guard`, `codacy`, `infrastructure`, `inline-extraction`, `document-generation-resiliency`, `knowledge-graph`, `compliance`, `ip-governance`, `document-dependency-graph`, `cascading-regeneration`, `api-worker-split`, `template-lifecycle`, `projects`.

### AEV (Atomic Execution & Validation) workflow
Every agent-driven change should be one logical change, with declared file scope, validated through gates before commit: (1) mechanical integrity via `git diff --stat` matching declared scope, (2) build integrity (`dotnet build -c Release` for orchestrator changes — required because the active `dotnet watch` session locks `bin/Debug`), (3) orchestration boot success, (4) governance invariants intact (ledger append-only, phase transitions explicit, approval gates present). Reference: `.agents/skills/adpa-aev-workflow/SKILL.md`.

### RPAS / DRACO
RPAS-CM (Regulated Process Assurance System) governs artifact naming/versioning for governance docs (`governance/`, `GEMINI.md`). DRACO (Document Reasoning and Assessment Compliance Orchestra) is a multi-agent AI review board (Evidence Validator, Governance Evaluator, Counterfactual Challenger) that runs as an advisory or blocking quality gate on governed templates — this is why orchestration boot can take 60–90s. See `governance/RPAS.md` and `docs/07-architecture/ADR-004-DRACO-AI-GOVERNANCE.md`.

### Skills system
Domain-specific procedural knowledge lives in `.agents/skills/<name>/SKILL.md` (and some legacy ones directly under `skills/`). When you touch a feature that has a skill, load it first — it defines invariants and file maps other agents rely on. When you build a non-trivial new feature, create or update its `SKILL.md`.

## Operational Notes

- **Single pnpm workspace**: root and `server/` are joined via `pnpm-workspace.yaml` — `pnpm install` from either directory resolves to the same root-level `pnpm-lock.yaml`. Don't use `npm install`/`npm ci` anywhere in this repo.
- **Windows dev**: first browser request after `✓ Ready` can take minutes to compile; watch for `GET /… 200` in the terminal, not just the ready message. For a faster Turbopack cache, delete `.next` and run `pnpm dev:cache` (creates a junction to `%LOCALAPPDATA%`) — don't set `NEXT_DIST_DIR` to an absolute `C:\...` path, Next treats `distDir` as relative.
- **Auth in dev**: without Firebase credentials, use `POST /api/v1/auth/demo`, or register directly via `POST /api/v1/auth/register`. Firebase Auth is a non-critical dependency in `NODE_ENV=development`.
- **Commit but don't push**: commit locally as needed; never `git push` without explicit user request in this turn. A pre-push hook independently re-enforces this by running `verify:governed-features` and `test:features` and rejecting the push if either fails.
- **TypeScript strict, no bare `any`** without justification; parameterized SQL queries only (no string-interpolated SQL); UUID primary keys; JSONB for flexible/Markdown content.
- Don't touch `server/migrations/*.sql` for cleanup — they're historical records, not refactor targets.
