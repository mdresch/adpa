const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const isLocal = process.env.DATABASE_URL?.includes('localhost') || 
                process.env.DATABASE_URL?.includes('127.0.0.1') ||
                !process.env.DATABASE_URL?.includes('https');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Running Migration 664: Add missing extraction columns\n');
    
    const sqlPath = path.join(__dirname, '..', 'migrations', '664_add_missing_extraction_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration 664 completed successfully!\n');
    console.log('Added columns:');
    console.log('  • relationship_health.health_score (DECIMAL)');
    console.log('  • risk_triggers.risk_title (TEXT)');
    console.log('  • engagement_actions.action_id (UUID, nullable)');
    console.log('\n✅ Indexes created for performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
