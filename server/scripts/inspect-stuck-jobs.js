const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}

const thresholdMinutes = parseInt(process.env.STUCK_JOB_THRESHOLD_MINUTES || '60', 10);

(async () => {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const sql = `
      SELECT id, status, queue_name, worker_id, processing_started_at, started_at, data,
        EXTRACT(EPOCH FROM (NOW() - processing_started_at))/60 as minutes_running
      FROM jobs
      WHERE status = 'processing'
        AND processing_started_at IS NOT NULL
        AND processing_started_at < NOW() - ($1 * INTERVAL '1 minute')
      ORDER BY processing_started_at ASC
      LIMIT 500
    `;
    const res = await client.query(sql, [thresholdMinutes]);
    const rows = res.rows.map(r => ({
      id: r.id,
      status: r.status,
      queue_name: r.queue_name,
      worker_id: r.worker_id,
      processing_started_at: r.processing_started_at,
      minutes_running: Number(r.minutes_running).toFixed(1),
      data_preview: (() => {
        try { return JSON.stringify(r.data && typeof r.data === 'object' ? r.data : JSON.parse(r.data)).slice(0, 400); } catch { return String(r.data).slice(0,400); }
      })()
    }));
    console.log(JSON.stringify({ thresholdMinutes, count: rows.length, jobs: rows }, null, 2));
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
