/**
 * Update word_count and character_count for existing documents
 */
const { Pool } = require('pg');

async function updateDocumentStats() {
  // Load .env file
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Fetching documents with missing stats...');
    
    // Get all documents
    const result = await pool.query(`
      SELECT id, name, content
      FROM documents
      WHERE word_count IS NULL OR character_count IS NULL OR word_count = 0
      ORDER BY created_at DESC
    `);

    console.log(`📊 Found ${result.rows.length} documents to update`);

    if (result.rows.length === 0) {
      console.log('✅ All documents already have stats!');
      return;
    }

    let updated = 0;
    
    for (const doc of result.rows) {
      try {
        const content = doc.content || '';
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        const characterCount = content.length;

        await pool.query(`
          UPDATE documents
          SET word_count = $1, character_count = $2
          WHERE id = $3
        `, [wordCount, characterCount, doc.id]);

        updated++;
        console.log(`✅ Updated "${doc.name}": ${wordCount} words, ${characterCount} chars`);
      } catch (err) {
        console.error(`❌ Failed to update document ${doc.id}:`, err.message);
      }
    }

    console.log(`\n🎉 Successfully updated ${updated} out of ${result.rows.length} documents!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

updateDocumentStats();

