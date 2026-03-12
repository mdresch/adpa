const { Client } = require('pg');

async function fix() {
  const client = new Client({
    connectionString: "postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const res = await client.query("SELECT id, configuration FROM integrations WHERE type = 'pinecone'");
    console.log(`Found ${res.rows.length} pinecone integrations`);

    for (const row of res.rows) {
      let config = typeof row.configuration === 'string' ? JSON.parse(row.configuration) : row.configuration;
      console.log(`Fixing ${row.id}:`, config.indexName);
      
      config.indexName = 'adpa-rag-index';
      config.index_name = 'adpa-rag-index';
      
      await client.query("UPDATE integrations SET configuration = $1 WHERE id = $2", [JSON.stringify(config), row.id]);
      console.log(`Updated ${row.id}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fix();
