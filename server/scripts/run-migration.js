const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Disable SSL certificate validation for this migration script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  console.log('🔗 Database:', connectionString ? connectionString.replace(/:[^:]*@/, ':****@') : 'NOT FOUND');
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to database...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/201_add_program_id_to_projects.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: 201_add_program_id_to_projects.sql');
    
    // Execute the migration
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    if (result.rows && result.rows.length > 0) {
      console.log('   Result:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();

