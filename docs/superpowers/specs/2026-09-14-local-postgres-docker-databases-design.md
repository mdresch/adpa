# Local Postgres Docker Databases (Dev & Jest Contracts) Design Spec

**Date**: 2026-09-14  
**Status**: Approved  
**Feature ID**: local-postgres-docker-databases  

---

## Problem

Developers running ADPA locally and executing Jest contract / integration tests currently rely on either remote Azure / Supabase PostgreSQL instances or fragmented test configs. Running against cloud databases introduces latency, requires active internet connectivity and Azure credentials, and risks polluting cloud environments.

Furthermore, running integration and contract tests locally requires an isolated database that does not conflict with the local development application database (port 5432) and guarantees clean container teardown after tests finish.

## Success Criteria

- [ ] Create a dedicated lightweight `docker-compose.db.yml` at project root declaring two PostgreSQL containers powered by `pgvector/pgvector:pg17`:
  - `postgres-dev`: Local application database on port `5432`, persisting in `adpa_postgres_dev_data`.
  - `postgres-test`: Jest Contracts / Test database on port `5433`, with disposable volume `adpa_postgres_test_data`.
- [ ] Create a cross-platform test runner script (`server/scripts/run-test-contracts-db.mjs`) that:
  - Spins up `postgres-test` on demand.
  - Polls `pg_isready` until the database is ready for connections.
  - Runs migrations against `localhost:5433` to build the latest schema.
  - Executes Jest tests with `DATABASE_URL` pointed to `localhost:5433`.
  - Guarantees teardown with volume cleanup (`docker compose -f docker-compose.db.yml down -v postgres-test`) in a `finally` block and signal trap (SIGINT/SIGTERM).
- [ ] Add npm convenience scripts to `package.json` and `server/package.json` (`db:up`, `db:down`, `db:status`, `db:migrate:local`, `test:contracts`, `test:contracts:features`).
- [ ] Update `server/.env.test`, `server/src/__tests__/setup.ts`, and `server/tests/setup/global-setup.js` to seamlessly support the local test database without requiring remote Azure credentials.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-001 | `docker-compose.db.yml` defines `postgres-dev` (port 5432, `pgvector:pg17`, db `adpa`, user `myuser`, pass `mypassword`, persistent volume) and `postgres-test` (port 5433, `pgvector:pg17`, db `adpa_test_db`, user `test_user`, pass `test_pass`, ephemeral volume). | P0 |
| REQ-002 | `server/scripts/run-test-contracts-db.mjs` manages the complete lifecycle of `postgres-test` (up -> healthcheck -> migrations -> jest execution -> teardown with volume wipe). | P0 |
| REQ-003 | Teardown is guaranteed via `finally` execution and signal trapping (`SIGINT`, `SIGTERM`), preventing zombie test containers on test aborts or failures. | P0 |
| REQ-004 | Add scripts in root `package.json` and `server/package.json` for starting/stopping the dev database and running tests with automated teardown. | P0 |
| REQ-005 | Update `server/.env.test` and test setup files (`setup.ts`, `global-setup.js`, `global-teardown.js`) to support fallback to `localhost:5433` if Azure credentials are not provided. | P1 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- Existing cloud/Azure workflows when `AZURE_TEST_DB_HOST` is explicitly configured.
- Existing root `docker-compose.yml` (the lightweight file is an independent additive compose file `docker-compose.db.yml`).
- Port availability: Port `5432` for dev and `5433` for test run on separate ports, allowing developers to keep their local dev app running while executing tests.

## Risks

| Risk | Mitigation |
|------|------------|
| Docker container fails to stop if tests crash or process is killed with Ctrl+C | Register `SIGINT`, `SIGTERM`, and `uncaughtException` process listeners in the runner script to trigger `docker compose down -v postgres-test`. |
| Port 5432 or 5433 already in use by external processes | Runner script probes port availability and provides instructional error messages if ports are occupied. |
| Migrations fail due to missing PostgreSQL extensions | Use `pgvector/pgvector:pg17` which includes `vector`, `uuid-ossp`, `pgcrypto`, and other required extensions. |

## Test Plan

| REQ | Verification Step |
|-----|-------------------|
| REQ-001 | Validate `docker compose -f docker-compose.db.yml config` passes without syntax or schema errors. |
| REQ-002 | Run `npm run test:contracts` and verify `postgres-test` starts, passes health check, runs test suite, and exits cleanly. |
| REQ-003 | Test teardown guarantee: abort test run mid-flight and verify `adpa-postgres-test` container and volume are destroyed (`docker ps -a`). |
| REQ-004 | Verify all npm scripts (`db:up`, `db:down`, `db:status`, `test:contracts`) execute successfully in both root and `server/`. |
| REQ-005 | Run Jest unit and contract tests locally without Azure env vars and verify database connection connects to `localhost:5433`. |

