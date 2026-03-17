const { Pool } = require('pg');
const pool = new Pool({
  host: 'db.blxzjbxczpmmgiwbtmdo.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'QueIQ4ADPA$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function findTable() {
  try {
    const res = await pool.query(`
      SELECT n.nspname, t.relname 
      FROM pg_constraint c 
      JOIN pg_class t ON c.conrelid = t.oid 
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE c.conname='users_phone_key'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

findTable();
