import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { Pool } from 'pg';
import path from 'path';

async function verifyHarness() {
  console.log('🔍 Verifying Test Harness Architecture...');
  const serverDir = path.resolve(__dirname, '..');
  const adminDbUrl = 'postgresql://test_user:test_pass@127.0.0.1:5433/postgres';

  try {
    // 1. Ensure Docker Compose services are up
    console.log('🐳 Checking Docker containers...');
    execSync('docker-compose -f docker-compose.test.yml up -d', {
      cwd: serverDir,
      stdio: 'ignore'
    });

    const dockerStatus = execSync('docker-compose -f docker-compose.test.yml ps --format json', {
      cwd: serverDir,
      encoding: 'utf8'
    });

    if (!dockerStatus.includes('adpa-test-db') && !dockerStatus.includes('postgres-test')) {
      console.error('❌ postgres test container not found after startup.');
      process.exit(1);
    }
    console.log('✅ Docker containers are defined');

    // 2. Check Database Connectivity
    console.log('🔌 Checking admin database connection...');
    let pool;
    let connected = false;
    let lastError;

    for (let attempt = 1; attempt <= 5; attempt++) {
      pool = new Pool({
        connectionString: adminDbUrl,
        connectionTimeoutMillis: 2000
      });

      try {
        await pool.query('SELECT NOW()');
        connected = true;
        break;
      } catch (error) {
        lastError = error;
        await pool.end().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!connected || !pool) {
      throw lastError ?? new Error('Unable to connect to Postgres');
    }

    console.log('✅ Postgres is reachable at', adminDbUrl);

    // 3. Check required harness files
    console.log('📁 Checking harness files...');
    const requiredFiles = [
      'docker-compose.test.yml',
      'tests/setup/global-setup.js',
      'tests/setup/global-teardown.js',
      'tests/setup/integration-setup.js',
      'tests/doubles/MockAIProvider.ts',
      'tests/doubles/MockQueue.ts',
      'tests/factories/data-factory.ts',
      'migrations/000_baseline.sql'
    ];

    for (const relativePath of requiredFiles) {
      const absolutePath = path.join(serverDir, relativePath);
      if (!existsSync(absolutePath)) {
        console.error(`❌ Required harness file missing: ${relativePath}`);
        process.exit(1);
      }
    }
    console.log(`✅ ${requiredFiles.length} required harness files are present`);

    // 4. Report template database readiness if global setup has already been run
    const templateDbRes = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_database WHERE datname = 'test_template'
      ) AS exists
    `);
    console.log(`✅ test_template present: ${templateDbRes.rows[0].exists}`);

    await pool.end();
    console.log('\n✨ Test Harness looks solid! 🚀');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Verification failed:', errorMessage);
    process.exit(1);
  }
}

verifyHarness();
