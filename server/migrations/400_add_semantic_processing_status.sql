-- Migration: 400_add_semantic_processing_status
-- Purpose: Add semantic processing state tracking for onboarding documents
-- Supports async pipeline: upload → convert → extract → persist → GKG sync

-- Semantic processing status enum
DO $$ BEGIN
    CREATE TYPE semantic_processing_state AS ENUM (
        'uploaded',           -- File uploaded, not yet processed
        'converted',          -- Converted to Markdown
        'queued_extraction',  -- Queued for entity extraction
        'extracting',         -- Entity extraction in progress
        'extracted',          -- Entity extraction complete
        'queued_gkg_sync',    -- Queued for GKG synchronization
        'syncing',            -- GKG sync in progress
        'synced',             -- GKG sync complete (terminal success)
        'failed',             -- Processing failed (retryable)
        'retrying'            -- Retry in progress
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Semantic processing status table (document-level tracking)
CREATE TABLE IF NOT EXISTS semantic_processing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES upload_batches(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Current state
    state semantic_processing_state NOT NULL DEFAULT 'uploaded',
    
    -- Stage timestamps for traceability
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    extraction_started_at TIMESTAMPTZ,
    extraction_completed_at TIMESTAMPTZ,
    gkg_sync_started_at TIMESTAMPTZ,
    gkg_sync_completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_retry_at TIMESTAMPTZ,
    
    -- Job tracking
    extraction_job_id UUID,
    gkg_sync_job_id UUID,
    
    -- Extraction results summary
    extraction_summary JSONB,  -- { entity_counts: {...}, domains_processed: [...] }
    
    -- GKG sync results
    gkg_sync_summary JSONB,    -- { nodes_created: N, relationships: N, ... }
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_document_processing UNIQUE (document_id)
);

-- Batch-level semantic processing summary
CREATE TABLE IF NOT EXISTS semantic_processing_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Aggregate status
    total_documents INT NOT NULL DEFAULT 0,
    documents_converted INT DEFAULT 0,
    documents_extracted INT DEFAULT 0,
    documents_synced INT DEFAULT 0,
    documents_failed INT DEFAULT 0,
    
    -- Overall state (derived from document states)
    overall_state VARCHAR(50) NOT NULL DEFAULT 'processing',
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Aggregate results
    total_entities_extracted INT DEFAULT 0,
    total_gkg_nodes_created INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_batch_processing UNIQUE (batch_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_semantic_status_document ON semantic_processing_status(document_id);
CREATE INDEX IF NOT EXISTS idx_semantic_status_batch ON semantic_processing_status(batch_id);
CREATE INDEX IF NOT EXISTS idx_semantic_status_project ON semantic_processing_status(project_id);
CREATE INDEX IF NOT EXISTS idx_semantic_status_state ON semantic_processing_status(state);
CREATE INDEX IF NOT EXISTS idx_semantic_status_created ON semantic_processing_status(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_semantic_batch_batch ON semantic_processing_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_semantic_batch_project ON semantic_processing_batches(project_id);
CREATE INDEX IF NOT EXISTS idx_semantic_batch_state ON semantic_processing_batches(overall_state);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_semantic_processing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS semantic_processing_status_updated ON semantic_processing_status;
CREATE TRIGGER semantic_processing_status_updated
    BEFORE UPDATE ON semantic_processing_status
    FOR EACH ROW
    EXECUTE FUNCTION update_semantic_processing_timestamp();

DROP TRIGGER IF EXISTS semantic_processing_batches_updated ON semantic_processing_batches;
CREATE TRIGGER semantic_processing_batches_updated
    BEFORE UPDATE ON semantic_processing_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_semantic_processing_timestamp();

-- Add column to documents table to link semantic processing (if not exists)
DO $$ BEGIN
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS semantic_processing_id UUID REFERENCES semantic_processing_status(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

COMMENT ON TABLE semantic_processing_status IS 'Tracks semantic processing lifecycle for individual documents: upload → convert → extract → GKG sync';
COMMENT ON TABLE semantic_processing_batches IS 'Aggregate semantic processing status at batch level for onboarding visibility';
COMMENT ON COLUMN semantic_processing_status.state IS 'Current processing state: uploaded, converted, queued_extraction, extracting, extracted, queued_gkg_sync, syncing, synced, failed, retrying';
COMMENT ON COLUMN semantic_processing_status.extraction_summary IS 'JSON summary of extraction results: entity counts, domains processed';
COMMENT ON COLUMN semantic_processing_status.gkg_sync_summary IS 'JSON summary of GKG sync results: nodes created, relationships';
