import { pool, connectDatabase } from './src/database/connection';

async function search() {
  await connectDatabase();
  const projectId = '9ad00240-4dd8-4e83-9333-89515c2422f0';
  const res = await pool.query(
    `SELECT id, name, status, word_count, character_count, length(content) as content_len, created_at, updated_at 
     FROM documents 
     WHERE project_id = $1 
     ORDER BY updated_at DESC`,
    [projectId]
  );
  
  console.log(`=== ALL DOCUMENTS FOR PROJECT ${projectId} ===`);
  console.log(`Found ${res.rows.length} documents.`);
  res.rows.forEach((doc, i) => {
    console.log(`\nDoc ${i+1}:`);
    console.log(`ID: ${doc.id}`);
    console.log(`Name: ${doc.name}`);
    console.log(`Status: ${doc.status}`);
    console.log(`Word Count: ${doc.word_count}`);
    console.log(`Char Count: ${doc.character_count}`);
    console.log(`Content Len: ${doc.content_len}`);
    console.log(`Created: ${doc.created_at}`);
    console.log(`Updated: ${doc.updated_at}`);
  });

  await pool.end();
}

search().catch(e => {
  console.error(e);
  process.exit(1);
});
