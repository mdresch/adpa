# Local Postgres Docker Databases (Dev & Jest Contracts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide two isolated, lightweight local PostgreSQL Docker containers using `pgvector/pgvector:pg17`: one for local application development (port 5432) and one for Jest contract/integration tests (port 5433) with automated on-demand lifecycle and guaranteed container teardown.

**Architecture:** A dedicated `docker-compose.db.yml` defines `postgres-dev` (port 5432, persistent volume) and `postgres-test` (port 5433, disposable volume). A Node.js runner script (`server/scripts/run-test-contracts-db.mjs`) manages the complete test DB lifecycle: spinning up `postgres-test`, polling `pg_isready`, running migrations against port 5433, executing Jest tests, and guaranteeing container down + volume wipe in a `finally` block and signal trap.

**Tech Stack:** Docker, Docker Compose, PostgreSQL 17 (`pgvector/pgvector:pg17`), Node.js, Jest, TypeScript.

---

### Task 1: Create Dedicated `docker-compose.db.yml`

**Files:**
- Create: `docker-compose.db.yml`

- [ ] **Step 1: Write `docker-compose.db.yml`**

Create `docker-compose.db.yml` at the project root:

```yaml
version: '3.8'

services:
  postgres-dev:
    image: pgvector/pgvector:pg17
    container_name: adpa-postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: adpa
    ports:
      - "5432:5432"
    volumes:
      - adpa_postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d adpa"]
      interval: 3s
      timeout: 3s
      retries: 10

  postgres-test:
    image: pgvector/pgvector:pg17
    container_name: adpa-postgres-test
    restart: "no"
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
      POSTGRES_DB: adpa_test_db
    ports:
      - "5433:5432"
    volumes:
      - adpa_postgres_test_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d adpa_test_db"]
      interval: 2s
      timeout: 3s
      retries: 10

volumes:
  adpa_postgres_dev_data:
  adpa_postgres_test_data:
```

- [ ] **Step 2: Validate docker compose configuration**

Run: `docker compose -f docker-compose.db.yml config`
Expected: Valid compose config with services `postgres-dev` and `postgres-test` printed.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.db.yml
git commit -m "feat(docker): add lightweight docker-compose.db.yml for dev and test postgres instances"
```

---

### Task 2: Create Test Database Contracts Runner Script with Guaranteed Teardown

**Files:**
- Create: `server/scripts/run-test-contracts-db.mjs`

- [ ] **Step 1: Write `server/scripts/run-test-contracts-db.mjs`**

Create `server/scripts/run-test-contracts-db.mjs` with:
- `up -d postgres-test` invocation
- `pg_isready` polling loop with timeout
- Running migrations against `postgresql://test_user:test_pass@localhost:5433/adpa_test_db`
- Spawning Jest test process forwarding CLI arguments
- Signal trapping (`SIGINT`, `SIGTERM`, `uncaughtException`)
- `finally` block executing `docker compose -f docker-compose.db.yml down -v postgres-test`

```javascript
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(serverDir, '..');
const composeFile = path.join(rootDir, 'docker-compose.db.yml');

const TEST_DB_URL = 'postgresql://test_user:test_pass@localhost:5433/adpa_test_db';

let isTearingDown = false;

function teardownContainer() {
  if (isTearingDown) return;
  isTearingDown = true;
  console.log('\n[TEST-RUNNER] Tearing down postgres-test container and removing volumes...');
  try {
    execSync(`docker compose -f "${composeFile}" down -v postgres-test`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
    console.log('[TEST-RUNNER] Teardown complete.');
  } catch (err) {
    console.error('[TEST-RUNNER] Teardown warning:', err.message);
  }
}

// Ensure teardown on unexpected signals
process.on('SIGINT', () => {
  console.log('\n[TEST-RUNNER] Received SIGINT.');
  teardownContainer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n[TEST-RUNNER] Received SIGTERM.');
  teardownContainer();
  process.exit(143);
});

process.on('uncaughtException', (err) => {
  console.error('[TEST-RUNNER] Uncaught exception:', err);
  teardownContainer();
  process.exit(1);
});

async function waitForDbReady(maxAttempts = 30, intervalMs = 1000) {
  console.log('[TEST-RUNNER] Waiting for postgres-test (port 5433) to accept connections...');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync(`docker compose -f "${composeFile}" exec -T postgres-test pg_isready -U test_user -d adpa_test_db`, {
        cwd: rootDir,
        stdio: 'ignore'
      });
      console.log(`[TEST-RUNNER] Database ready after ${attempt} attempt(s).`);
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  throw new Error('[TEST-RUNNER] Database readiness check timed out.');
}

async function run() {
  const args = process.argv.slice(2);
  let exitCode = 0;

  try {
    console.log('[TEST-RUNNER] Starting postgres-test container...');
    execSync(`docker compose -f "${composeFile}" up -d postgres-test`, {
      cwd: rootDir,
      stdio: 'inherit'
    });

    await waitForDbReady();

    console.log('[TEST-RUNNER] Applying schema migrations to adpa_test_db...');
    execSync('npx tsx scripts/run-migrations.ts --reset', {
      cwd: serverDir,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
        NODE_ENV: 'test'
      },
      stdio: 'inherit'
    });
    console.log('[TEST-RUNNER] Migrations applied successfully.');

    // Determine Jest command: if 'features' is passed, run run-governed-features.mjs
    const isFeatures = args[0] === 'features';
    const testCommand = isFeatures ? 'node' : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const testArgs = isFeatures
      ? ['scripts/run-governed-features.mjs', ...args.slice(1)]
      : ['jest', ...args];

    console.log(`[TEST-RUNNER] Running test command: ${testCommand} ${testArgs.join(' ')}`);

    exitCode = await new Promise((resolve) => {
      const child = spawn(testCommand, testArgs, {
        cwd: serverDir,
        env: {
          ...process.env,
          DATABASE_URL: TEST_DB_URL,
          DB_HOST: 'localhost',
          DB_PORT: '5433',
          DB_USER: 'test_user',
          DB_PASSWORD: 'test_pass',
          DB_NAME: 'adpa_test_db',
          NODE_ENV: 'test',
          ADPA_SKIP_TEST_DB_BOOTSTRAP: '0'
        },
        stdio: 'inherit'
      });

      child.on('close', (code) => {
        resolve(code ?? 0);
      });

      child.on('error', (err) => {
        console.error('[TEST-RUNNER] Test process error:', err);
        resolve(1);
      });
    });

  } catch (error) {
    console.error('[TEST-RUNNER] Execution error:', error.message);
    exitCode = 1;
  } finally {
    teardownContainer();
  }

  process.exit(exitCode);
}

run();
```

