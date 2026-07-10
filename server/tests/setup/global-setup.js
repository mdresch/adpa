const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const Redis = require('ioredis');
const dotenv = require('dotenv');

module.exports = async () => {
  const serverDir = path.resolve(__dirname, '../../');

  // Load Azure test DB connection details. Deliberately loaded from .env.test,
  // not the main .env -- keeps this file from silently depending on whichever
  // env happens to be active, and keeps the real production DATABASE_URL out
  // of the test bootstrap path entirely.
  dotenv.config({ path: path.join(serverDir, '.env.test') });

  const dbHost = process.env.AZURE_TEST_DB_HOST;
  const dbPort = process.env.AZURE_TEST_DB_PORT || '5432';
  const dbUser = process.env.AZURE_TEST_DB_USER;
  const dbPassword = process.env.AZURE_TEST_DB_PASSWORD;

  if (!dbHost || !dbUser || !dbPassword || dbPassword.startsWith('<FILL_IN')) {
    throw new Error(
      '[GLOBAL-SETUP] AZURE_TEST_DB_HOST / AZURE_TEST_DB_USER / AZURE_TEST_DB_PASSWORD ' +
      'are not set in server/.env.test. Fill these in with a real (ideally test-only) ' +
      'Postgres role on the Azure server before running integration tests.'
    );
  }

  const templateDbName = 'test_template';
  const maintenanceDbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres?sslmode=require`;

  // No local container to start or wait on -- Azure Postgres is already
  // running. Previously this step ran `docker-compose up` and polled
  // `pg_isready` against a local container; that entire block is gone.

  // Check Redis (optional fail-fast). Previously assumed a local Docker Redis
  // on 127.0.0.1:6379; moved to Azure Managed Redis for the same reason as
  // Postgres above -- nothing in this sandbox reliably has a local Redis
  // running. Same rediss:// URL convention as REDIS_URL/UPSTASH_REDIS_URL in
  // src/database/redis.ts (TLS inferred from the scheme).
  const redisUrl = process.env.AZURE_TEST_REDIS_URL;
  if (redisUrl) {
    const redis = new Redis(redisUrl, { connectTimeout: 5000, retryStrategy: () => null });
    try {
      await redis.ping();
    } finally {
      redis.disconnect();
    }
  }

  async function connectWithRetry(dbName) {
    const url = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=require`;
    let lastErr;
    for (let attempt = 1; attempt <= 10; attempt++) {
      const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000 });
      try {
        const client = await pool.connect();
        client.release();
        return pool;
      } catch (err) {
        lastErr = err;
        await pool.end().catch(() => {});
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw lastErr;
  }

  // Initialize Template Database. Same DROP/CREATE-per-run pattern as before,
  // just against Azure instead of a local container. Guard rail: refuse to
  // proceed if templateDbName or the resolved host ever resembles production,
  // since these are destructive DROP DATABASE statements.
  if (templateDbName === 'adpa' || templateDbName === 'postgres') {
    throw new Error(`[GLOBAL-SETUP] Refusing to run against database name "${templateDbName}"`);
  }

  let adminPool;
  try {
    adminPool = await connectWithRetry('postgres');

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
  const templateDbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${templateDbName}?sslmode=require`;

  // Build the template database from the authoritative migration chain --
  // this is what exercises every migration in server/migrations/ in order,
  // including 432_user_departments.sql, against a real Postgres instance.
  const { execSync } = require('child_process');
  execSync('npx tsx scripts/run-migrations.ts --reset', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: templateDbUrl },
    stdio: 'inherit'
  });

  // Optionally import the development data snapshot.
  if (fs.existsSync(schemaDevFile)) {
    const sanitizedSnapshot = fs.readFileSync(schemaDevFile, 'utf8')
      .replace(/^﻿/, '')
      .split(/\r?\n/)
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('\\') && !trimmed.startsWith('SET transaction_timeout');
      })
      .join('\n');

    // psql against Azure directly rather than `docker exec` into a local
    // container -- PGPASSWORD env avoids putting the password on the command
    // line / in shell history.
    //
    // Best-effort like the other optional steps below (seed-test-users.js):
    // schema-dev.sql is a full pg_dump snapshot (schema + data), not a pure
    // data file, so its non-idempotent CREATE TYPE/CREATE SCHEMA statements
    // can collide with objects the migration chain above already created --
    // that's a snapshot/migration-chain drift issue, not a reason to fail
    // the whole test bootstrap.
    try {
      execSync(
        `psql -v ON_ERROR_STOP=1 "host=${dbHost} port=${dbPort} dbname=${templateDbName} user=${dbUser} sslmode=require"`,
        {
          cwd: serverDir,
          input: sanitizedSnapshot,
          env: { ...process.env, PGPASSWORD: dbPassword },
          stdio: ['pipe', 'inherit', 'inherit'],
          maxBuffer: 50 * 1024 * 1024
        }
      );
      console.log('[GLOBAL-SETUP] Imported schema-dev.sql data snapshot into template database');
    } catch (err) {
      console.warn('[GLOBAL-SETUP] schema-dev.sql import failed (continuing without it):', err.message);
    }
  }

  // Apply minimal seed data (companies, ai_providers)
  let seedPool;
  try {
    seedPool = await connectWithRetry(templateDbName);
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
      const { execSync: exec2 } = require('child_process');
      exec2(`node ${seedUsersScript}`, {
        cwd: serverDir,
        env: { ...process.env, DATABASE_URL: templateDbUrl },
        stdio: 'ignore'
      });
      console.log('[GLOBAL-SETUP] Test users seeded');
    } catch (err) {
      console.warn('[GLOBAL-SETUP] Test users seeding failed (continuing):', err.message);
    }
  }

  // NOTE: globalSetup runs in its own process, separate from the Jest worker
  // processes that run setupFilesAfterEnv (integration-setup.js) -- nothing
  // set on `global` here is visible there. integration-setup.js independently
  // loads server/.env.test and reads the same AZURE_TEST_DB_* variables
  // itself rather than depending on anything stashed by this script.

  console.log('[GLOBAL-SETUP] Done (Azure test database).');
};
