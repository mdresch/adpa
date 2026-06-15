# Implementation Plan: Post-Login Feature Boot & Health Panel

## Goal Description
Provide a dashboard panel loaded immediately post-login that displays a diagnostic checklist of critical and optional system routes and dependencies.

## Proposed Changes

### `server/src/modules/health/`
- [NEW] Build Express backend probes for checking connectivity to optional services (Redis, Neo4j, MongoDB, RabbitMQ, Firebase Auth).

### `app/projects/page.tsx` or `app/dashboard/page.tsx`
- [MODIFY] Implement a frontend page/panel that fetches the API checks (with 20s timeouts) and presents a status list (e.g., `Neo4j: Optional (Offline)` vs `Database: Critical (Online)`).

### `next.config.mjs`
- [MODIFY] Register these status routes under Next.js configuration proxy headers (`/api/dev/backend-health`) to dynamically show when the backend reloads or starts up.

## Verification Plan
- **Manual Verification**: Log into the application and navigate to the dashboard. Verify that the health panel loads immediately and correctly identifies the status of Redis, Neo4j, MongoDB, RabbitMQ, and Firebase Auth.
