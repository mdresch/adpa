-- Create extraction_failures table for production monitoring and error recovery
-- Phase 1.2 of Extraction Service Refactoring
-- Purpose: Dead-letter queue for failed extractions, enables debugging and retry logic

CREATE TABLE IF NOT EXISTS extraction_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace JSONB,
    ai_provider VARCHAR(50),
    ai_model VARCHAR(100),
    ai_response_raw TEXT,
    correlation_id VARCHAR(100),
    retry_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'retried', 'resolved', 'abandoned')),
    retry_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extraction_failures_project_id ON extraction_failures(project_id);
CREATE INDEX IF NOT EXISTS idx_extraction_failures_correlation_id ON extraction_failures(correlation_id);
CREATE INDEX IF NOT EXISTS idx_extraction_failures_entity_type ON extraction_failures(entity_type);
CREATE INDEX IF NOT EXISTS idx_extraction_failures_created_at ON extraction_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_extraction_failures_status ON extraction_failures(status);
CREATE INDEX IF NOT EXISTS idx_extraction_failures_retry_at ON extraction_failures(retry_at);

-- Composite index for common queries: find pending failures by project
CREATE INDEX IF NOT EXISTS idx_extraction_failures_pending_by_project 
  ON extraction_failures(project_id, status) WHERE status = 'pending';
