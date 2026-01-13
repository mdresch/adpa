const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
const { Pool } = require('pg')

const sql = `
CREATE TABLE IF NOT EXISTS public.governance_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  decision_id character varying(100) NULL,
  decision_type character varying(100) NULL,
  description text NULL,
  outcome character varying(50) NULL,
  rationale text NULL,
  decision_makers text[] NULL,
  decision_date timestamp with time zone NULL,
  implementation_status character varying(50) NULL,
  source_document_id uuid NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT governance_decisions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_governance_decisions_project_id ON public.governance_decisions USING btree (project_id);
`

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) { console.error('No DATABASE_URL'); process.exit(1) }
  const pool = new Pool({ connectionString, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false })
  try {
    console.log('Creating governance_decisions table directly...')
    await pool.query(sql)
    console.log('Create table command executed')
  } catch (err) {
    console.error('Failed to create table:', err.message || err)
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
}

run()
