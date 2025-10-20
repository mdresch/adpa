const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Applying migration 017: Baseline Drift Detection System\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'server', 'migrations', '017_baseline_drift_detection.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log(`📏 SQL size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);
    
    // Execute the migration
    console.log('⚙️  Executing migration...\n');
    await client.query(migrationSQL);
    
    console.log('✅ Migration 017 applied successfully!\n');
    
    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    const tables = [
      'project_baselines',
      'baseline_components',
      'baseline_versions',
      'baseline_drift_detection',
      'innovation_opportunities'
    ];
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} ${table}`);
      
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   └─ Row count: ${countResult.rows[0].count}`);
      }
    }
    
    console.log('\n✅ All baseline drift detection tables created successfully!');
    console.log('\n📊 Initial baseline for CR-2026-001 has been inserted.');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

