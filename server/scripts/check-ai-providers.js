const { Client } = require('pg');

async function getProviders() {
  const client = new Client({
    connectionString: 'postgresql://postgres.blxzjbxczpmmgiwbtmdo:QueIQ4ADPA$@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const res = await client.query(
      'SELECT id, name, provider_type, default_model, is_active, priority FROM ai_providers ORDER BY priority ASC'
    );

    console.log('Registered AI Providers:');
    console.table(res.rows);
    
    // Also check for any usage logs in a hypothetical logs or stats table if it exists
    // Looking at the schema I saw 'jobs' table stores usage in 'data'
    const jobsRes = await client.query(
      "SELECT id, data->'metadata'->'tokens_used' as tokens, data->'metadata'->'provider' as provider FROM jobs WHERE data->'metadata'->'tokens_used' IS NOT NULL ORDER BY created_at DESC LIMIT 10"
    );
    console.log('\nRecent Job Token Usage:');
    console.table(jobsRes.rows);

  } catch (err) {
    console.error('Error fetching providers:', err);
  } finally {
    await client.end();
  }
}

getProviders();
