# ADR 024: Infrastructure & Deployment Strategy

## 1. Status
**Proposed (2026-07-23)** — the infrastructure and deployment topology described here are the current operational model; this ADR records it retroactively. No opinion on future changes (container orchestrators, serverless, etc.) is recorded here.

## 2. Context

ADPA is a monorepo with two services: a Next.js (Pages Router) frontend on port 3000 and an Express.js backend on port 5000. Infrastructure includes PostgreSQL (Supabase), Redis, RabbitMQ, Neo4j (optional), and optional observability backends (Langfuse, Pinecone, MongoDB). Deployment is currently VM-based; Docker and Aspire are referenced in project docs but are not yet the production deployment path.

Verified against the repo and running environment:

- **Frontend**: Next.js 16 with Pages Router. `dev` script pins port 3000 via `--port 3000` to avoid conflict with backend. Proxies `/api/*` to the Express backend.
- **Backend**: Express + TypeScript in `server/`. Start command: `cd server && npm run dev`. Nodemon restarts on `server/` code changes.
- **Database**: Supabase PostgreSQL. Schema setup via `server/migrations/000_baseline.sql`.
- **Redis**: required for Bull queues. Optional in development (server starts without it).
- **RabbitMQ**: required for the `RabbitQueueAdapter` queues. Listed as non-critical in the startup dependency graph.
- **Neo4j**: optional; used for knowledge graph projections.
- **MongoDB**: optional; used for document storage fallback.
- **Pinecone**: optional; used for vector RAG.
- **Docker**: referenced in documentation and used in some deployment flows, but the canonical local dev path is direct Node invocation.
- **Aspire**: referenced in the project as a potential orchestration layer, not yet operational.
- **Package managers**: `pnpm` for frontend root, `npm` for `server/`. Both are installed via `pnpm install` from root.

## 3. Decision

We adopt a **VM-based, two-process deployment** (frontend + backend) with a shared Postgres database and Redis for queues. Docker and Aspire are documented deployment options in the project but are not in the critical path for local development or the current production target. The architecture supports containerization because both services are stateless and configurable through env vars.

### 3.1 Service Topology

```
Client
  ├── Next.js frontend (:3000)
  │     ├── Firebase Auth (client SDK)
  │     └── Proxied /api/* → Express backend
  └── Express backend (:5000)
        ├── PostgreSQL (Supabase)
        ├── Redis (Bull queues)
        ├── RabbitMQ (queue adapter)
        ├── Neo4j (optional, knowledge graph)
        ├── Langfuse (optional, observability)
        └── External AI providers (OpenAI, Google, Mistral, Azure, Anthropic, Ollama, xAI)
```

Both front and backend are single-process, not clustered. Horizontal scaling would require a reverse proxy in front of the backend and session affinity for frontend WebSocket connections (AI chat, SSE).

### 3.2 Configuration Model

All configuration is env-var driven. No config files are read at runtime. Required env vars for minimum startup: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `BACKEND_URL`. Optional env vars control feature flags, provider credentials, and queue tuning (see [ADR-017](ADR-017-queue-and-background-processing-architecture.md) §3.3 for queue prefetch env vars).

### 3.3 Dependency Graph

The backend uses a startup dependency graph for critical and optional services. Critical (must succeed): Security Config, Database. Optional (server starts without them): Redis, Neo4j, RabbitMQ, MongoDB, Pinecone, Langfuse, Upstash, Morphic DB, Firebase Auth. A health endpoint (`/api/dev/backend-health`) and a frontend banner poll it during development.

### 3.4 Build and Package Management

- **Frontend**: `pnpm install` at root. Build handled by Next.js.
- **Backend**: `npm` in `server/`. `pnpm install` at root installs both via workspace detection.
- **Postinstall scripts**: `pnpm.onlyBuiltDependencies` in root `package.json` controls which packages can run postinstall scripts (`puppeteer`, `sharp`, `esbuild` are key).
- **TypeScript strict mode**: enforced in `server/`. `any` types are disallowed unless explicitly justified.

