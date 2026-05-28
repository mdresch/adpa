import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function run() {
  try {
    await connectDatabase();
    const res = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'templates'`
    );
    console.log("TEMPLATES COLUMNS:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
