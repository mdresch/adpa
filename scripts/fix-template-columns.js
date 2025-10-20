const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function fixTemplateColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding missing columns to templates table...\n');
    
    // Add development_status column
    try {
      await client.query(`
        ALTER TABLE templates 
        ADD COLUMN IF NOT EXISTS development_status VARCHAR(20) DEFAULT 'draft' 
        CHECK (development_status IN ('draft', 'testing', 'compliance', 'validated', 'production', 'archived', 'deprecated'))
      `);
      console.log('✅ development_status column added');
    } catch (err) {
      console.log(`ℹ️  development_status: ${err.message}`);
    }
    
    // Add validation_count column
    try {
      await client.query(`
        ALTER TABLE templates 
        ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0
      `);
      console.log('✅ validation_count column added');
    } catch (err) {
      console.log(`ℹ️  validation_count: ${err.message}`);
    }
    
    // Add success_count column
    try {
      await client.query(`
        ALTER TABLE templates 
        ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0
      `);
      console.log('✅ success_count column added');
    } catch (err) {
      console.log(`ℹ️  success_count: ${err.message}`);
    }
    
    // Add last_validated_at column
    try {
      await client.query(`
        ALTER TABLE templates 
        ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP
      `);
      console.log('✅ last_validated_at column added');
    } catch (err) {
      console.log(`ℹ️  last_validated_at: ${err.message}`);
    }
    
    console.log('\n✅ Template table updated!\n');
    
    // Now create Change Request template
    console.log('📄 Creating Change Request template...');
    const fs = require('fs');
    const templatePath = path.join(__dirname, 'create-change-request-template.sql');
    const templateSQL = fs.readFileSync(templatePath, 'utf8');
    
    try {
      await client.query(templateSQL);
      console.log('✅ Change Request template created\n');
    } catch (err) {
      if (err.code === '23505') {
        console.log('ℹ️  Template already exists\n');
      } else {
        throw err;
      }
    }
    
    // Verify
    const templateResult = await client.query(
      `SELECT id, name, framework, development_status 
       FROM templates 
       WHERE name = 'Change Request (CR)'`
    );
    
    if (templateResult.rows.length > 0) {
      console.log('✅ Template Verification:');
      console.log(`   ID: ${templateResult.rows[0].id}`);
      console.log(`   Name: ${templateResult.rows[0].name}`);
      console.log(`   Framework: ${templateResult.rows[0].framework}`);
      console.log(`   Status: ${templateResult.rows[0].development_status}`);
    }
    
    console.log('\n');
    console.log('================================');
    console.log('✅ Setup Complete!');
    console.log('================================');
    console.log('');
    console.log('Start backend: cd server && npm run dev');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTemplateColumns().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

