const { Client } = require('pg');
const id = process.argv[2];
if (!id) { console.error('Usage: node get-job-data.js <jobId>'); process.exit(2); }
const dbUrl = process.env.DATABASE_URL || process.env.DATABASE;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(2); }
(async ()=>{
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT id, status, queue_name, data FROM jobs WHERE id = $1', [id]);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    try { await client.end(); } catch(_){}
    process.exit(1);
  }
})();
