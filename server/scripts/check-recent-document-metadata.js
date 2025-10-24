/**
 * Check the generation_metadata of the most recent document
 */
const { Pool } = require('pg');

async function checkMetadata() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set. Please provide a valid database connection string.');
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        generation_metadata,
        created_at
      FROM documents
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No documents found');
      return;
    }

    const doc = result.rows[0];
    console.log('\n📄 Latest Document:');
    console.log('  ID:', doc.id);
    console.log('  Name:', doc.name);
    console.log('  Created:', doc.created_at);
    console.log('\n📊 Generation Metadata:');
    console.log(JSON.stringify(doc.generation_metadata, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMetadata();

