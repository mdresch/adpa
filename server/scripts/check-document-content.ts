import dotenv from 'dotenv';
dotenv.config();

const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkDocuments() {
  try {
    await db.initDb()
    const docs = await db.query(`
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

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDocuments();

