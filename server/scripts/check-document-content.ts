import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkDocuments() {
  try {
    const docs = await pool.query(`
      SELECT 
        id, 
        name,
        framework,
        mime_type,
        source,
        LEFT(content, 100) as content_preview,
        LENGTH(content) as content_length,
        pg_typeof(content) as content_type,
        created_at
      FROM documents 
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📄 RECENT DOCUMENTS:\n');
    
    docs.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name}`);
      console.log(`   Framework: ${doc.framework}`);
      console.log(`   MIME Type: ${doc.mime_type}`);
      console.log(`   Source: ${doc.source}`);
      console.log(`   Content Type: ${doc.content_type}`);
      console.log(`   Content Length: ${doc.content_length} chars`);
      console.log(`   Preview: ${doc.content_preview}...`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDocuments();

