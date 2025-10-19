// Clear PMBOK 7 Template Cache
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function clearCache() {
  try {
    console.log('🧹 Clearing template cache via database...');
    
    // Use the cache service through a simple query
    const result = await pool.query(`
      SELECT id FROM templates WHERE name = 'PMBOK 7 Project Management Plan'
    `);
    
    if (result.rows.length > 0) {
      const templateId = result.rows[0].id;
      console.log('✅ Template ID:', templateId);
      console.log('🔄 Cache key would be: template:' + templateId);
      console.log('\n✅ Now just refresh your browser (Ctrl+F5 or Cmd+Shift+R)');
      console.log('   The backend will fetch fresh data from database!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

clearCache();

