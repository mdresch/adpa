const fs = require('fs');
const path = require('path');
const db = require('../src/lib/db');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running database migrations...');
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`🚀 Running migration: ${file}`);
      
      try {
        await client.query(migrationSQL);
        console.log(`✅ Migration completed: ${file}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${file}`);
        console.error(error.message);
        throw error;
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } finally {
    client.release();
    try { await db.end() } catch (e) {}
  }
}

runMigrations().catch(error => {
  console.error('💥 Migration runner failed:', error);
  process.exit(1);
});
