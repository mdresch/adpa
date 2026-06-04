import { pool, connectDatabase } from './src/database/connection';

async function check() {
  await connectDatabase();
  
  const ids = [
    { id: '4c04f981-d419-4b68-ab69-26d2f50ee393', name: 'Ideation Document' },
    { id: '7a437bae-9c5d-4f75-bc55-aa12ceba29ca', name: 'Business Case' }
  ];

  for (const doc of ids) {
    const res = await pool.query(
      `SELECT id, name, status, word_count, character_count, length(content) as content_len, substring(content, 1, 200) as preview
       FROM documents WHERE id = $1`,
      [doc.id]
    );
    console.log(`\n=== CURRENT DOC: ${doc.name} ===`);
    if (res.rows.length === 0) {
      console.log("Not found in database");
    } else {
      console.log(JSON.stringify(res.rows[0], null, 2));
    }
  }

  await pool.end();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
