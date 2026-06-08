import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const originalId = process.argv[2] || '333b0ebc-65e3-492e-b0da-7724590b551d';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const res = await pool.query(
  `SELECT id, status, progress, data->>'currentStep' as current_step, error_message,
          data->>'retryOf' as retry_of,
          data->'llmProgressSteps' as llm_steps,
          jsonb_array_length(COALESCE(data->'llm_insights'->'requests', '[]'::jsonb)) as llm_count,
          created_at, processing_started_at
   FROM jobs
   WHERE data->>'retryOf' = $1
      OR id = $1::uuid
   ORDER BY created_at DESC
   LIMIT 5`,
  [originalId]
);
console.log(JSON.stringify(res.rows, null, 2));

const latest = await pool.query(
  `SELECT id, status, progress, data->>'currentStep' as current_step, data->'llmProgressSteps' as llm_steps
   FROM jobs
   WHERE type = 'ai-generate'
     AND created_by = (SELECT created_by FROM jobs WHERE id = $1::uuid LIMIT 1)
     AND created_at > (SELECT created_at FROM jobs WHERE id = $1::uuid LIMIT 1)
   ORDER BY created_at DESC
   LIMIT 1`,
  [originalId]
);
if (latest.rows[0]) {
  console.log('NEWEST_RETRY:', JSON.stringify(latest.rows[0], null, 2));
}

await pool.end();
