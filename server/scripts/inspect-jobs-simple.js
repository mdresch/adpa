const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE; // try common vars
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}

(async () => {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, status, queue_name, worker_id, processing_started_at, started_at, data
      FROM jobs
      WHERE status IN ('pending','processing')
      ORDER BY processing_started_at NULLS LAST, started_at DESC
      LIMIT 200
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
