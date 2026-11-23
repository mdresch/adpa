# ADPA databases for local development

The Next.js app and the Express API run on the host. PostgreSQL for that loop comes from `docker-compose.db.yml`, not from a development compose override.

`docker-compose.dev.yml` is not in this repository. `validate-docker.bat` and `validate-docker.sh` are not either. The operational steps, connection strings, and port collisions are in [DOCKER_DEVELOPMENT_GUIDE.md](./DOCKER_DEVELOPMENT_GUIDE.md).

## Quick start

```bash
pnpm db:up
pnpm db:migrate:local
pnpm db:status
```

`pnpm db:migrate:local` drops the local `public` schema and reapplies `server/migrations`. Set `DATABASE_URL` in `server/.env` to:

```text
postgresql://myuser:mypassword@localhost:5432/adpa
```

Then start the API with `cd server && npm run dev` and the frontend with `pnpm dev` (port 3000).

Contract tests bring up a separate database on port 5433 and tear it down when they finish:

```bash
pnpm test:contracts
pnpm test:contracts:features
```

Read the development guide before running those commands. Teardown uses `docker compose down -v` against the same compose file that holds the dev volume.

## Compose files that do exist

| File | Role |
| --- | --- |
| `docker-compose.db.yml` | `postgres-dev` on port 5432 and `postgres-test` on port 5433 |
| `docker-compose.yml` | Optional full stack. Its `postgres` service also binds host port 5432 |
| `server/docker-compose.test.yml` | Older test database. It also binds host port 5433 |

Do not start `docker-compose.yml` while `pnpm db:up` is running. Both want port 5432, with the same user and database name and different volumes.
