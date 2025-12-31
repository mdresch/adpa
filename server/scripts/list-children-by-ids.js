const { Client } = require('pg');
const parentId = process.argv[2];
if (!parentId) { console.error('Usage: node list-children-by-ids.js <parentJobId>'); process.exit(2); }
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(2); }
(async ()=>{
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const p = await client.query('SELECT data FROM jobs WHERE id = $1', [parentId]);
    if (!p.rows || p.rows.length === 0) { console.error('Parent job not found'); await client.end(); process.exit(1); }
    const childIds = (p.rows[0].data && p.rows[0].data.childJobIds) || [];
    if (!childIds.length) { console.log('No childJobIds found in parent data'); await client.end(); process.exit(0); }
    // Query jobs table for matching ids
    const res = await client.query('SELECT id, status, queue_name, worker_id, started_at, processing_started_at FROM jobs WHERE id = ANY($1)', [childIds]);
    console.log(JSON.stringify({ parentId, childCount: childIds.length, found: res.rows.length, rows: res.rows }, null, 2));
    await client.end();
    process.exit(0);
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    try { await client.end(); } catch(_){}
    process.exit(1);
  }
})();
