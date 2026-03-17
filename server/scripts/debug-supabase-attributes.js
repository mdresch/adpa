const { Pool } = require('pg');
const pool = new Pool({
  host: 'db.blxzjbxczpmmgiwbtmdo.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'QueIQ4ADPA$',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkAttributes() {
  try {
    const res = await pool.query(`
      SELECT attname, atttypid::regtype, attisdropped 
      FROM pg_attribute 
      WHERE attrelid = 'public.users'::regclass AND attnum > 0
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkAttributes();
