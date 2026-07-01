const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkDocument(docId) {
  try {
    const result = await pool.query('SELECT content, character_count FROM documents WHERE id = $1', [docId]);
    if (result.rows.length === 0) {
      console.log(`Document ${docId} not found`);
      return;
    }
    const doc = result.rows[0];
    const content = doc.content || '';
    console.log(`Document ID: ${docId}`);
    console.log(`DB Character Count: ${doc.character_count}`);
    console.log(`Actual Content Length: ${content.length}`);
    
    if (content.length > 0) {
      console.log(`\n--- Document End ---`);
      console.log(content.substring(content.length - 500).replace(/\n/g, '\\n'));
    }
  } catch (error) {
    console.error('Error checking document:', error);
  } finally {
    await pool.end();
  }
}

const docId = process.argv[2];
if (!docId) {
  console.error('Please provide a docId');
  process.exit(1);
}

checkDocument(docId);
