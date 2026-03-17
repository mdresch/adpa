const { Pool } = require('pg');
const pool = new Pool({
  host: 'db.blxzjbxczpmmgiwbtmdo.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'QueIQ4ADPA$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='users' 
      ORDER BY ordinal_position
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkUsers();
