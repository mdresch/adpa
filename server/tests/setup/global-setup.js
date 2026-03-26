const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const Redis = require('ioredis');

module.exports = async () => {
  const serverDir = path.resolve(__dirname, '../../');
  const adminDbUrl = 'postgresql://test_user:test_pass@127.0.0.1:5433/postgres';
  const templateDbName = 'test_template';

  // Ensure Docker containers are up
  execSync('docker-compose -f docker-compose.test.yml up -d', { cwd: serverDir });

  // Wait for Postgres to be ready
  let retries = 30;
  while (retries > 0) {
    try {
      execSync('docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test_user -d postgres', { cwd: serverDir, stdio: 'ignore' });
      break;
    } catch (e) {
      retries--;
      if (retries === 0) {
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Check Redis (optional fail-fast)
  const redis = new Redis({ host: '127.0.0.1', port: 6379, connectTimeout: 1000, retryStrategy: () => null });
  try { 
    await redis.ping(); 
  } finally { 
    redis.disconnect(); 
  }

  // Helper for resilient connection
  async function connectWithFallbacks(customDbName = 'postgres') {
    const hosts = ['127.0.0.1', 'localhost'];
    let lastErr;
    
    // Outer retry loop for the entire connection process
    for (let attempt = 1; attempt <= 10; attempt++) {
      for (const host of hosts) {
        const url = `postgresql://test_user:test_pass@${host}:5433/${customDbName}`;
        const pool = new Pool({ 
          connectionString: url, 
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 1000
        });
        
        try {
          // Inner retry for the actual connect call
          const client = await pool.connect();
          client.release();
          return pool;
        } catch (err) {
          lastErr = err;
          await pool.end().catch(() => {});
        }
      }
      // Wait before next set of host attempts
      await new Promise(r => setTimeout(r, 2000));
    }
    throw lastErr;
  }

  // Initialize Template Database
  let adminPool;
  try {
    adminPool = await connectWithFallbacks();
    
    // Force disconnect users from template if it exists
    await adminPool.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid();
    `, [templateDbName]).catch(() => {});

    await adminPool.query(`DROP DATABASE IF EXISTS ${templateDbName}`);
    await adminPool.query(`CREATE DATABASE ${templateDbName}`);
  } finally {
    if (adminPool) await adminPool.end();
  }

  const schemaDevFile = path.join(serverDir, 'schema-dev.sql');
  const templateDbUrl = `postgresql://test_user:test_pass@127.0.0.1:5433/${templateDbName}`;

  // Build the template database from the authoritative migration chain.
  execSync('npx tsx scripts/run-migrations.ts --reset', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: templateDbUrl },
    stdio: 'inherit'
  });

  // Optionally import the development data snapshot. This dump is data-oriented and
  // uses psql-specific COPY blocks, so it must be piped through psql rather than pg.
  if (fs.existsSync(schemaDevFile)) {
    const sanitizedSnapshot = fs.readFileSync(schemaDevFile, 'utf8')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('\\') && !trimmed.startsWith('SET transaction_timeout');
      })
      .join('\n');

    execSync(`docker exec -i adpa-test-db psql -v ON_ERROR_STOP=1 -U test_user -d ${templateDbName}`, {
      cwd: serverDir,
      input: sanitizedSnapshot,
      stdio: ['pipe', 'inherit', 'inherit'],
      maxBuffer: 50 * 1024 * 1024
    });

    console.log('[GLOBAL-SETUP] Imported schema-dev.sql data snapshot into template database');
  }

  // Apply minimal seed data (companies, ai_providers)
  let seedPool;
  try {
    seedPool = await connectWithFallbacks(templateDbName);
    const seedFile = path.join(serverDir, 'data-seed.sql');
    if (fs.existsSync(seedFile)) {
      const seedSql = fs.readFileSync(seedFile, 'utf8');
      await seedPool.query(seedSql);
      console.log('[GLOBAL-SETUP] Seed data applied');
    }
  } catch (err) {
    console.warn('[GLOBAL-SETUP] Seed data apply failed (continuing):', err.message);
  } finally {
    if (seedPool) await seedPool.end();
  }

  // Seed test users for authentication tests
  const seedUsersScript = path.join(serverDir, 'scripts/seed-test-users.js');
  if (fs.existsSync(seedUsersScript)) {
    try {
      execSync(`node ${seedUsersScript}`, {
        cwd: serverDir,
        env: { ...process.env, DATABASE_URL: templateDbUrl },
        stdio: 'ignore'
      });
      console.log('[GLOBAL-SETUP] Test users seeded');
    } catch (err) {
      console.warn('[GLOBAL-SETUP] Test users seeding failed (continuing):', err.message);
    }
  }

  // Small delay for port binding to stabilize on Windows
  await new Promise(r => setTimeout(r, 1000));

  console.log('[GLOBAL-SETUP] Done.');
};
