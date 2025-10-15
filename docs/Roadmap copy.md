# ADPA Implementation Roadmap

This document is a compact, actionable roadmap for implementing the main application pages and their server integration. Use it as a single reference while building features, writing tests, or creating tickets.

---

## High-level goals
- Ship a production-ready admin portal covering: AI generation, provider management, templates, documents, integrations, users, projects, jobs, analytics, search, security, and authentication flows.
- Ensure strong contracts (API shapes), request-scoped logging, validation, RBAC, and test coverage.

---

## Pages (priority & summary)
Listed in roughly high → medium priority for initial delivery.

1. auth/login — Main login page (High)
2. auth/forgot-password & auth/reset-password (High)
3. ai-providers — Manage AI providers (High)
4. templates — Create / Edit / Trash / Restore (High)
5. AI (generation UI) — Generate + preview (High)
6. documents — List, view, edit, export (High)
7. users — Admin user management (High)
8. projects — Project list / settings (Medium)
9. jobs — Job queue UI (Medium)
10. integrations — Confluence, SharePoint, etc. (Medium)
11. search — Global search UI (Medium-High)
12. analytics — Dashboards and KPIs (Medium)
13. security — Events, audit trail, incidents (High)

---

## Per-page contract & implementation notes
Each page section below includes: contract (inputs/outputs), required API endpoints, UI components, edge cases, tests, and rough estimate.

### 1) auth/login (Main)
- Contract: POST `/api/auth/login` => returns token (and/or cookie) + user object.
- Inputs: email, password, rememberMe
- Outputs: { token?, user, expiresAt }
- UI: login form, remember-me, error states, redirect after login.
- Edge cases: locked account, MFA placeholder, cookie path/samesite, redirects.
- Tests: unit validation; e2e login flow.
- Estimate: 1-2 dev days.

### 2) auth/forgot-password & auth/reset-password
- Contract:
  - POST `/api/auth/forgot` { email } => 202 (email sent or generic response)
  - POST `/api/auth/reset` { token, newPassword } => 200/400
- Requirements: short-lived token store, rate limiting, secure email template.
- UI: forgot form (email), confirmation; reset form (token from query).
- Edge cases: expired/used token, weak password rejection.
- Tests: token lifecycle integration tests.
- Estimate: 2-3 dev days.

### 3) ai-providers
- Contract: CRUD and provider test endpoints.
- Endpoints (server):
  - GET `/api/context-ai/providers` (list)
  - POST `/api/context-ai/providers` (create)
  - POST `/api/context-ai/providers/:id/configure` (update)
  - DELETE `/api/context-ai/providers/:id` (delete)
  - POST `/api/context-ai/:type/test/:name` (test specific provider)
- UI: provider cards list, add/edit dialog, toggle active, test button, delete confirmation.
- Edge cases: API keys masked, role-based access (admin-only), inconsistent provider shapes.
- Tests: form validation; integration create/update/delete; test endpoint mock.
- Estimate: 1–2 dev days (page largely present; wire server / error handling).

### 4) templates
- Contract: CRUD with soft-delete, preview, and generate hooks.
- Endpoints:
  - GET `/api/document-templates`
  - POST `/api/document-templates`
  - GET/PUT `/api/document-templates/:id`
  - POST `/api/document-templates/:id/trash` (or a DELETE soft-delete)
  - POST `/api/document-templates/:id/restore`
- UI: template editor (blocks), preview modal, metadata editor, trash bin view.
- Edge cases: validation mismatches, soft-delete visibility, versioning.
- Tests: Joi validation coverage; create + preview integration tests.
- Estimate: 3–5 dev days.

### 5) AI (generation UI)
- Contract: create generation job or immediate response.
- Endpoints (server ready):
  - POST `/api/context-ai/generate` (generate)
  - POST `/api/context-ai/preview` (context preview)
  - POST `/api/context-ai/statistics`
- UI: prompt editor (with template insertion), provider/model pickers, streaming/response viewer, job progress.
- Edge cases: token limits, provider timeout/failover, partial streaming.
- Tests: unit component tests; integration with job API stub.
- Estimate: 3–5 dev days.

### 6) documents
- Contract: CRUD, import/export, and generate from template.
- Endpoints:
  - GET `/api/documents`, GET `/api/documents/:id`
  - POST `/api/documents`, PUT `/api/documents/:id`
  - Export endpoints (PDF/Confluence)
- UI: list view, document detail with editor, metadata and actions panel.
- Edge cases: large content, concurrency, permission checks.
- Tests: save/load integration tests; export smoke tests.
- Estimate: 4–6 dev days.