### 3.5 Database Migrations

Schema changes are applied via SQL migration files under `server/migrations/`. The baseline migration (`000_baseline.sql`) is run once against an empty database. Subsequent schema changes are additive; there is no automated migration runner in development — developers apply migrations manually.

## 4. Options Considered

### Option A: Monolithic Docker image (frontend + backend in one container)
| Dimension | Assessment |
|---|---|
| Simplicity | High — one image, one deploy |
| Scaling | Poor — cannot scale frontend and backend independently |
| Debugging | Poor — logs from both services interleave |

Rejected: frontend and backend have different scaling profiles (frontend is CPU-light, I/O-heavy; backend is I/O-heavy, queue-heavy). Separating them at the process level matches the current boundary and matches the Next.js proxy config.

### Option B (Recommended): Two-process VM deployment with env-var config
| Dimension | Assessment |
|---|---|
| Simplicity | Medium — two processes, but each is simple |
| Scaling | Medium — each process can be scaled independently behind a proxy |
| Debugging | High — logs per service, clear failure boundaries |

The current implementation. Chosen because it is already in production, the startup dependency graph is working, and the two-process model matches the Next.js/Express architecture.

### Option C: Aspire-based orchestration
| Dimension | Assessment |
|---|---|
| Simplicity | High — .NET Aspire manages inter-service dependencies visually |
| Compatibility | Uncertain — Aspire is .NET-centric; Express/Next.js hosting patterns differ from the .NET orchestrator's Aspire setup |

Not chosen now. Aspire is referenced in project docs as a potential future option, particularly for the `.NET orchestrator / Adpa.Web` tier. The Node.js services are not yet Aspire-managed.

## 5. Consequences

### Positive
- **Fast local dev**: starting both services is two terminal windows. No Docker compose to maintain.
- **Clear process boundaries**: backend restart (nodemon) does not terminate frontend; the frontend banner shows backend health instead.
- **Env-var portability**: deploying to any VM (Railway, Vercel, bare metal) requires only setting the same env vars.

### Negative
- **Manual migration application**: developers must run SQL files manually. There is no automated migration runner that checks for unapplied migrations on startup.
- **Optional dependency sprawl**: six optional services (Redis, RabbitMQ, Neo4j, MongoDB, Pinecone, Langfuse) mean the startup graph is complex to debug when one is misconfigured.

### Risks
- **Database credential rotation**: there is no documented rotation schedule for `DATABASE_URL`. If the Supabase credential expires, the backend fails immediately in production.
- **Redis as a single point of failure**: if Redis is down, all Bull queues fail and the backend returns 502 for generation endpoints. Redis is non-critical in the startup graph, which means the server starts but feature functionality degrades silently. This is acceptable for development but must be a first-class health check in production.

## 6. Action Items

1. Add a pre-startup migration runner that checks for pending `000_baseline.sql` and fails fast if the database is empty.
2. Document the deployment topology (two-process, env vars, health endpoints) in `docs/07-architecture/DEPLOYMENT-ARCHITECTURE.md` (which already exists; update it to match current reality).
3. Add a Redis health check to `/api/v1/health` so queue unavailability is visible before user requests start failing.

## 7. References

- `package.json` (root) — frontend scripts, `next.config.mjs` rewrites, `pnpm.onlyBuiltDependencies`
- `server/package.json` — backend scripts, jest config
- `server/.env.example` — required and optional env vars
- `server/migrations/000_baseline.sql` — baseline schema
- `server/src/startup/dependencies/` — startup dependency graph nodes (Security Config, Database, Redis, etc.)
- `server/src/middleware/dev-backend-health.ts` — `/api/dev/backend-health` polling
- `docs/07-architecture/DEPLOYMENT_ARCHITECTURE.md` — existing deployment doc (to be updated)
- [ADR-009: Unified Authentication Across Tiers](ADR-009-unified-authentication.md) — Firebase auth deployment requirements
- [ADR-017: Queue & Background Processing Architecture](ADR-017-queue-and-background-processing-architecture.md) — Redis-backed queue layer
