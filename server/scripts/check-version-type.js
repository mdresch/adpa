const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({ 
  connectionString,
  ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function checkVersionType() {
  try {
    // Check column type
    const typeResult = await pool.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'version'
    `);
    
    console.log('📊 Version Column Type:');
    console.log(JSON.stringify(typeResult.rows, null, 2));
    
    // Check some actual document versions
    const docsResult = await pool.query(`
      SELECT id, name, version 
      FROM documents 
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📄 Recent Document Versions:');
    console.log(JSON.stringify(docsResult.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkVersionType();

