const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function createChangeRequestTemplate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating Change Request template...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-change-request-template.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Change Request template created successfully!\n');
    
    // Verify
    const result = await client.query(
      `SELECT id, name, framework, category, development_status, is_public
       FROM templates 
       WHERE name = 'Change Request (CR)'`
    );
    
    if (result.rows.length > 0) {
      const template = result.rows[0];
      console.log('📄 Template Details:');
      console.log(`   ID: ${template.id}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Framework: ${template.framework}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Status: ${template.development_status}`);
      console.log(`   Public: ${template.is_public}`);
      console.log('\n✅ Template is ready to use for uploading change requests!');
    } else {
      console.log('⚠️  Template created but not found in verification query');
    }
    
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createChangeRequestTemplate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function createChangeRequestTemplate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating Change Request template...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-change-request-template.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Change Request template created successfully!\n');
    
    // Verify
    const result = await client.query(
      `SELECT id, name, framework, category, development_status, is_public
       FROM templates 
       WHERE name = 'Change Request (CR)'`
    );
    
    if (result.rows.length > 0) {
      const template = result.rows[0];
      console.log('📄 Template Details:');
      console.log(`   ID: ${template.id}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Framework: ${template.framework}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Status: ${template.development_status}`);
      console.log(`   Public: ${template.is_public}`);
      console.log('\n✅ Template is ready to use for uploading change requests!');
    } else {
      console.log('⚠️  Template created but not found in verification query');
    }
    
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createChangeRequestTemplate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function createChangeRequestTemplate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating Change Request template...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-change-request-template.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Change Request template created successfully!\n');
    
    // Verify
    const result = await client.query(
      `SELECT id, name, framework, category, development_status, is_public
       FROM templates 
       WHERE name = 'Change Request (CR)'`
    );
    
    if (result.rows.length > 0) {
      const template = result.rows[0];
      console.log('📄 Template Details:');
      console.log(`   ID: ${template.id}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Framework: ${template.framework}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Status: ${template.development_status}`);
      console.log(`   Public: ${template.is_public}`);
      console.log('\n✅ Template is ready to use for uploading change requests!');
    } else {
      console.log('⚠️  Template created but not found in verification query');
    }
    
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createChangeRequestTemplate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false
});

async function createChangeRequestTemplate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating Change Request template...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-change-request-template.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Change Request template created successfully!\n');
    
    // Verify
    const result = await client.query(
      `SELECT id, name, framework, category, development_status, is_public
       FROM templates 
       WHERE name = 'Change Request (CR)'`
    );
    
    if (result.rows.length > 0) {
      const template = result.rows[0];
      console.log('📄 Template Details:');
      console.log(`   ID: ${template.id}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Framework: ${template.framework}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Status: ${template.development_status}`);
      console.log(`   Public: ${template.is_public}`);
      console.log('\n✅ Template is ready to use for uploading change requests!');
    } else {
      console.log('⚠️  Template created but not found in verification query');
    }
    
  } catch (error) {
    console.error('❌ Error creating template:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createChangeRequestTemplate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

