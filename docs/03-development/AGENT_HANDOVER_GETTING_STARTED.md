# ADPA Agent Handover - Getting Started

Use this document when a new coding agent joins the repo and needs to become productive quickly.

## 1. What this repo is

ADPA is a full-stack platform for AI-assisted document processing, governance workflows, and portfolio/program management.

- Frontend: Next.js (App Router) in repo root (`app/`, `components/`, `lib/`).
- Backend: Express + TypeScript in `server/` (`server/src/routes`, `server/src/services`).
- Data and infra: PostgreSQL (Supabase), Redis queues, optional Neo4j/vector services.
- Realtime: Socket.IO and queue/worker status monitoring.

## 2. Source of truth files

Start here first:

1. Root product + setup overview: `README.md`
2. Stable local startup runbook: `docs/01-getting-started/KNOWN_GOOD_LOCAL_RUNBOOK.md`
3. Frontend package scripts: `package.json`
4. Backend package scripts: `server/package.json`
5. Backend entrypoint and route registration: `server/src/server.ts`
6. Frontend API client: `lib/api.ts` and `lib/api-url.ts`

## 3. First 60 minutes checklist

1. Install dependencies
```bash
pnpm install
cd server && npm install && cd ..
```

2. Prepare env files
```bash
cp .env.local.example .env.local
cp server/.env.example server/.env
```

3. Start backend (terminal A)
```bash
cd server
npm run dev
```

4. Start frontend (terminal B)
```bash
cd ..
pnpm dev
```

5. Verify health
```bash
curl http://127.0.0.1:5000/health
```

6. Open app and validate a critical path
- Open frontend
- Login
- Navigate to `/jobs`
- Confirm queue and worker tabs load data

## 4. Port and docs caveat

There are mixed port references across older docs:

- Root `package.json` runs frontend on port `3005` (`next dev -p 3005`).
- Some older runbooks still mention `3000`.

When in doubt, trust `package.json` scripts and active terminal output.

## 5. Repo map for common tasks

### Frontend
- Pages: `app/**/page.tsx`
- Shared UI: `components/`
- API + types client-side: `lib/api.ts`
- Auth/websocket contexts: `contexts/`

### Backend
- Route handlers: `server/src/routes/`
- Domain services: `server/src/services/`
- Middleware: `server/src/middleware/`
- DB connection and queries: `server/src/database/`

### Queue and job monitoring
- Jobs page: `app/jobs/page.tsx`
- Queue dashboard UI: `app/jobs/components/QueueDashboard.tsx`
- Worker status UI: `app/jobs/components/WorkerStatus.tsx`
- Queue APIs: `server/src/routes/queue-stats.ts`
- Queue service: `server/src/services/queueService.ts`

## 6. Quick test commands

From repo root:

```bash
pnpm test
pnpm lint
```

Targeted tests/examples:

```bash
pnpm test:db-unit
pnpm test:e2e
```

Backend only:

```bash
cd server
npm test
```

## 7. Current documentation note

Roadmap files include archived planning docs and newer completion analysis. For status checks, use:

- `docs/roadmap/README.md`
- `docs/roadmap/ROADMAP_COMPLETION_ANALYSIS.md`

Treat `docs/roadmap/archive/` as historical context.

## 8. Safe first contribution pattern

1. Pick a narrow vertical slice (one page + one API endpoint).
2. Confirm existing route + client method before adding new APIs.
3. Add/adjust tests nearest to touched code.
4. Validate UI path manually.
5. Update docs if behavior or status changed.

## 9. Handover template (copy/paste for next agent)

```md
## Scope completed
- ...

## Files changed
- ...

## Behavior changes
- ...

## Tests run
- ...

## Known risks / follow-ups
- ...
```

