# Local development databases

Day-to-day ADPA development runs the Next.js app and the Express API on the host. PostgreSQL is the piece that runs in Docker, from `docker-compose.db.yml`.

`docker-compose.dev.yml` is not in this repository. Commands that combine `docker-compose.yml` with that override file will fail. Use the scripts below.

The frontend listens on port 3000 (`pnpm dev`). The API listens on port 5000 (`cd server && npm run dev`). In development the API treats Postgres as required and Redis, Neo4j, RabbitMQ, and the other optional stores as skippable.

## Two databases, two ports

`docker-compose.db.yml` defines both databases with `pgvector/pgvector:pg17`.

| Service | Container | Host port | Database | User | Password | Volume | Restart |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `postgres-dev` | `adpa-postgres-dev` | 5432 | `adpa` | `myuser` | `mypassword` | `adpa_postgres_dev_data` | `unless-stopped` |
| `postgres-test` | `adpa-postgres-test` | 5433 | `adpa_test_db` | `test_user` | `test_pass` | `adpa_postgres_test_data` | `no` |

Dev connection string:

```text
postgresql://myuser:mypassword@localhost:5432/adpa
```

Contract-test connection string (the test runner sets this itself):

```text
postgresql://test_user:test_pass@localhost:5433/adpa_test_db
```

These are the local compose credentials. They are not the Azure connection string in `server/.env.example`.

## Start, migrate, and stop the dev database

From the repository root (the same scripts exist under `server/package.json` and point at `../docker-compose.db.yml`):

```bash
pnpm db:up
pnpm db:status
pnpm db:migrate:local
```

`pnpm db:up` starts only `postgres-dev`. It does not start `postgres-test` or Redis.

`pnpm db:migrate:local` runs `server/scripts/migrate-local-dev.mjs`, which always calls `tsx scripts/run-migrations.ts --reset` with `DATABASE_URL` forced to the dev connection string above. `--reset` drops and recreates the `public` schema (`DROP SCHEMA public CASCADE`) before applying `server/migrations/*.sql`. Expect the local dev database to be empty of application data after this command. It does not run `seed-all.ts`.

Point the API at that database by setting `DATABASE_URL` (and the matching `DB_*` variables) in `server/.env` to the dev connection string before `npm run dev`.

Stop the dev database with:

```bash
pnpm db:down
```

That runs `docker compose -f docker-compose.db.yml down postgres-dev`. Check `pnpm db:status` afterward. `docker compose down` is a project command, and the extra service name is not a documented filter, so confirm which containers from that file are still up.

Open a shell in the dev database:

```bash
docker compose -f docker-compose.db.yml exec postgres-dev psql -U myuser -d adpa
```

## Commands that are not the local reset

| Command | Database it uses | Resets `public`? |
| --- | --- | --- |
| `pnpm db:migrate:local` | Hardcoded `localhost:5432/adpa` | Yes |
| `pnpm migrate` | `DATABASE_URL` already in the environment | No |
| `pnpm migrate:reset` and `pnpm migrate:dev` | `DATABASE_URL` already in the environment | Yes (`migrate:dev` also runs `server/src/database/seed-all.ts`) |

`pnpm migrate:dev` does not switch to the Docker URL. If the shell or `server/.env` still points at a cloud database, that reset runs there.

## Contract and feature tests

`pnpm test:contracts` runs `server/scripts/run-test-contracts-db.mjs`:

1. `docker compose -f docker-compose.db.yml up -d postgres-test`
2. Poll `pg_isready` inside `postgres-test` for up to 30 seconds
3. `tsx scripts/run-migrations.ts --reset` against port 5433
4. Spawn Jest in `server/` with `DATABASE_URL`, `DB_HOST`, `DB_PORT=5433`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `NODE_ENV=test`, and `ADPA_SKIP_TEST_DB_BOOTSTRAP=0`
5. In `finally`, and on `SIGINT`, `SIGTERM`, or an uncaught exception, run `docker compose -f docker-compose.db.yml down -v postgres-test`

`pnpm test:contracts:features` is the same runner with a first argument of `features`. The runner then executes `server/scripts/run-governed-features.mjs` instead of Jest. Extra arguments after `features` are forwarded.

From `server/`:

```bash
npm run test:contracts
npm run test:contracts:features
```

`server/tests/setup/global-setup.js` loads `server/.env.test` and does not start a container. The runner is what starts Postgres. Dotenv does not override variables the runner already set, and a `DATABASE_URL` containing `5433` selects the local test defaults (`localhost`, `test_user`, `test_pass`).

The design spec (`docs/superpowers/specs/2026-09-14-local-postgres-docker-databases-design.md`) says the runner should probe ports and print a port-in-use message. The script does not. A busy port surfaces as a failed `docker compose up`.

## Pitfalls

**Port 5432 is shared with the full stack file.** `docker-compose.yml` publishes service `postgres` as container `adpa-postgres_db` on host port 5432, with volume `postgres_data`. `pnpm db:up` publishes `adpa-postgres-dev` on the same port, with volume `adpa_postgres_dev_data`. The user, password, and database name match (`myuser` / `mypassword` / `adpa`), so a client can connect to the wrong volume and look healthy. Run one of these, not both. `docker compose up -d` with no `-f` uses `docker-compose.yml`.

**Port 5433 is shared with the older test compose file.** `server/docker-compose.test.yml` publishes `adpa-test-db` (`postgres:15-alpine`) on 5433. The contract runner publishes `adpa-postgres-test` (`pgvector/pgvector:pg17`) on 5433. Stop the other container before `pnpm test:contracts`.

**Contract teardown uses `down -v`.** `-v` removes named volumes declared in the compose file. That file declares both `adpa_postgres_dev_data` and `adpa_postgres_test_data`. The teardown command also appends `postgres-test`, which `docker compose down` does not document as a service limit. After a contract run, confirm the dev database is still there:

```bash
pnpm db:status
docker volume ls | grep adpa_postgres
```

If `adpa-postgres-dev` stopped or `adpa_postgres_dev_data` is gone, start it again with `pnpm db:up` and migrate again. Treat `pnpm db:migrate:local` as a destructive reset.

**The dev compose file does not start Redis.** A Redis connection error during API boot is the optional-dependency path. A Postgres connection error is not. `pnpm db:status` should show `adpa-postgres-dev` healthy before debugging the API.

**Full-stack compose is a different frontend port.** `docker-compose.yml` publishes the frontend on host port 3005 and the API on 5000. There is no pgAdmin service and no `docker-compose.dev.yml` in this tree. Host `pnpm dev` remains the port 3000 workflow and still needs `postgres-dev` (or another database) reachable at `DATABASE_URL`.

## Files

- `docker-compose.db.yml` — dev and contract Postgres
- `docker-compose.yml` — optional full stack; collides on port 5432
- `server/docker-compose.test.yml` — older test Postgres; collides on port 5433
- `server/scripts/migrate-local-dev.mjs` — reset and migrate localhost:5432
- `server/scripts/run-test-contracts-db.mjs` — contract database lifecycle
- `server/scripts/run-migrations.ts` — `--reset` drops `public`
- `docs/superpowers/specs/2026-09-14-local-postgres-docker-databases-design.md` — design record
- `AGENTS.md` — short command list for cloud agents
