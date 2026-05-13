-- Migration: 401_semantic_processing_job_ids_text
-- Purpose: Store queue / correlation job ids as TEXT (Bull/Rabbit job ids are not UUIDs)

ALTER TABLE semantic_processing_status
  ALTER COLUMN extraction_job_id TYPE TEXT USING extraction_job_id::text,
  ALTER COLUMN gkg_sync_job_id TYPE TEXT USING gkg_sync_job_id::text;

COMMENT ON COLUMN semantic_processing_status.extraction_job_id IS 'Queue job id or correlation id for extraction (TEXT)';
COMMENT ON COLUMN semantic_processing_status.gkg_sync_job_id IS 'Queue job id or correlation id for GKG sync (TEXT)';
