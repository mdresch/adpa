const { Pool } = require('pg');
const pool = new Pool({
  host: 'db.blxzjbxczpmmgiwbtmdo.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'QueIQ4ADPA$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkConstraints() {
  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid) as def 
      FROM pg_constraint c 
      JOIN pg_class t ON c.conrelid = t.oid 
      WHERE t.relname='users'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkConstraints();
