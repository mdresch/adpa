
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

async function verifySupabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_goals'
      ) as exists
    `);
    console.log(`Table project_goals exists: ${res.rows[0].exists}`);
  } catch (err) {
    console.error('Error connecting to Supabase:', err);
  } finally {
    await client.end();
  }
}

verifySupabase();