- [ ] **Step 2: Commit**

```bash
git add server/scripts/run-test-contracts-db.mjs
git commit -m "feat(test): create run-test-contracts-db script with automated lifecycle and teardown"
```

---

### Task 3: Update Test Environment and Database Connection Fallbacks

**Files:**
- Modify: `server/.env.test`
- Modify: `server/tests/setup/global-setup.js:16-27`
- Modify: `server/tests/setup/global-teardown.js:12-21`

- [ ] **Step 1: Update `server/.env.test` with local test DB defaults**

Update `server/.env.test` to document local docker test DB alongside Azure test DB:
```ini
# --- Local Docker Postgres Test DB (port 5433) ---
LOCAL_TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5433/adpa_test_db
LOCAL_TEST_DB_HOST=localhost
LOCAL_TEST_DB_PORT=5433
LOCAL_TEST_DB_USER=test_user
LOCAL_TEST_DB_PASSWORD=test_pass
LOCAL_TEST_DB_NAME=adpa_test_db
```

- [ ] **Step 2: Update `server/tests/setup/global-setup.js` for local container support**

Allow `global-setup.js` to fallback gracefully to `localhost:5433` if `AZURE_TEST_DB_HOST` is not set or when pointed to local docker, avoiding hard failures when running offline.

- [ ] **Step 3: Commit**

```bash
git add server/.env.test server/tests/setup/global-setup.js server/tests/setup/global-teardown.js
git commit -m "feat(test): add local test db fallback support in global-setup and global-teardown"
```

---

### Task 4: Add NPM Scripts to Root and Server `package.json`

**Files:**
- Modify: `package.json`
- Modify: `server/package.json`

- [ ] **Step 1: Add scripts to root `package.json`**

```json
"db:up": "docker compose -f docker-compose.db.yml up -d postgres-dev",
"db:down": "docker compose -f docker-compose.db.yml down postgres-dev",
"db:status": "docker compose -f docker-compose.db.yml ps",
"db:migrate:local": "tsx server/scripts/run-migrations.ts --reset",
"test:contracts": "node server/scripts/run-test-contracts-db.mjs",
"test:contracts:features": "node server/scripts/run-test-contracts-db.mjs features"
```

- [ ] **Step 2: Add scripts to `server/package.json`**

```json
"db:up": "docker compose -f ../docker-compose.db.yml up -d postgres-dev",
"db:down": "docker compose -f ../docker-compose.db.yml down postgres-dev",
"db:status": "docker compose -f ../docker-compose.db.yml ps",
"test:contracts": "node scripts/run-test-contracts-db.mjs",
"test:contracts:features": "node scripts/run-test-contracts-db.mjs features"
```

- [ ] **Step 3: Commit**

```bash
git add package.json server/package.json
git commit -m "feat(scripts): add npm scripts for local postgres dev and jest contract tests"
```

---

### Task 5: Verification

- [ ] **Step 1: Verify `docker-compose.db.yml` syntax**
Run: `docker compose -f docker-compose.db.yml config`

- [ ] **Step 2: Test `postgres-dev` spin-up and migration**
Run: `npm run db:up`
Verify container is up: `docker compose -f docker-compose.db.yml ps`
Verify connection: `docker compose -f docker-compose.db.yml exec -T postgres-dev pg_isready -U myuser -d adpa`

- [ ] **Step 3: Test `test:contracts` execution and teardown**
Run: `npm run test:contracts -- server/src/__tests__/modules/infrastructure/dbGuardContract.test.ts`
Verify:
1. `adpa-postgres-test` container starts.
2. Migrations apply successfully.
3. Tests run and pass.
4. Container is stopped and removed (`docker ps -a` confirms `adpa-postgres-test` does not remain).

- [ ] **Step 4: Clean up dev container if desired**
Run: `npm run db:down`
Verify: `docker ps` shows dev container stopped.

