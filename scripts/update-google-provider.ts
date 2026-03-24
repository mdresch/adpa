#!/usr/bin/env tsx

import 'dotenv/config';
import { connectDatabase, getDatabasePool } from '../server/src/database/connection';

async function updateGoogleProvider() {
  try {
    await connectDatabase();
    const db = getDatabasePool();
    
    console.log('--- Updating Google Gemini Provider ---');
    
    const configuration = {
      model: 'gemini-2.5-flash',
      endpoint: 'https://generativelanguage.googleapis.com'
    };
    
    const rate_limits = {
      requestsPerMinute: 5,
      tokensPerMinute: 250000,
      requestsPerDay: 20
    };
    
    const res = await db.query(
      `UPDATE ai_providers 
       SET configuration = configuration || $1::jsonb,
           rate_limits = $2::jsonb,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE name = 'Google Gemini' OR provider_type = 'google'
       RETURNING id, name, configuration, rate_limits, is_active`,
      [JSON.stringify(configuration), JSON.stringify(rate_limits)]
    );
    
    console.log('Update result:');
    console.table(res.rows);
    
    await db.end();
    console.log('✅ Provider updated and activated successfully.');
  } catch (error) {
    console.error('Error updating provider:', error);
  }
}

updateGoogleProvider();
