-- 417_clear_stuck_pipeline_jobs.sql
-- Create types and tables first
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adpa_job_status') THEN
        CREATE TYPE adpa_job_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'TIMEOUT');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS adpa_pipeline_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    rule_code VARCHAR(100),
    document_type VARCHAR(50) NOT NULL,
    job_state adpa_job_status DEFAULT 'QUEUED',
    attempt_count INT DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adpa_jobs_state_updated ON adpa_pipeline_jobs(job_state, updated_at);

CREATE TABLE IF NOT EXISTS template_extracted_entities (
    entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code VARCHAR(100) REFERENCES policy_library(rule_code),
    entity_type VARCHAR(50) NOT NULL, -- 'STAKEHOLDER', 'REQUIREMENT', 'CONSTRAINT'
    extracted_name TEXT NOT NULL,
    structural_payload JSONB NOT NULL, -- Houses specific metadata fields parsed by LLM
    metadata_hash VARCHAR(64) NOT NULL, -- SHA-256 string for batch deduplication validation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_entity_hash UNIQUE (rule_code, metadata_hash)
);

-- 1. Un-choke the system by moving dead legacy records to an audible timeout state
UPDATE adpa_pipeline_jobs
SET job_state = 'TIMEOUT',
    error_log = 'Pipeline forced termination: Job exceeded maximum threshold runtime limits.'
WHERE job_state = 'PROCESSING'
  AND updated_at < (CURRENT_TIMESTAMP - INTERVAL '15 minutes');

-- 2. Build a standalone maintenance function to automate this cleanup behavior out-of-band
CREATE OR REPLACE FUNCTION fn_reap_orphaned_pipeline_jobs()
RETURNS VOID AS $$
BEGIN
    UPDATE adpa_pipeline_jobs
    SET job_state = 'TIMEOUT',
        error_log = 'Automated system reaping: State marked dead after out-of-bounds execution duration.'
    WHERE job_state = 'PROCESSING'
      AND updated_at < (CURRENT_TIMESTAMP - INTERVAL '15 minutes');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_reap_orphaned_pipeline_jobs() IS 'Periodically purges hanging database queue tasks to protect operational developer velocity channels.';
