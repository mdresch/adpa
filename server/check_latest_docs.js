const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  try {
    await client.connect();
    const res = await client.query("SELECT id, name, created_at, status FROM documents ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
