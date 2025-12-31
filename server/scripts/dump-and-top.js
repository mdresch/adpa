const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}

const topN = parseInt(process.env.TOP_N || '10', 10);
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(__dirname, '..', 'tmp');
const outFile = path.join(outDir, `jobs-dump-${ts}.json`);

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();

    const allSql = `
      SELECT id, status, queue_name, worker_id, processing_started_at, started_at, data
      FROM jobs
      WHERE status IN ('pending','processing')
      ORDER BY processing_started_at NULLS LAST, started_at DESC
      LIMIT 2000
    `;
    const allRes = await client.query(allSql);
    fs.writeFileSync(outFile, JSON.stringify(allRes.rows, null, 2));

    const topSql = `
      SELECT id, status, queue_name, worker_id, processing_started_at, started_at,
        EXTRACT(EPOCH FROM (NOW() - processing_started_at))/60 as minutes_running
      FROM jobs
      WHERE status = 'processing' AND processing_started_at IS NOT NULL
      ORDER BY minutes_running DESC NULLS LAST
      LIMIT $1
    `;
    const topRes = await client.query(topSql, [topN]);
    const top = topRes.rows.map(r => ({ id: r.id, queue_name: r.queue_name, worker_id: r.worker_id, minutes_running: Number(r.minutes_running).toFixed(1) }));

    console.log(JSON.stringify({ outFile, topN, topCount: top.length, top }, null, 2));
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
})();
