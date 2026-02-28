# ADPA Developer Platform API Reference

Developer-facing reference for the ADPA backend REST API. Use this for integrations, automation, and third-party clients.

**Version:** 1.0  
**Base URL:** `https://<backend-host>/api` (e.g. `http://localhost:5000/api` in development)  
**Backend:** Express + TypeScript (`/server`)

---

## Table of contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Common conventions](#3-common-conventions)
4. [API domains](#4-api-domains)
5. [Health & metrics](#5-health--metrics)
6. [OpenAPI](#6-openapi)

---

## 1. Overview

- All document content is stored as **Markdown** (JSONB in PostgreSQL). PDF/DOCX are generated on demand.
- Primary database: **PostgreSQL** (Supabase). Real-time: **Supabase Realtime** and **Socket.io** for jobs and notifications.
- Input validation uses **Joi** / **express-validator**; errors return JSON with `error` or `message` fields.
- Most routes require a valid **JWT** in the `Authorization` header unless noted otherwise.

---

## 2. Authentication

### 2.1 JWT (Bearer)

Send the token in the `Authorization` header:

```http
Authorization: Bearer <your-jwt-token>
```

- Issued on **login** or **register**. Payload includes `userId` and `email`.
- Expiry is configured server-side (e.g. 24h). Expired tokens return `401` with `error: "Token expired"`.
- Invalid or missing token returns `401` with `error: "Access token required"` or `"Invalid token"`.

### 2.2 Obtaining a token

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register; body: `email`, `password`, `name`, optional `companyName`. Returns `user`, `token`, optional `company`. |
| `POST` | `/api/auth/login` | Login; body: `email`, `password`. Returns `user`, `token`. |
| `POST` | `/api/auth/refresh` | Refresh token (if implemented). |

### 2.3 Permissions

Some routes use permission checks (e.g. `requirePermission("projects.create")`). Standard permissions include:

- `projects.create`, `projects.read`, `projects.update`, `projects.delete`, `projects.view`, `projects.replicate`, `programs.manage`
- `documents.create`, `documents.read`, `documents.update`, `documents.delete`
- `templates.create`, `templates.read`, `templates.update`, `templates.delete`
- `ai.generate`, `admin`, etc.

Insufficient permission returns `403 Forbidden`.

---

## 3. Common conventions

- **IDs:** UUIDs for projects, documents, templates, users, etc.
- **Pagination:** Many list endpoints support `page` and `limit` query parameters (e.g. `?page=1&limit=10`).
- **Errors:** JSON body with `error` (string) or `message`; optional `details` or `code` for conflict/business errors.
- **Request ID:** Responses may include an `X-Request-Id` header for tracing (set by server middleware).
- **CORS:** Allowed origins include configured frontend URL and Vercel previews; credentials supported.

---

## 4. API domains

Endpoints are grouped by base path. Path parameters are denoted with `:param`.

---

### 4.1 Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | No | Register; body: `email`, `password`, `name`, optional `companyName`. |
| `POST` | `/login` | No | Login; body: `email`, `password`. |
| `POST` | `/refresh` | Yes | Refresh token (if available). |
| `GET`  | `/me` | Yes | Current user profile. |
| `POST` | `/logout` | Yes | Logout / invalidate (if implemented). |

---

### 4.2 Projects — `/api/projects`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List projects; query: `page`, `limit`, `status`, `framework`, `search`. |
| `GET` | `/:id` | Get project by ID. |
| `POST` | `/` | Create project; permission: `projects.create`. |
| `PUT` | `/:id` | Update project; permission: `projects.update`. |
| `DELETE` | `/:id` | Delete project; permission: `projects.delete`. |
| `POST` | `/:id/replicate` | Replicate project; permission: `projects.replicate`. |
| `GET` | `/:id/context` | Get project context (for templates/context injection). |
| `GET` | `/:projectId/context-items` | List context items. |
| `POST` | `/:projectId/context-items` | Add context item (e.g. file upload). |
| `PUT` | `/:projectId/context-items/:itemId` | Update context item. |
| `DELETE` | `/:projectId/context-items/:itemId` | Delete context item. |
| `POST` | `/:projectId/context-items/fetch-url` | Fetch URL as context. |
| `GET` | `/:projectId/context-items/integration-pages` | Integration pages. |
| `GET` | `/:projectId/context-items/analytics` | Context usage analytics. |
| `POST` | `/:projectId/context-items/:itemId/log-usage` | Log context usage. |
| `GET` | `/:projectId/context-items/recommendations` | Context recommendations. |
| `GET` | `/:projectId/team-members` | List team members. |
| `GET` | `/:projectId/risks` | List risks. |
| `POST` | `/:projectId/risks` | Create risk. |
| `PUT` | `/:projectId/risks/:riskId` | Update risk. |
| `DELETE` | `/:projectId/risks/:riskId` | Delete risk. |
| `POST` | `/:projectId/documents` | Create document in project. |
| `GET` | `/:projectId/documents/:documentId` | Get document (ID may be URL-encoded). |
| `GET` | `/:projectId/documents/:documentId/versions` | List document versions. |
| `PUT` | `/:projectId/documents/:documentId` | Update document. |
| `POST` | `/:projectId/documents/:documentId/comments` | Add comment. |
| `GET` | `/:id/drift-detections` | List drift detections. |
| `PUT` | `/:id/drift-detections/:driftId/accept` | Accept drift. |
| `PUT` | `/:id/drift-detections/:driftId/remove` | Remove drift. |
| `POST` | `/:id/upgrade-to-program` | Upgrade project to program; permission: `programs.manage`. |
| `GET` | `/:projectId/compliance-security` | Compliance/security summary. |

---

### 4.3 Documents — `/api/documents`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List documents; query: `page`, `limit`, filters. |
| `GET` | `/:id` | Get document by ID. |
| `GET` | `/:id/versions` | List document versions. |
| `GET` | `/:id/quality-audit` | Quality audit for document. |
| `GET` | `/:id/export/pdf` | Export document as PDF. |
| `GET` | `/:id/export/docx` | Export document as DOCX. |
| `GET` | `/:id/summaries` | Document summaries (compression cache). |
| `GET` | `/:id/pdf-preview` | PDF preview. |
| `GET` | `/project/:projectId` | Documents for project. |
| `GET` | `/project/:projectId/stats` | Document stats for project. |
| `GET` | `/project/:projectId/deleted` | Deleted documents for project. |
| `POST` | `/project/:projectId` | Create document in project. |
| `PUT` | `/:id` | Update document. |
| `DELETE` | `/:id` | Soft-delete document. |
| `POST` | `/:id/restore` | Restore deleted document. |
| `DELETE` | `/:id/permanent` | Permanently delete document. |
| `POST` | `/:id/feedback` | Submit feedback. |
| `POST` | `/test-feedback` | Test feedback (no auth). |
| `GET` | `/test` | Test route (no auth). |

---

### 4.4 Document generation — `/api/document-generation`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/check-template` | Pre-flight: check if template already used in project; body: `projectId`, `templateId`. Returns `409` with `TEMPLATE_ALREADY_USED` if conflict. |
| `POST` | `/generate` | Generate document with AI; body: `projectId`, `name`, `description`, `templateId`, `userPrompt`, `provider`, `model`, `temperature`, `includeStakeholders`, `includeDocuments`, `customContext`. Permission: `documents.create`. |
| `POST` | `/generate-new-version` | Generate new version of existing document. |
| `POST` | `/regenerate/:documentId` | Regenerate document. |
| `GET` | `/regenerate/job/:jobId` | Status of regeneration job. |

---

### 4.5 Templates — `/api/templates`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List templates; query: `page`, `limit`, `framework`, `category`, `search`, `is_public`, `template_scope`. |
| `GET` | `/:id` | Get template by ID. |
| `POST` | `/` | Create template. |
| `PUT` | `/:id` | Update template. |
| `DELETE` | `/:id` | Soft-delete template. |
| `DELETE` | `/:id/hard` | Hard-delete template. |
| `POST` | `/:id/restore` | Restore deleted template. |
| `POST` | `/:id/promote-to-company` | Promote to company scope. |
| `POST` | `/:id/promote-to-standard` | Promote to standard scope. |
| `POST` | `/:id/clone` | Clone template. |
| `POST` | `/:id/use` | Record template use. |
| `POST` | `/:id/promote` | Promote template. |
| `POST` | `/:id/archive` | Archive template. |
| `POST` | `/:id/compliance/approve` | Compliance approval. |

---

### 4.6 Jobs — `/api/jobs`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List jobs for current user; query: `page`, `limit`, `status`, `type`. |
| `GET` | `/:id` | Get job by ID. |
| `POST` | `/` | Enqueue job; body: `type`, `data`, etc. |
| `DELETE` | `/:id` | Cancel job. |
| (Other) | (see route file) | Status, progress, result endpoints as implemented. |

---

### 4.7 GKG (Governance Knowledge Graph) — `/api/gkg`

Requires Neo4j (`NEO4J_URI`). Permission: `projects.view`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sync` | Enqueue sync; body: `bootstrap?`, `projectId?`, `documentId?` (one required). Returns `jobId`, `status`, `type`. |
| `GET` | `/summary` | Dashboard summary: counts (programs, projects, documents, tasks, semantic units), top projects. |
| `GET` | `/context` | Get GKG context for strategy; query params for document/project and strategy. |
| `POST` | (see route file) | Other GKG operations (e.g. context for generation). |

---

### 4.8 Context injection — `/api/context-injection`

Template and project context operations. All require authentication.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/inject` | Inject project context into template content; body: `templateContent`, `projectId`, `config`. |
| `POST` | `/parse-variables` | Parse template variables from content; body: `content`. |
| `POST` | `/resolve-variables` | Resolve variables with project context; body: `variables`, `projectId`. |
| `POST` | `/generate-toc` | Generate table of contents. |
| `POST` | `/add-cross-references` | Add cross-references. |
| `POST` | `/add-citations` | Add citations. |
| `POST` | `/structure-content` | Structure content. |

---

### 4.9 Jira linkage — `/api/jira-linkage`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/config` | Get Jira linkage config. |
| `PUT` | `/config` | Update config. |
| `GET` | `/document/:documentId` | Jira linkage for document (decode `documentId` if URL-encoded). |
| `POST` | `/create-issue` | Create Jira issue. |
| `POST` | `/test/:integrationId` | Test integration. |

---

### 4.10 Queue & diagnostics — `/api/queue-stats`, `/api/jobs/diagnostics`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/queue-stats/overview` | Queue overview. |
| `GET` | `/api/queue-stats/workers` | Worker list. |
| `GET` | `/api/queue-stats/metrics` | Queue metrics. |
| `GET` | `/api/queue-stats/health` | Queue health. |

---

### 4.11 Other domains (summary)

- **Users:** `/api/users` — CRUD, profile, permissions.
- **Companies:** `/api/companies` — Company list and management.
- **AI:** `/api/ai`, `/api/ai/copilot`, `/api/ai-providers`, `/api/ai-models`, `/api/ai-failover`, `/api/ai-analytics` — Providers, models, chat, analytics.
- **Integrations:** `/api/integrations`, `/api/integrations/confluence`, `/api/integrations/github`, `/api/integrations/sharepoint`, `/api/integrations/ibabs`, `/api/dynamics365-guides` — External integrations.
- **Document templates / generator:** `/api/document-templates`, `/api/document-generator` — Template and generation modules.
- **Baselines:** `/api/baselines` — Baseline create, list, approve, etc.
- **Drift:** `/api/drift` — Drift detection.
- **Digital twin:** `/api/digital-twin/assets`, `/api/digital-twin/events`, `/api/digital-twin/triggers`, `/api/digital-twin/ingestion` — Assets, events, triggers, ingestion.
- **Analytics:** `/api/analytics` — Dashboard, system, events, activity, performance.
- **Security:** `/api/security` — Security-related endpoints.
- **Settings:** `/api/settings` — User/org settings.
- **Tasks:** `/api/tasks` — WBS import, task CRUD, assignments, dependencies, workload.
- **Portfolios / programs:** `/api/portfolios`, `/api/programs`, `/api/portfolio`, `/api/portfolio-domains` — Portfolio and program management.
- **Approvals, notifications, knowledge-base, OKRs, signatures, search, mitigation plans, PMBOK 6, review, issues, risks, lessons, context-orchestrator, playbooks, etc.** — Mounted under `/api/<resource>`; see `server/src/server.ts` for full list.

---

## 5. Health & metrics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | API health; returns `status`, `timestamp`, `version`. |
| `GET` | `/metrics` | No* | Prometheus metrics (no `/api` prefix; may be protected in production). |

---

## 6. OpenAPI

An OpenAPI 3.0 skeleton for the Developer Platform API is available at:

- **`docs/06-features/DEVELOPER_API_OPENAPI.yaml`**

It covers a subset of endpoints (auth, projects, documents, document-generation, templates, jobs, GKG, context-injection). Expand it with request/response schemas and examples as needed. Use it with Swagger UI, Redoc, or code generators.

---

## References

- Backend app: `server/src` (routes, services, modules).
- Route registration: `server/src/server.ts`.
- Auth middleware: `server/src/middleware/auth.ts`.
- Validation: `server/src/middleware/validation.ts`.
- AGENTS.md and project rules: repo root.
