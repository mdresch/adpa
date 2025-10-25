import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkGroq() {
  try {
    const result = await pool.query(`
      SELECT 
        name, 
        provider_type, 
        is_active, 
        default_model,
        priority
      FROM ai_providers 
      WHERE provider_type = 'groq' OR LOWER(name) LIKE '%groq%'
      ORDER BY priority
    `);
    
    console.log('\n🤖 Groq AI Provider Status:\n');
    
    if (result.rows.length === 0) {
      console.log('❌ No Groq provider found');
    } else {
      result.rows.forEach(provider => {
        console.log(`Name: ${provider.name}`);
        console.log(`Type: ${provider.provider_type}`);
        console.log(`Active: ${provider.is_active ? '✅ YES' : '❌ NO'}`);
        console.log(`Default Model: ${provider.default_model || 'Not set'}`);
        console.log(`Priority: ${provider.priority}`);
        console.log('---');
      });
    }
    
    // Also check what providers are active
    const activeResult = await pool.query(`
      SELECT name, provider_type, is_active, priority, default_model
      FROM ai_providers 
      WHERE is_active = true
      ORDER BY priority
    `);
    
    console.log('\n✅ All Active Providers:\n');
    activeResult.rows.forEach(provider => {
      console.log(`${provider.priority}. ${provider.name} (${provider.provider_type}) - Model: ${provider.default_model || 'Not set'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkGroq();

