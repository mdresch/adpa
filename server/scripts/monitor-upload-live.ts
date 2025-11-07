import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let lastCheckedBatch: string | null = null;
let lastDocCount = 0;

async function monitorUpload() {
  try {
    // Get most recent batch
    const batch = await pool.query(`
      SELECT id, total_files, successful_files, failed_files, status, created_at
      FROM upload_batches
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (batch.rows.length === 0) {
      console.log('⏳ Waiting for upload batch...');
      return;
    }

    const currentBatch = batch.rows[0];
    const batchId = currentBatch.id;

    // Check if this is a new batch
    if (lastCheckedBatch !== batchId) {
      console.log('\n🆕 NEW BATCH DETECTED!');
      console.log(`📦 Batch ID: ${batchId}`);
      console.log(`📊 Total files: ${currentBatch.total_files}`);
      console.log(`⏰ Started: ${new Date(currentBatch.created_at).toLocaleTimeString()}\n`);
      lastCheckedBatch = batchId;
      lastDocCount = 0;
    }

    // Get documents from this batch
    const docs = await pool.query(`
      SELECT 
        id,
        name,
        content,
        LENGTH(content) as content_length,
        framework,
        metadata,
        created_at
      FROM documents
      WHERE metadata->>'upload_batch_id' = $1
      ORDER BY created_at
    `, [batchId]);

    // Check for new documents
    if (docs.rows.length > lastDocCount) {
      const newDocs = docs.rows.slice(lastDocCount);
      
      newDocs.forEach((doc) => {
        const isCorrupt = doc.content === '[object Object]';
        const status = isCorrupt ? '❌ CORRUPT' : '✅ OK';
        const preview = doc.content.substring(0, 50).replace(/\n/g, ' ');
        
        console.log(`${status} ${doc.name}`);
        console.log(`   Length: ${doc.content_length} chars`);
        console.log(`   Type: ${doc.framework}`);
        console.log(`   Preview: ${preview}...`);
        
        if (doc.metadata.conversion_metadata) {
          const meta = doc.metadata.conversion_metadata;
          console.log(`   Method: ${meta.conversionMethod}`);
          console.log(`   Words: ${meta.wordCount}`);
          console.log(`   Quality: ${meta.quality}`);
        }
        console.log('');
      });
      
      lastDocCount = docs.rows.length;
    }

    // Show progress
    const progress = currentBatch.successful_files + currentBatch.failed_files;
    console.log(`📈 Progress: ${progress}/${currentBatch.total_files} | ✅ ${currentBatch.successful_files} | ❌ ${currentBatch.failed_files} | Status: ${currentBatch.status}`);

    // Check if batch is complete
    if (currentBatch.status === 'complete' || currentBatch.status === 'failed') {
      console.log('\n🎉 BATCH COMPLETE!');
      
      // Final summary
      const corruptDocs = docs.rows.filter(d => d.content === '[object Object]');
      const goodDocs = docs.rows.filter(d => d.content !== '[object Object]');
      
      console.log(`\n📊 FINAL RESULTS:`);
      console.log(`   ✅ Good documents: ${goodDocs.length}`);
      console.log(`   ❌ Corrupt documents: ${corruptDocs.length}`);
      
      if (corruptDocs.length > 0) {
        console.log('\n⚠️  WARNING: Still seeing corrupt documents!');
        console.log('   The buffer deserialization fix may need adjustment.');
      } else if (goodDocs.length > 0) {
        console.log('\n🎊 SUCCESS! All documents stored with proper Markdown content!');
        console.log('\n📄 Sample document:');
        const sample = goodDocs[0];
        console.log(`   Name: ${sample.name}`);
        console.log(`   Size: ${sample.content_length} chars`);
        console.log(`   Preview: ${sample.content.substring(0, 200).replace(/\n/g, ' ')}...`);
      }
      
      await pool.end();
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Monitor error:', error);
  }
}

console.log('🔍 Starting upload monitor...');
console.log('📡 Watching for document uploads...\n');

// Poll every 2 seconds
setInterval(monitorUpload, 2000);
monitorUpload(); // Run immediately

