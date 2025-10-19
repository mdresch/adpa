// Quick script to check document metadata in database
const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

console.log('DATABASE_URL found:', !!process.env.DATABASE_URL);
console.log('POSTGRES_URL found:', !!process.env.POSTGRES_URL);

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ No database connection string found in environment!');
  console.error('Check server/.env for DATABASE_URL or POSTGRES_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function checkDocument() {
  try {
    const docId = 'b43341bb-34e6-40c0-9de2-f6548b90ea8a';
    
    console.log('🔍 Checking document:', docId);
    console.log('');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        template_id,
        created_at,
        generation_metadata IS NULL as no_metadata,
        pg_typeof(generation_metadata) as metadata_type,
        LENGTH(generation_metadata::text) as metadata_length,
        generation_metadata::text as metadata_preview
      FROM documents 
      WHERE id = $1
    `, [docId]);
    
    if (result.rows.length === 0) {
      console.log('❌ Document not found!');
      process.exit(1);
    }
    
    const doc = result.rows[0];
    
    console.log('📄 Document Info:');
    console.log('  Name:', doc.name);
    console.log('  Template ID:', doc.template_id);
    console.log('  Created:', doc.created_at);
    console.log('');
    console.log('📊 Metadata Info:');
    console.log('  No metadata?:', doc.no_metadata);
    console.log('  Type:', doc.metadata_type);
    console.log('  Length:', doc.metadata_length, 'chars');
    console.log('');
    
    if (doc.no_metadata) {
      console.log('❌ PROBLEM: generation_metadata is NULL in database!');
      console.log('');
      console.log('This means the backend did NOT save the metadata.');
      console.log('Frontend sent it, but backend lost it during save.');
    } else {
      console.log('✅ Metadata exists in database!');
      console.log('');
      console.log('📝 Preview (first 500 chars):');
      console.log(doc.metadata_preview.substring(0, 500));
      console.log('');
      console.log('If metadata exists but UI shows N/A, the problem is:');
      console.log('1. Backend GET endpoint not parsing it');
      console.log('2. Frontend not reading it correctly');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDocument();

