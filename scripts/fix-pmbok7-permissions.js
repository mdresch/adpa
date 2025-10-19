// Fix PMBOK 7 Template Permissions
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixPermissions() {
  try {
    console.log('🔧 Updating PMBOK 7 template to ensure public access...\n');
    
    const result = await pool.query(`
      UPDATE templates 
      SET is_public = true
      WHERE name = 'PMBOK 7 Project Management Plan'
      RETURNING id, name, is_public, validation_count, success_count, development_status
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Template updated:');
      console.log(result.rows[0]);
      console.log('\n✅ Template is now public and accessible to all users!');
    } else {
      console.log('❌ Template not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixPermissions();

