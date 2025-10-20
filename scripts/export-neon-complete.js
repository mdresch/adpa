const { Pool } = require('pg');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Load Neon credentials (you'll need to provide these)
const NEON_URL = process.env.NEON_DATABASE_URL || "postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech:5432/neondb_owner?sslmode=require";

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = `neon-backup-${timestamp}.sql`;

async function exportNeonDatabase() {
  console.log('🚀 NEON TO SUPABASE MIGRATION - EXPORT PHASE');
  console.log('='.repeat(60));
  console.log('');
  console.log('📊 Source: Neon (ep-royal-morning-a9j6aaq0-pooler)');
  console.log('📦 Backup file:', backupFile);
  console.log('');
  
  // Test connection first
  console.log('🔍 Testing Neon connection...');
  const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ Connected to Neon:', result.rows[0].version.split(' ')[0]);
    
    // Get table counts
    const tableCount = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.tables ist 
              WHERE ist.table_name = t.table_name) as count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    
    console.log(`📊 Found ${tableCount.rows.length} tables in Neon`);
    console.log('');
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Cannot connect to Neon:',err.message);
    console.error('');
    console.error('Possible reasons:');
    console.error('1. Still over quota (wait for reset or upgrade)');
    console.error('2. Wrong password in NEON_DATABASE_URL');
    console.error('3. Network issue');
    console.error('');
    console.error('Set NEON_DATABASE_URL environment variable with your Neon connection string');
    process.exit(1);
  }
  
  // Export database
  console.log('📦 Exporting complete database from Neon...');
  console.log('   This includes:');
  console.log('   - All tables (users, projects, documents, templates)');
  console.log('   - All data with relationships');
  console.log('   - Audit trail (complete history)');
  console.log('   - Compliance reviews');
  console.log('   - All configurations');
  console.log('');
  
  try {
    const pgDumpCmd = `pg_dump "${NEON_URL}" --no-owner --no-privileges --clean --if-exists --file="${backupFile}"`;
    
    console.log('⏳ Running pg_dump (this may take 2-5 minutes)...');
    const { stdout, stderr } = await execPromise(pgDumpCmd);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('⚠️  Warnings during export:', stderr);
    }
    
    // Verify backup file
    const stats = fs.statSync(backupFile);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('');
    console.log('✅ Export complete!');
    console.log(`📄 Backup file: ${backupFile}`);
    console.log(`📏 Size: ${fileSizeMB} MB`);
    console.log('');
    
    // Create backup info file
    const infoFile = `${backupFile}.info.json`;
    const backupInfo = {
      exportDate: new Date().toISOString(),
      sourceDatabase: 'Neon (ep-royal-morning-a9j6aaq0-pooler)',
      backupFile: backupFile,
      fileSizeMB: fileSizeMB,
      nextStep: 'Run: node scripts/import-to-supabase-complete.js ' + backupFile
    };
    fs.writeFileSync(infoFile, JSON.stringify(backupInfo, null, 2));
    
    console.log('='.repeat(60));
    console.log('✅ EXPORT SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next step:');
    console.log(`node scripts/import-to-supabase-complete.js ${backupFile}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    console.error('');
    console.error('Make sure pg_dump is installed and in PATH');
    console.error('Download PostgreSQL tools from: https://www.postgresql.org/download/');
    process.exit(1);
  }
}

exportNeonDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

