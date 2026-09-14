const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

module.exports = async () => {
  const serverDir = path.resolve(__dirname, '../../');

  // Same Azure test DB convention as global-setup.js -- loaded from .env.test,
  // not the main .env.
  dotenv.config({ path: path.join(serverDir, '.env.test') });

  const useLocal = process.env.USE_LOCAL_TEST_DB === 'true' || 
                   process.env.DATABASE_URL?.includes('5433') || 
                   (!process.env.AZURE_TEST_DB_HOST && (process.env.LOCAL_TEST_DB_HOST || process.env.DB_PORT === '5433'));

  const dbHost = useLocal ? (process.env.LOCAL_TEST_DB_HOST || 'localhost') : process.env.AZURE_TEST_DB_HOST;
  const dbPort = useLocal ? (process.env.LOCAL_TEST_DB_PORT || '5433') : (process.env.AZURE_TEST_DB_PORT || '5432');
  const dbUser = useLocal ? (process.env.LOCAL_TEST_DB_USER || 'test_user') : process.env.AZURE_TEST_DB_USER;
  const dbPassword = useLocal ? (process.env.LOCAL_TEST_DB_PASSWORD || 'test_pass') : process.env.AZURE_TEST_DB_PASSWORD;
  const templateDbName = 'test_template';

  console.log('[GLOBAL-TEARDOWN] Cleaning up...');

  if (dbHost && dbUser && dbPassword) {
    const isLocal = dbHost === 'localhost' || dbHost === '127.0.0.1' || dbPort === '5433';
    const sslParam = isLocal ? '' : '?sslmode=require';
    const adminDbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres${sslParam}`;
    const adminPool = new Pool({ connectionString: adminDbUrl });
    try {
      const res = await adminPool.query("SELECT datname FROM pg_database WHERE datname LIKE 'test_db_worker_%'");
      for (const row of res.rows) {
        await adminPool.query(`DROP DATABASE IF EXISTS ${row.datname}`);
      }
      await adminPool.query(`DROP DATABASE IF EXISTS ${templateDbName}`);
    } catch (err) { /* ignore */ } finally {
      await adminPool.end();
    }
  }

  // No local Docker Postgres container to tear down -- Azure Postgres is
  // persistent infrastructure, not a per-run container (see global-setup.js).
  console.log('[GLOBAL-TEARDOWN] Done.');
};
