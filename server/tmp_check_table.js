
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function checkTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query("SELECT id, name, created_at FROM projects ORDER BY created_at DESC LIMIT 5");
    console.log('Recent projects:', res.rows);

  } catch (err) {
    console.error('Error querying table:', err);
  } finally {
    await client.end();
  }
}

checkTable();
