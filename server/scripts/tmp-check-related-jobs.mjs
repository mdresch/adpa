import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const parentId = process.argv[2];
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const r = await pool.query(
  `SELECT id, type, status, progress, created_at, completed_at,
          data->>'parentJobId' as parent_job_id,
          data->>'documentId' as document_id
   FROM jobs
   WHERE data->>'parentJobId' = $1
      OR data->>'retryOf' = $1
      OR id = $1::uuid
   ORDER BY created_at`,
  [parentId]
);
console.log(JSON.stringify(r.rows, null, 2));

const docId = r.rows.find((j) => j.document_id)?.document_id
  || (await pool.query(
    `SELECT id FROM documents WHERE generation_metadata->>'job_id' = $1 LIMIT 1`,
    [parentId]
  )).rows[0]?.id;

if (docId) {
  const h8 = await pool.query(
    `SELECT (content ~ $2) as has_h8,
            length(content) as content_len,
            entity_counts
     FROM documents WHERE id = $1`,
    [docId, '^########\\s+[a-zA-Z0-9_-]+:']
  );
  console.log('DOCUMENT:', JSON.stringify(h8.rows[0], null, 2));
}

await pool.end();
