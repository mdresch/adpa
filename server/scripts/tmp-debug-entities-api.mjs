import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const docId = process.argv[2] || '43391f4c-f5d8-43af-93c6-33b830f1433a';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const entities = await pool.query(
    `SELECT id, entity_type, entity_name, entity_data, document_id, status
     FROM entity_extractions
     WHERE status != 'deleted' AND document_id = $1`,
    [docId]
  );
  console.log('ENTITY_COUNT:', entities.rows.length);
  for (const row of entities.rows) {
    console.log('---');
    console.log('id:', row.id);
    console.log('entity_type:', row.entity_type, typeof row.entity_type);
    console.log('entity_name:', row.entity_name);
    console.log('entity_data type:', typeof row.entity_data);
    if (typeof row.entity_data === 'string') {
      try {
        JSON.parse(row.entity_data);
        console.log('entity_data: valid JSON string');
      } catch (e) {
        console.log('entity_data: INVALID JSON string', row.entity_data?.slice?.(0, 100));
      }
    }
    try {
      row.entity_type.toLowerCase();
    } catch (e) {
      console.log('BUG: entity_type.toLowerCase() throws', e.message);
    }
    try {
      const data = typeof row.entity_data === 'string' ? JSON.parse(row.entity_data) : row.entity_data;
      const obj = { id: row.id, name: row.entity_name, ...data };
      console.log('spread ok, keys:', Object.keys(obj).length);
    } catch (e) {
      console.log('BUG: spread entity_data throws', e.message);
    }
  }

  const doc = await pool.query(
    'SELECT id, name, project_id, generation_metadata FROM documents WHERE id = $1',
    [docId]
  );
  const document = doc.rows[0];
  console.log('DOC:', document ? { id: document.id, name: document.name } : null);
  if (document?.generation_metadata) {
    try {
      const meta = typeof document.generation_metadata === 'string'
        ? JSON.parse(document.generation_metadata)
        : document.generation_metadata;
      console.log('metadata parse ok, keys:', Object.keys(meta).slice(0, 10));
    } catch (e) {
      console.log('BUG: generation_metadata JSON.parse throws', e.message);
      console.log('raw prefix:', String(document.generation_metadata).slice(0, 200));
    }
  }
} catch (err) {
  console.error('QUERY_FAILED:', err.message);
} finally {
  await pool.end();
}
