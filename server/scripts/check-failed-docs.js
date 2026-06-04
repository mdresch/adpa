const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Querying last 10 documents...');
  try {
    const res = await pool.query(`
      SELECT id, name, status, SUBSTRING(content FROM 1 FOR 200) as content_preview, updated_at 
      FROM documents 
      ORDER BY updated_at DESC 
      LIMIT 10
    `);
    
    res.rows.forEach((doc, idx) => {
      console.log(`${idx + 1}. ID: ${doc.id} | Name: ${doc.name} | Status: ${doc.status} | Updated: ${doc.updated_at}`);
      console.log(`   Preview: ${doc.content_preview ? doc.content_preview.replace(/\n/g, ' ') : '(empty)'}`);
    });
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
