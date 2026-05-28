import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function check() {
  try {
    await connectDatabase();
    const res = await pool.query(
      `SELECT name, gkg_context_strategy FROM templates WHERE id = '46e71974-5f12-43ca-b3c4-6419a0fe1e5e'`
    );
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
