import 'dotenv/config';
import { pool, connectDatabase } from '../src/database/connection';

async function debugProviders() {
  try {
    await connectDatabase();
    
    const result = await pool.query(
      `SELECT id, name, provider_type, configuration, is_active FROM ai_providers`
    );

    console.log("AI Providers in Database:", result.rows);

  } catch (err) {
    console.error("Debug failed:", err);
  } finally {
    try {
      await pool.end();
    } catch (e) {}
  }
}

debugProviders();
