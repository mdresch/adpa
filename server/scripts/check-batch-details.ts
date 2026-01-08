import dotenv from 'dotenv';
dotenv.config();

const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkBatchDetails() {
  try {
    const batchId = '13e79f1f-fb52-476b-9f88-1c31d2e540e3';

    await db.initDb()
    // Get documents with their full metadata
    const docs = await db.query(`
      SELECT 
        id,
        name,
        content,
        framework,
        mime_type,
        metadata
      FROM documents
      WHERE metadata->>'upload_batch_id' = $1
      ORDER BY created_at
      LIMIT 1
    `, [batchId]);

    if (docs.rows.length === 0) {
      console.log('No documents found');
      await db.end();
      return;
    }

    const doc = docs.rows[0];
    console.log('\n📄 First Document Details:\n');
    console.log(`Name: ${doc.name}`);
    console.log(`Framework: ${doc.framework}`);
    console.log(`MIME Type: ${doc.mime_type}`);
    console.log(`\nContent:`);
    console.log(`  Type: ${typeof doc.content}`);
    console.log(`  Length: ${doc.content.length} chars`);
    console.log(`  Value: "${doc.content}"`);
    console.log(`\nMetadata:`);
    console.log(JSON.stringify(doc.metadata, null, 2));

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBatchDetails();

