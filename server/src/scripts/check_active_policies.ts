import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();

  console.log('=== ACTIVE POLICIES ===');
  const result = await pool.query(`SELECT rule_code, title, status, target_document_types FROM policy_library`);
  result.rows.forEach((row: any) => {
    console.log(`- [${row.status}] ${row.rule_code}: ${row.title} (Target docs: ${JSON.stringify(row.target_document_types)})`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
