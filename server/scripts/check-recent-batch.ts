import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkRecentBatch() {
  try {
    // Get most recent batch
    const batch = await pool.query(`
      SELECT id, total_files, successful_files, failed_files, status, created_at
      FROM upload_batches
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (batch.rows.length === 0) {
      console.log('No batches found');
      await pool.end();
      return;
    }

    const batchId = batch.rows[0].id;
    console.log('\n📦 Most Recent Batch:');
    console.log(`   ID: ${batchId}`);
    console.log(`   Total: ${batch.rows[0].total_files}`);
    console.log(`   Successful: ${batch.rows[0].successful_files}`);
    console.log(`   Failed: ${batch.rows[0].failed_files}`);
    console.log(`   Status: ${batch.rows[0].status}`);
    console.log('');

    // Get documents from this batch
    const docs = await pool.query(`
      SELECT 
        id,
        name,
        content,
        LENGTH(content) as content_length,
        framework,
        metadata
      FROM documents
      WHERE metadata->>'upload_batch_id' = $1
      ORDER BY created_at
    `, [batchId]);

    console.log(`📄 Documents in this batch: ${docs.rows.length}\n`);

    docs.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ${doc.name}`);
      console.log(`   Content length: ${doc.content_length} chars`);
      console.log(`   Framework: ${doc.framework}`);
      console.log(`   Content type: ${typeof doc.content}`);
      console.log(`   Content preview: ${doc.content.substring(0, 100)}...`);
      
      // Check if metadata has conversion info
      const meta = doc.metadata;
      if (meta.conversion_metadata) {
        console.log(`   Conversion method: ${meta.conversion_metadata.conversionMethod}`);
        console.log(`   Word count: ${meta.conversion_metadata.wordCount}`);
      }
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecentBatch();

