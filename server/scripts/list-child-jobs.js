const { Client } = require('pg');

const parentId = process.argv[2];
if (!parentId) {
  console.error('Usage: node list-child-jobs.js <parentJobId>');
  process.exit(2);
}

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}

(async () => {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query(
      `SELECT id, status, queue_name, worker_id, processing_started_at, started_at, data
       FROM jobs
       WHERE (data->>'parentJobId') = $1 OR (data->>'sourceJobId') = $1 OR (data->>'source_job_id') = $1
       ORDER BY started_at DESC`,
      [parentId]
    );
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
