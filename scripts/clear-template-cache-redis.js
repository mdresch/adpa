// Clear Template Cache via API
const fetch = require('node-fetch');

async function clearCache() {
  try {
    console.log('🧹 Attempting to clear template cache...\n');
    
    // The template ID
    const templateId = '09f406cc-0d98-48db-89c3-fea4dbca005c';
    
    // Just refresh by updating the template (this clears cache)
    const {Pool} = require('pg');
    require('dotenv').config();
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {rejectUnauthorized: false}
    });
    
    // Touch the updated_at to trigger cache clear on next read
    await pool.query(`
      UPDATE templates 
      SET updated_at = NOW()
      WHERE id = $1
      RETURNING name, validation_count, success_count
    `, [templateId]);
    
    console.log('✅ Template touched - cache will refresh on next API call');
    console.log('\n🔄 Now refresh your browser and the data should load fresh!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearCache();

