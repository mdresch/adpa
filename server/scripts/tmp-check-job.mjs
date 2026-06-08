import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const jobId = process.argv[2] || '333b0ebc-65e3-492e-b0da-7724590b551d';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const jobRes = await pool.query(
  'SELECT id, status, type, progress, error_message, result, created_at, completed_at FROM jobs WHERE id = $1',
  [jobId]
);
console.log('JOB:', JSON.stringify(jobRes.rows[0], null, 2));

const job = jobRes.rows[0];
let docId = job?.result?.documentId;
if (!docId) {
  const docByJob = await pool.query(
    `SELECT id, name, entity_counts, generation_metadata FROM documents WHERE generation_metadata->>'job_id' = $1 LIMIT 1`,
    [jobId]
  );
  if (docByJob.rows[0]) {
    const row = docByJob.rows[0];
    docId = row.id;
    const meta = typeof row.generation_metadata === 'string' ? JSON.parse(row.generation_metadata) : row.generation_metadata;
    console.log('DOC:', JSON.stringify({ id: row.id, name: row.name, entity_counts: row.entity_counts, contextMatchingScore: meta?.contextMatchingScore }, null, 2));
  }
} else {
  const docRes = await pool.query(
    'SELECT id, name, entity_counts, generation_metadata FROM documents WHERE id = $1',
    [docId]
  );
  const row = docRes.rows[0];
  if (row) {
    const meta = typeof row.generation_metadata === 'string' ? JSON.parse(row.generation_metadata) : row.generation_metadata;
    console.log('DOC:', JSON.stringify({ id: row.id, name: row.name, entity_counts: row.entity_counts, contextMatchingScore: meta?.contextMatchingScore }, null, 2));
  }
}

if (docId) {
  const ents = await pool.query(
    `SELECT entity_type, COUNT(*)::int as cnt FROM entity_extractions WHERE document_id = $1 AND status != 'deleted' GROUP BY entity_type ORDER BY cnt DESC`,
    [docId]
  );
  console.log('ENTITY_EXTRACTIONS:', JSON.stringify(ents.rows, null, 2));
  const total = await pool.query(
    `SELECT COUNT(*)::int as total FROM entity_extractions WHERE document_id = $1 AND status != 'deleted'`,
    [docId]
  );
  console.log('TOTAL_ENTITIES:', total.rows[0].total);
} else {
  console.log('DOC: not created yet');
}

await pool.end();
