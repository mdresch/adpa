import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();

  console.log('=== RISKS TABLE INDEXES ===');
  const result = await pool.query(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = 'risks';
  `);
  result.rows.forEach((row: any) => {
    console.log(`- ${row.indexname}: ${row.indexdef}`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
