const { Client } = require('pg');

async function checkStatus() {
  const client = new Client({
    connectionString: "postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT id, type, sync_status, last_sync, configuration FROM integrations WHERE type = 'pinecone'");
    for (const row of res.rows) {
      console.log('--- Pinecone Integration status ---');
      console.log('ID:', row.id);
      console.log('Status:', row.sync_status);
      console.log('Last Sync:', row.last_sync);
      console.log('Config:', JSON.stringify(row.configuration, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkStatus();
