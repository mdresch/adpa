require('dotenv').config();
const { pool } = require('../src/database/connection');

async function getLatestDoc() {
  try {
    const result = await pool.query(
      `SELECT id, name, content, metadata, generation_metadata, created_at 
       FROM documents 
       ORDER BY created_at DESC 
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log("No documents found in database.");
      return;
    }

    const doc = result.rows[0];
    console.log("=========================================");
    console.log(`Document ID: ${doc.id}`);
    console.log(`Document Name: ${doc.name}`);
    console.log(`Created At: ${doc.created_at}`);
    console.log("=========================================");
    console.log("CONTENT SNIPPET / METADATA:");
    console.log(doc.content.substring(0, 1500));
    console.log("...");
    console.log("=========================================");
    console.log("END OF CONTENT (Checking H8 tags):");
    console.log(doc.content.substring(Math.max(0, doc.content.length - 1500)));
    console.log("=========================================");
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    await pool.end();
  }
}

getLatestDoc();
