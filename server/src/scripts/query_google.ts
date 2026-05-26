import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
import { connectDatabase, pool } from '../database/connection';

async function run() {
  await connectDatabase();
  const r = await pool.query("SELECT id, name, provider_type, is_active FROM ai_providers WHERE name ILIKE '%google%' OR provider_type = 'google' OR name ILIKE '%gemini%'");
  console.log(JSON.stringify(r.rows, null, 2));
  process.exit(0);
}
run();
