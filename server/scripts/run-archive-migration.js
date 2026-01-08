const db = require('../src/lib/db');
const fs = require('fs');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: path.join(__dirname, '../.env') });

(async function(){ try{ await db.initDb() } catch(e){} })();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Connecting to database...');
    
    const migrationPath = path.join(__dirname, '../migrations/202_add_program_archive_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: 202_add_program_archive_fields.sql');
    
    const result = await db.query(migrationSQL);
    
    console.log('✅ Archive migration completed successfully!');
    if (result.rows && result.rows.length > 0) {
      console.log('   Result:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    try { await db.end() } catch (e) {}
    console.log('🔌 Database connection closed');
  }
}

runMigration();

