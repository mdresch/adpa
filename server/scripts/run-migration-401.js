const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('neon') 
    ? { rejectUnauthorized: false }
    : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Applying Project Integration Settings Migration (401)...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'database', 'migrations', '401_project_integration_settings.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Check if migration already applied
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const checkResult = await client.query(
      'SELECT id FROM migrations WHERE name = $1',
      ['401_project_integration_settings']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Migration 401 already applied, skipping...');
      return;
    }
    
    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      ['401_project_integration_settings']
    );
    await client.query('COMMIT');
    
    console.log('✅ Migration 401 applied successfully!');
    
    // Verify columns were added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'project_integrations'
        AND column_name IN (
          'confluence_enabled',
          'confluence_space_key_override',
          'confluence_parent_page_id_override',
          'confluence_auto_publish',
          'jira_enabled',
          'jira_project_key_override',
          'jira_issue_type_override',
          'jira_priority_override',
          'jira_auto_create',
          'integration_settings'
        )
      ORDER BY column_name
    `);
    
    console.log('\n📊 Added columns:');
    verifyResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

