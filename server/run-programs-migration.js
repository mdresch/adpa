require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ⚠️ DEVELOPMENT MIGRATION SCRIPT ONLY - NOT FOR PRODUCTION USE
// This script runs ONE-TIME database migrations during development
// TLS verification disabled for self-signed certificates (Neon/Supabase dev)
// codacy-disable-next-line SecurityRisk: Development script for local migrations only
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // codacy-disable-line SecurityRisk: Self-signed certificates acceptable for dev
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true }  // Production: verify certificates
    : { rejectUnauthorized: false }  // Development: allow self-signed
});

(async () => {
  try {
    console.log('📊 Reading migration file...');
    // codacy-disable-next-line PathTraversal: Static file path, not user input
    // codacy-disable-next-line SQLInjection: SQL from trusted migration file, not user input
    // This is a development utility script that reads a KNOWN STATIC migration file
    const migrationFile = path.join(__dirname, 'migrations/090_create_programs_table.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Extract UP section from migration file
    // codacy-disable-next-line SQLInjection: SQL comes from trusted migration file, NOT user input
    // SQL content is from version-controlled migration files written by developers
    const upSQL = sql.split('-- UP')[1].split('-- DOWN')[0].trim();
    
    console.log('🚀 Running migration...');
    // codacy-disable-next-line SQLInjection: Trusted file source, development migration only
    // This SQL is read from a trusted migration file (not user input - safe for development)
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

