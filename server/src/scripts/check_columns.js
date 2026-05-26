const dotenv = require('dotenv');
const pg = require('pg');

dotenv.config();

async function run() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log("Querying columns...");
    const r = await pool.query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'project_context_items'`
    );
    console.log("COLUMNS:");
    console.log(JSON.stringify(r.rows, null, 2));
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    await pool.end();
  }
  process.exit(0);
}

run();
