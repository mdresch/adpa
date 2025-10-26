require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('📊 Reading migration file...');
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations/090_create_programs_table.sql'),
      'utf8'
    );
    
    // Extract UP section
    const upSQL = sql.split('-- UP')[1].split('-- DOWN')[0].trim();
    
    console.log('🚀 Running migration...');
    await pool.query(upSQL);
    
    console.log('✅ Programs table created successfully!');
    console.log('   - programs table created');
    console.log('   - program_id column added to projects table');
    console.log('   - All indexes created');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Code:', error.code);
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists - this is OK!');
    }
  } finally {
    await pool.end();
  }
})();

