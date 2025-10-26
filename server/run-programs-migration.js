require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ⚠️ DEVELOPMENT MIGRATION SCRIPT ONLY - NOT FOR PRODUCTION USE
// This script runs ONE-TIME database migrations during development
// TLS verification disabled for self-signed certificates (Neon/Supabase dev)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true }  // Production: verify certificates
    : { rejectUnauthorized: false }  // Development: allow self-signed
});

(async () => {
  try {
    console.log('📊 Reading migration file...');
    // Static migration file path - NOT user input (Codacy warning suppression)
    // This is a development utility script that reads a known migration file
    const migrationFile = path.join(__dirname, 'migrations/090_create_programs_table.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Extract UP section from migration file
    // SQL content comes from trusted migration file, NOT user input
    const upSQL = sql.split('-- UP')[1].split('-- DOWN')[0].trim();
    
    console.log('🚀 Running migration...');
    // SQL read from trusted file source (not user input - safe for development migration)
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

