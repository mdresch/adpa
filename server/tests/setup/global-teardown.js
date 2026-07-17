const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

module.exports = async () => {
  const serverDir = path.resolve(__dirname, '../../');

  // Same Azure test DB convention as global-setup.js -- loaded from .env.test,
  // not the main .env.
  dotenv.config({ path: path.join(serverDir, '.env.test') });

  const dbHost = process.env.AZURE_TEST_DB_HOST;
  const dbPort = process.env.AZURE_TEST_DB_PORT || '5432';
  const dbUser = process.env.AZURE_TEST_DB_USER;
  const dbPassword = process.env.AZURE_TEST_DB_PASSWORD;
  const templateDbName = 'test_template';

  console.log('[GLOBAL-TEARDOWN] Cleaning up...');

  if (dbHost && dbUser && dbPassword) {
    const adminDbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres?sslmode=require`;
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
