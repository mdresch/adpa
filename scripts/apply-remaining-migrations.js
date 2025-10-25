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

async function applyRemainingMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Applying remaining migrations to Supabase\n');
    
    // Migration 015: Template development status
    console.log('📄 Applying migration 015: Template development status...');
    try {
      const migration015Path = path.join(__dirname, '..', 'server', 'migrations', '015_template_development_status.sql');
      const migration015SQL = fs.readFileSync(migration015Path, 'utf8');
      await client.query(migration015SQL);
      console.log('   ✅ Template status fields added\n');
    } catch (err) {
      if (err.code === '42701') { // column already exists
        console.log('   ℹ️  Already applied (column exists)\n');
      } else {
        throw err;
      }
    }
    
    // Migration 017: Baseline drift detection
    console.log('📄 Applying migration 017: Baseline drift detection...');
    try {
      const migration017Path = path.join(__dirname, '..', 'server', 'migrations', '017_baseline_drift_detection.sql');
      const migration017SQL = fs.readFileSync(migration017Path, 'utf8');
      await client.query(migration017SQL);
      console.log('   ✅ Baseline tables created\n');
    } catch (err) {
      if (err.code === '42P07') { // table already exists
        console.log('   ℹ️  Already applied (tables exist)\n');
      } else {
        throw err;
      }
    }
    
    // Create Change Request template
    console.log('📄 Creating Change Request template...');
    try {
      const templatePath = path.join(__dirname, 'create-change-request-template.sql');
      const templateSQL = fs.readFileSync(templatePath, 'utf8');
      await client.query(templateSQL);
      console.log('   ✅ Change Request template created\n');
    } catch (err) {
      if (err.code === '23505') { // unique violation (already exists)
        console.log('   ℹ️  Template already exists\n');
      } else {
        throw err;
      }
    }
    
    // Verify everything
    console.log('🔍 Verifying setup...\n');
    
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
    }
    
    // Check template
    const templateResult = await client.query(
      `SELECT id, name, development_status FROM templates WHERE name = 'Change Request (CR)'`
    );
    
    console.log('');
    if (templateResult.rows.length > 0) {
      console.log('   ✅ Change Request template exists');
      console.log(`      ID: ${templateResult.rows[0].id}`);
      console.log(`      Status: ${templateResult.rows[0].development_status}`);
    }
    
    console.log('\n');
    console.log('================================');
    console.log('✅ Supabase Setup Complete!');
    console.log('================================');
    console.log('');
    console.log('Next steps:');
    console.log('1. cd server && npm run dev');
    console.log('2. cd .. && npm run dev (frontend, new terminal)');
    console.log('3. Upload Change Requests');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyRemainingMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

