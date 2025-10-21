const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const SUPABASE_URL = process.env.DATABASE_URL;

async function importToSupabase() {
  const backupFile = process.argv[2];
  
  if (!backupFile) {
    console.error('❌ Usage: node import-to-supabase-complete.js <backup-file.sql>');
    console.error('');
    console.error('Example:');
    console.error('node scripts/import-to-supabase-complete.js neon-backup-2025-10-20.sql');
    process.exit(1);
  }
  
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    process.exit(1);
  }
  
  console.log('🚀 NEON TO SUPABASE MIGRATION - IMPORT PHASE');
  console.log('='.repeat(60));
  console.log('');
  console.log('📦 Source file:', backupFile);
  console.log('📊 Destination: Supabase (blxzjbxczpmmgiwbtmdo)');
  console.log('');
  
  const stats = fs.statSync(backupFile);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`📏 Backup size: ${fileSizeMB} MB`);
  console.log('');
  
  // Import to Supabase
  console.log('📥 Importing to Supabase...');
  console.log('⏳ This may take 3-10 minutes depending on data size...');
  console.log('');
  
  try {
    const psqlCmd = `psql "${SUPABASE_URL}" -f "${backupFile}"`;
    const { stdout, stderr } = await execPromise(psqlCmd);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('⚠️  Warnings during import:', stderr);
    }
    
    console.log('✅ Import complete!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
  
  // Verify migration
  console.log('🔍 Verifying migration...');
  console.log('');
  
  const pool = new Pool({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    
    // Critical tables to verify
    const criticalTables = [
      'users',
      'projects', 
      'documents',
      'templates',
      'stakeholders',
      'ai_providers',
      'audit_logs',
      'project_baselines',
      'baseline_components'
    ];
    
    console.log('📊 Table Row Counts:');
    console.log('');
    
    const summary = {};
    
    for (const table of criticalTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        summary[table] = count;
        
        const icon = count > 0 ? '✅' : '⚠️ ';
        console.log(`${icon} ${table.padEnd(25)} ${count.toLocaleString()} rows`);
      } catch (err) {
        console.log(`❌ ${table.padEnd(25)} ERROR: ${err.message}`);
      }
    }
    
    console.log('');
    
    // Verify Change Request template exists
    const templateResult = await client.query(`
      SELECT id, name, framework FROM templates 
      WHERE name = 'Change Request (CR)'
    `);
    
    if (templateResult.rows.length > 0) {
      console.log('✅ Change Request template migrated');
    } else {
      console.log('ℹ️  Change Request template not found - will be created');
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total tables: ${Object.keys(summary).length}`);
    console.log(`   Total rows: ${Object.values(summary).reduce((a,b) => a+b, 0).toLocaleString()}`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Update Railway DATABASE_URL to Supabase');
    console.log('2. Restart backend: cd server && npm run dev');
    console.log('3. Test all features');
    console.log('4. Verify audit trail intact');
    console.log('5. Cancel Neon subscription (optional)');
    console.log('');
    console.log('Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/blxzjbxczpmmgiwbtmdo');
    console.log('');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

importToSupabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

