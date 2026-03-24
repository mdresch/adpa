#!/usr/bin/env tsx

import 'dotenv/config';
import { connectDatabase, getDatabasePool } from '../server/src/database/connection';

async function checkProviders() {
  try {
    await connectDatabase();
    const db = getDatabasePool();
    
    console.log('--- AI Providers in Database ---');
    const res = await db.query('SELECT name, provider_type, is_active FROM ai_providers');
    console.table(res.rows);
    
    console.log('\n--- Integrations in Database ---');
    const intRes = await db.query('SELECT name, type, is_active FROM integrations');
    console.table(intRes.rows);
    
    await db.end();
  } catch (error) {
    console.error('Error checking providers:', error);
  }
}

checkProviders();
