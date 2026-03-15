import { execSync } from 'child_process';
import { Pool } from 'pg';
import path from 'path';

async function verifyHarness() {
  console.log('🔍 Verifying Test Harness Architecture...');
  const serverDir = path.resolve(__dirname, '..');
  const testDbUrl = 'postgresql://test_user:test_pass@localhost:5433/test_db';

  try {
    // 1. Check Docker Compose
    console.log('🐳 Checking Docker containers...');
    const dockerStatus = execSync('docker-compose -f docker-compose.test.yml ps --format json', { 
      cwd: serverDir,
      encoding: 'utf8'
    });
    
    if (!dockerStatus.includes('postgres-test')) {
      console.error('❌ postgres-test container not found. run "pnpm test:integration" to start it.');
      process.exit(1);
    }
    console.log('✅ Docker containers are defined');

    // 2. Check Database Connection
    console.log('🔌 Checking test database connection...');
    const pool = new Pool({ 
      connectionString: testDbUrl,
      connectionTimeoutMillis: 2000
    });
    
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Test database is reachable at', testDbUrl);

    // 3. Check Migrations
    console.log('📋 Checking migrations...');
    const migrationsRes = await pool.query('SELECT COUNT(*) FROM src_schema_migrations');
    console.log(`✅ ${migrationsRes.rows[0].count} migrations applied to test database`);

    // 4. Check Health Checks table
    const hcRes = await pool.query("SELECT to_regclass('public.health_checks')");
    if (hcRes.rows[0].to_regclass) {
      console.log('✅ health_checks table exists');
    } else {
      console.error('❌ health_checks table missing');
      process.exit(1);
    }

    await pool.end();
    console.log('\n✨ Test Harness looks solid! 🚀');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Verification failed:', errorMessage);
    process.exit(1);
  }
}

verifyHarness();
