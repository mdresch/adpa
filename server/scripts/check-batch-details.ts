import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkBatchDetails() {
  try {
    const batchId = '13e79f1f-fb52-476b-9f88-1c31d2e540e3';

    // Get documents with their full metadata
    const docs = await pool.query(`
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
      await pool.end();
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

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBatchDetails();

