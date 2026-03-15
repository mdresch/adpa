const { execSync } = require('child_process');
const path = require('path');
const { Pool } = require('pg');

module.exports = async () => {
  const serverDir = path.resolve(__dirname, '../../');
  const adminDbUrl = 'postgresql://test_user:test_pass@localhost:5433/postgres';
  const templateDbName = 'test_template';

  console.log('[GLOBAL-TEARDOWN] Cleaning up...');
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

  execSync('docker-compose -f docker-compose.test.yml down', { cwd: serverDir, stdio: 'ignore' });
  console.log('[GLOBAL-TEARDOWN] Done.');
};
