/**
 * Update Content Metrics for Existing Documents
 * 
 * Calculates and stores sentence_count and paragraph_count for existing documents
 * that are missing these metrics.
 * 
 * Usage: node scripts/update-content-metrics.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function updateContentMetrics() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: true }
      : false
  });

  try {
    console.log('🔍 Fetching documents with missing content metrics...');
    
    // Get documents that don't have sentence_count or paragraph_count
    const result = await pool.query(`
      SELECT id, name, content
      FROM documents
      WHERE (sentence_count IS NULL OR sentence_count = 0 
             OR paragraph_count IS NULL OR paragraph_count = 0)
        AND content IS NOT NULL
        AND content != ''
      ORDER BY created_at DESC
    `);

    const documents = result.rows;
    console.log(`📊 Found ${documents.length} documents to update\n`);

    if (documents.length === 0) {
      console.log('✅ All documents already have content metrics!');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
        const content = doc.content || '';
        
        // Calculate metrics
        const sentenceCount = (content.match(/[.!?]+/g) || []).length;
        const paragraphCount = (content.match(/\n\n/g) || []).length + 1;
        
        // Update document
        await pool.query(
          `UPDATE documents 
           SET sentence_count = $1, paragraph_count = $2 
           WHERE id = $3`,
          [sentenceCount, paragraphCount, doc.id]
        );

        updated++;
        console.log(`✅ [${updated}/${documents.length}] Updated "${doc.name || doc.id}": ${sentenceCount} sentences, ${paragraphCount} paragraphs`);
      } catch (err) {
        errors++;
        console.error(`❌ Failed to update "${doc.name || doc.id}":`, err.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Update Complete!`);
    console.log(`   ✅ Successfully updated: ${updated} documents`);
    if (errors > 0) {
      console.log(`   ❌ Failed: ${errors} documents`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
updateContentMetrics();

