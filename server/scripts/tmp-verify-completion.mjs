import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const jobId = process.argv[2] || '835863d2-3823-4306-8a61-1b274a13cd0e';
const docId = process.argv[3] || '43391f4c-f5d8-43af-93c6-33b830f1433a';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const jobs = await pool.query(
  `SELECT id, type, status, progress, error_message, created_at, completed_at,
          data->>'parentJobId' as parent, data->>'documentId' as doc
   FROM jobs
   WHERE type IN ('save-inline-entities', 'extract-project-data')
     AND (data->>'documentId' = $1 OR data->>'parentJobId' = $2)
   ORDER BY created_at`,
  [docId, jobId]
);
console.log('ENTITY_JOBS:', JSON.stringify(jobs.rows, null, 2));

const doc = await pool.query(
  `SELECT id, name, entity_counts,
          (content ~ '^########\\s+[a-zA-Z0-9_-]+:') as has_h8,
          length(content) as content_len
   FROM documents WHERE id = $1`,
  [docId]
);
console.log('DOC:', JSON.stringify(doc.rows[0], null, 2));

const contentRes = await pool.query('SELECT content FROM documents WHERE id = $1', [docId]);
const content = contentRes.rows[0]?.content || '';
const h8Lines = (content.match(/^########\s+[a-zA-Z0-9_-]+:/gm) || []).length;
console.log('H8_LINE_COUNT:', h8Lines);

const ents = await pool.query(
  `SELECT entity_type, COUNT(*)::int as cnt
   FROM entity_extractions
   WHERE document_id = $1 AND status != 'deleted'
   GROUP BY entity_type ORDER BY cnt DESC`,
  [docId]
);
console.log('ENTITY_EXTRACTIONS:', JSON.stringify(ents.rows, null, 2));

const total = await pool.query(
  `SELECT COUNT(*)::int as total FROM entity_extractions WHERE document_id = $1 AND status != 'deleted'`,
  [docId]
);
console.log('TOTAL_ENTITIES:', total.rows[0].total);

await pool.end();
