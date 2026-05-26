import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();
  const r = await pool.query(`
    SELECT id, name, provider_type, is_active, priority,
           length(api_key_encrypted) as key_length,
           LEFT(api_key_encrypted, 20) as key_prefix,
           configuration
    FROM ai_providers
    ORDER BY priority ASC, name ASC
  `);
  console.log('=== AI PROVIDERS IN DB ===');
  r.rows.forEach(row => {
    const decoded = row.key_prefix ? Buffer.from(row.key_prefix, 'base64').toString('utf-8') : 'NULL';
    console.log(`[${row.name}] type=${row.provider_type} active=${row.is_active} priority=${row.priority} key_length=${row.key_length} decoded_prefix="${decoded.substring(0, 15)}"`)
  });
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
