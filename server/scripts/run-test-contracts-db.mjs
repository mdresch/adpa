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
  console.log('\n[TEST-RUNNER] Tearing down postgres-test container and wiping test volume...');
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
  console.log('\n[TEST-RUNNER] Received SIGINT (Ctrl+C).');
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
  throw new Error('[TEST-RUNNER] Database readiness check timed out after 30 seconds.');
}

async function run() {
  const args = process.argv.slice(2);
  let exitCode = 0;

  try {
    console.log('[TEST-RUNNER] Starting postgres-test container on port 5433...');
    execSync(`docker compose -f "${composeFile}" up -d postgres-test`, {
      cwd: rootDir,
      stdio: 'inherit'
    });

    await waitForDbReady();

    console.log('[TEST-RUNNER] Applying schema migrations to adpa_test_db on localhost:5433...');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    execSync(`"${npxCmd}" tsx scripts/run-migrations.ts --reset`, {
      cwd: serverDir,
      env: {
        ...process.env,
        DATABASE_URL: TEST_DB_URL,
        NODE_ENV: 'test'
      },
      stdio: 'inherit'
    });
    console.log('[TEST-RUNNER] Migrations applied successfully.');

    // Determine command:
    // If first argument is 'features', run run-governed-features.mjs
    const isFeatures = args[0] === 'features';
    let testCommand;
    let testArgs;

    if (isFeatures) {
      testCommand = process.execPath; // node executable
      testArgs = [path.join(serverDir, 'scripts', 'run-governed-features.mjs'), ...args.slice(1)];
    } else {
      testCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      testArgs = ['jest', ...args];
    }

    console.log(`[TEST-RUNNER] Executing tests: ${testCommand} ${testArgs.join(' ')}`);

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
