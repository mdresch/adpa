# ADPA System — Landing Page Summary

Use this as the basis for your GitBook landing or “About ADPA” page. Short, scannable, and link-friendly.

---

## What Is ADPA?

**ADPA** (Automated Document Processing & Analytics) is an enterprise platform for **ingesting, normalizing, and analyzing project management documents**. It turns charters, risk registers, and other project artifacts into structured, searchable knowledge and supports PMBOK-aligned document generation, governance, and decision support.

## In One Sentence

ADPA is the **ingestion and normalization layer** that pulls in project documents, extracts domain-normalized knowledge, and feeds semantic analysis, document generation, and governance tools—part of a larger PMMA (Project Management Mastery Accelerator) ecosystem.

## Core Capabilities

| Area | What ADPA Does |
|------|-----------------|
| **Ingestion** | Accept and parse project documents (charters, risk registers, etc.) from multiple sources |
| **Normalization** | Domain-normalized knowledge extraction and semantic analysis of project artifacts |
| **Document generation** | PMBOK-aligned templates; content stored as Markdown, export to PDF/DOCX on demand |
| **Integrations** | AI providers (OpenAI, Google AI, etc.), Confluence, SharePoint, and project management tools |
| **Real-time & jobs** | Supabase Realtime for DB/presence; Socket.io and Bull queues for jobs, AI progress, notifications |

## Tech at a Glance

- **Frontend:** Next.js (Pages Router), React, TypeScript
- **Backend:** Express, TypeScript, REST + Socket.io
- **Data:** PostgreSQL (Supabase), JSONB for content; Redis for cache/queues
- **Rules:** Markdown as canonical storage; strict TypeScript; Joi/express-validator for input validation

## Who It’s For

- **Project offices (PMOs)** and teams that need consistent, traceable project documentation
- **Organizations** adopting PMBOK 7 and wanting automated charter generation, maturity scoring, and governance support
- **Developers and integrators** extending or embedding ADPA into existing toolchains (Jira, MS Project, Confluence, etc.)

## Get started in 5 minutes

1. **Prerequisites** — Node.js 18+, pnpm (or npm). PostgreSQL and Redis available (e.g. Supabase + Redis, or local).
2. **Clone and install** — `git clone <repo>` then `pnpm install` (root), `cd server && npm install` (backend).
3. **Configure** — Copy `server/.env.example` to `server/.env` and `.env.local.example` to `.env.local`. Set `POSTGRES_URL`, `NEXT_PUBLIC_API_URL=http://localhost:5000`, and optionally `REDIS_URL`.
4. **Run** — Terminal 1: `cd server && npm run dev`. Terminal 2: `npm run dev`. Frontend: http://localhost:3000, API: http://localhost:5000, health: http://localhost:5000/health.
5. **Verify** — Open the app, call `GET /health`; see [Quick Start](/quick-start) for login, migrations, and optional AI keys.

## Where to Go Next

- **New to the project?** → Start with [Getting Started](/getting-started) and [Quick Start](/quick-start).
- **Developing or deploying?** → See [Architecture](/architecture), [Development](/development), and [Deployment](/deployment).
- **Integrating ADPA?** → Check [Integrations](/integrations) and [APIs](/apis).

---

*This summary is derived from the ADPA repository documentation and the PMMA Project Charter. Adjust internal links (e.g. `/getting-started`) to match your GitBook structure.*
