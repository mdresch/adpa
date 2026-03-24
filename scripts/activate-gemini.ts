#!/usr/bin/env tsx

import 'dotenv/config';
import { connectDatabase, getDatabasePool } from '../server/src/database/connection';

async function activateGemini() {
  try {
    await connectDatabase();
    const db = getDatabasePool();
    
    console.log('Activating Google Gemini provider...');
    await db.query(`
      UPDATE ai_providers 
      SET is_active = true, 
          api_key_encrypted = $1
      WHERE provider_type = 'google'
    `, [Buffer.from(process.env.GOOGLE_AI_API_KEY || '').toString('base64')]);
    
    console.log('✅ Google Gemini activated.');
    await db.end();
  } catch (error) {
    console.error('Error activating Gemini:', error);
  }
}

activateGemini();
