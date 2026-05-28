require('dotenv').config();
const { Pool } = require('pg');

async function checkDoc() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  try {
    const result = await pool.query(
      `SELECT id, name, generation_metadata, created_at 
       FROM documents 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      const doc = result.rows[0];
      console.log(`Document ID: ${doc.id}`);
      console.log(`Name: ${doc.name}`);
      console.log(`Created At: ${doc.created_at}`);
      console.log(`Generation Metadata:`, JSON.stringify(doc.generation_metadata, null, 2));
    }
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await pool.end();
  }
}

checkDoc();
