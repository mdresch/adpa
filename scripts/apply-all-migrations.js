const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

// Numbered migrations in order
const migrations = [
  '014_add_soft_delete_core.sql',
  '015_template_development_status.sql',
  '016_add_compliance_and_archive_stages.sql',
  '017_baseline_drift_detection.sql'
];

async function applyAllMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Applying all numbered migrations to Supabase\n');
    console.log('📊 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
    console.log('');
    
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, '..', 'server', 'migrations', migration);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  ${migration} - NOT FOUND (skipping)`);
        skippedCount++;
        continue;
      }
      
      console.log(`📄 Applying ${migration}...`);
      
      try {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migrationSQL);
        console.log(`   ✅ Applied successfully\n`);
        successCount++;
      } catch (err) {
        if (err.code === '42P07') { // relation already exists
          console.log(`   ℹ️  Already applied (relation exists)\n`);
          skippedCount++;
        } else if (err.code === '42701') { // column already exists
          console.log(`   ℹ️  Already applied (column exists)\n`);
          skippedCount++;
        } else {
          console.log(`   ❌ Failed: ${err.message}\n`);
          failedCount++;
          // Continue with other migrations
        }
      }
    }
    
    // Create Change Request template
    console.log('📄 Creating Change Request template...');
    try {
      const templatePath = path.join(__dirname, 'create-change-request-template.sql');
      const templateSQL = fs.readFileSync(templatePath, 'utf8');
      await client.query(templateSQL);
      console.log('   ✅ Template created\n');
      successCount++;
    } catch (err) {
      if (err.code === '23505') { // unique violation
        console.log('   ℹ️  Template already exists\n');
        skippedCount++;
      } else {
        console.log(`   ❌ Failed: ${err.message}\n`);
        failedCount++;
      }
    }
    
    // Summary
    console.log('================================');
    console.log('📊 Migration Summary');
    console.log('================================');
    console.log(`✅ Applied: ${successCount}`);
    console.log(`ℹ️  Skipped: ${skippedCount}`);
    if (failedCount > 0) {
      console.log(`❌ Failed: ${failedCount}`);
    }
    console.log('');
    
    // Verify baseline tables
    console.log('🔍 Verifying baseline tables...\n');
    
    const baselineTables = [
      'project_baselines',
      'baseline_components',
      'baseline_versions',
      'baseline_drift_detection',
      'innovation_opportunities'
    ];
    
    for (const table of baselineTables) {
      const result = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`      └─ ${countResult.rows[0].count} rows`);
      }
    }
    
    // Check template
    console.log('');
    const templateResult = await client.query(
      `SELECT id, name, framework, development_status 
       FROM templates 
       WHERE name = 'Change Request (CR)'`
    );
    
    if (templateResult.rows.length > 0) {
      console.log('   ✅ Change Request template');
      console.log(`      ID: ${templateResult.rows[0].id}`);
      console.log(`      Status: ${templateResult.rows[0].development_status}`);
    } else {
      console.log('   ❌ Change Request template not found');
    }
    
    console.log('\n');
    console.log('================================');
    console.log('✅ Database Ready!');
    console.log('================================');
    console.log('');
    console.log('Next steps:');
    console.log('1. cd server && npm run dev');
    console.log('2. npm run dev (frontend, new terminal)');
    console.log('3. Upload Change Requests');
    console.log('');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('Code:', error.code);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyAllMigrations().catch(err => {
  process.exit(1);
});

