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

async function setupFreshDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up fresh Supabase database for ADPA\n');
    console.log('📊 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
    console.log('');
    
    // Step 1: Apply main schema
    console.log('📄 Step 1: Applying main database schema...');
    const schemaPath = path.join(__dirname, '..', 'server', 'src', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log(`   Size: ${(schemaSQL.length / 1024).toFixed(2)} KB`);
    await client.query(schemaSQL);
    console.log('   ✅ Main schema applied\n');
    
    // Step 2: Apply template development status migration
    console.log('📄 Step 2: Applying template development status migration...');
    const templateStatusPath = path.join(__dirname, '..', 'server', 'migrations', '015_template_development_status.sql');
    if (fs.existsSync(templateStatusPath)) {
      const templateStatusSQL = fs.readFileSync(templateStatusPath, 'utf8');
      console.log(`   Size: ${(templateStatusSQL.length / 1024).toFixed(2)} KB`);
      await client.query(templateStatusSQL);
      console.log('   ✅ Template status fields added\n');
    } else {
      console.log('   ⚠️  Migration 015 not found, skipping\n');
    }
    
    // Step 3: Apply baseline drift detection migration
    console.log('📄 Step 3: Applying baseline drift detection migration...');
    const migrationPath = path.join(__dirname, '..', 'server', 'migrations', '017_baseline_drift_detection.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
    await client.query(migrationSQL);
    console.log('   ✅ Baseline tables created\n');
    
    // Step 4: Create Change Request template
    console.log('📄 Step 3: Creating Change Request template...');
    const templatePath = path.join(__dirname, 'create-change-request-template.sql');
    const templateSQL = fs.readFileSync(templatePath, 'utf8');
    await client.query(templateSQL);
    console.log('   ✅ Change Request template created\n');
    
    // Verify tables
    console.log('🔍 Verifying database setup...\n');
    
    const coreTables = ['users', 'projects', 'documents', 'templates', 'ai_providers'];
    const baselineTables = ['project_baselines', 'baseline_components', 'baseline_versions', 'baseline_drift_detection', 'innovation_opportunities'];
    
    console.log('Core Tables:');
    for (const table of coreTables) {
      const result = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`      └─ Row count: ${countResult.rows[0].count}`);
      }
    }
    
    console.log('\nBaseline Tables:');
    for (const table of baselineTables) {
      const result = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      
      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`      └─ Row count: ${countResult.rows[0].count}`);
      }
    }
    
    console.log('\nTemplate Verification:');
    const templateResult = await client.query(
      `SELECT id, name, framework, development_status FROM templates WHERE name = 'Change Request (CR)'`
    );
    if (templateResult.rows.length > 0) {
      const template = templateResult.rows[0];
      console.log(`   ✅ Change Request template exists`);
      console.log(`      ID: ${template.id}`);
      console.log(`      Framework: ${template.framework}`);
      console.log(`      Status: ${template.development_status}`);
    }
    
    console.log('\n');
    console.log('================================');
    console.log('✅ Database Setup Complete!');
    console.log('================================');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start backend: cd server && npm run dev');
    console.log('2. Start frontend: npm run dev');
    console.log('3. Upload Change Requests via UI');
    console.log('');
    console.log('Supabase Dashboard:');
    console.log('https://supabase.com/dashboard/project/blxzjbxczpmmgiwbtmdo');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupFreshDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