### 7) users
- Contract: admin user management, role assignment, deactivate/reactivate.
- Endpoints: GET/POST/PUT `/api/users` and role endpoints.
- UI: user table, role editor modal, invite flow, deactivate action.
- Edge cases: self-demotion prevention, role propagation.
- Tests: role-change unit tests, invite flow.
- Estimate: 2–4 dev days.

### 8) projects
- Contract: project CRUD and members management.
- Endpoints: standard REST `/api/projects`.
- UI: list, project detail, member management.
- Edge cases: permissions, cleanup on delete.
- Tests: membership update tests.
- Estimate: 2–3 dev days.

### 9) jobs
- Contract: view, filter, and manage queued jobs.
- Endpoints: GET `/api/jobs`, GET `/api/jobs/:id`, POST `/api/jobs/:id/retry`, cancel.
- UI: jobs table, job detail with logs, retry/cancel buttons.
- Edge cases: large logs, in-progress streaming, paging.
- Tests: job listing + retry integration tests.
- Estimate: 2–3 dev days.

### 10) integrations
- Contract: list integrations, configure, sync, import page.
- Endpoints: e.g., `/api/integrations/confluence/*` (exists) and others.
- UI: per-integration config modal, sync status, logs.
- Edge cases: encrypted credentials, failed sync lifecycle.
- Tests: integration config save + sync mock tests.
- Estimate: 2–4 dev days.

### 11) search
- Contract: cross-entity search with filters.
- Endpoints: GET `/api/search?q=&type=&page=` (implement with DB FTS or external index)
- UI: global search bar, results page with type tabs, highlights.
- Edge cases: relevance tuning, large result sets.
- Tests: seeded data search tests.
- Estimate: 3–6 dev days (backend dependent).

### 12) analytics
- Contract: aggregated metrics and timeseries for usage/performance.
- Endpoints: GET `/api/analytics/*` (aggregate queries)
- UI: KPI cards, charts, date-range selector, filters.
- Edge cases: expensive queries, caching/aggregation requirements.
- Tests: aggregation unit/integration tests.
- Estimate: 3–4 dev days.

### 13) security
- Contract: security events, audit logs, incident reporting.
- Endpoints: GET `/api/security/events`, GET `/api/security/audit`, POST `/api/security/incidents`
- UI: events list, incident form, resolve action.
- Edge cases: sensitive-data redaction, export/retention requirements.
- Tests: audit and event ingestion tests.
- Estimate: 2–4 dev days.

---

## Cross-cutting concerns & standards
- Authentication & RBAC: All pages must enforce server-side permission checks. Use `requirePermission` middleware on protected endpoints.
- Logging & tracing: RequestId middleware must run before routes; use `childLogger({ requestId })` inside handlers. Keep helper-level `staticLog` for non-request code.
- Validation: Use Joi schemas for all request payloads; return structured 400 with `details` for UI to surface.
- Error handling: UI should show toast-friendly messages and optionally show server `details` on dev builds.
- Secrets: Do not expose API keys in UI; only show masked values and allow copy/rotate.
- Pagination & filtering: All list endpoints need `page` & `limit` (or cursor) support.
- Tests: Add unit tests for components and validation. Add integration tests for server endpoints using the existing test harness.

---

## Quality gates (before merging feature branches)
- TypeScript: `npx tsc --project server/tsconfig.json --noEmit` and client type-check.
- Linting: run ESLint/Prettier as configured.
- Unit tests: run `pnpm test` or `npm test` (project default).
- Smoke e2e: Playwright/Cypress: login → create provider → create template → generate document.

---

## Timeline (suggested phases)
- Phase 0 (Days 0–3): auth/login + forgot/reset, ai-providers wiring, templates basic CRUD, request-scoped logging verification.
- Phase 1 (Days 3–10): AI generation UI, documents, users, jobs, integrations basic.
- Phase 2 (Days 10–20): analytics, search, projects, security dashboards, polish, tests, accessibility.

Adjust per team size and parallelization.

---

## Deliverables for each page
- Page components + styles
- API client adapters in `lib/api.ts` (use central client and `credentials: "include"`)
- Joi validation schema updates for any API changes
- Unit tests and at least one integration smoke test
- Short README or ticket describing acceptance criteria and how to run locally

---

## Recommended immediate next steps
1. Run a repo-wide gap analysis: map pages → existing server endpoints. (I can do this for you.)
2. Prioritize the Phase 0 pages and create tickets with the contracts above.
3. Implement small smoke tests for the critical path (login → create provider → create template → generate document).

---

## If you want me to continue
- Option A: I can implement the highest-priority page (pick one) end-to-end and open a PR.
- Option B: I can generate ticket-level tasks for your tracker (Jira/Notion/Trello).
- Option C: I can run the repo-gap scan now and produce a list of missing endpoints.

Pick A / B / C and I’ll proceed.

---

_Last updated: 2025-09-09_
