import 'dotenv/config';
import { connectDatabase, getDatabasePool } from '../server/src/database/connection';

async function checkAvailableModels() {
  try {
    await connectDatabase();
    const db = getDatabasePool();
    const res = await db.query("SELECT name, available_models, configuration FROM ai_providers WHERE provider_type = 'google'");
    console.log(JSON.stringify(res.rows, null, 2));
    await db.end();
  } catch (error) {
    console.error(error);
  }
}

checkAvailableModels();
