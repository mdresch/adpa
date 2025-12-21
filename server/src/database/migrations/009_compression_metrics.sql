-- Migration: Create compression_metrics table for tracking document compression analytics
-- Date: 2025-10-13
-- Description: Stores metrics about document compression operations including quality scores and processing times

CREATE TABLE IF NOT EXISTS compression_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    strategy_used VARCHAR(50) NOT NULL,  -- e.g., 'summarize', 'extract', 'hybrid'
    quality_metrics JSONB DEFAULT '{}'::jsonb,  -- Stores coherence, completeness, relevance, readability scores
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries by document and date
CREATE INDEX IF NOT EXISTS idx_compression_metrics_document_id ON compression_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_compression_metrics_created_at ON compression_metrics(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE compression_metrics IS 'Stores analytics about document compression operations';
COMMENT ON COLUMN compression_metrics.document_id IS 'Reference to the compressed document (nullable for temp/test compressions)';
COMMENT ON COLUMN compression_metrics.strategy_used IS 'Compression method: summarize, extract, hybrid, etc.';
COMMENT ON COLUMN compression_metrics.quality_metrics IS 'JSON object with coherence, completeness, relevance, readability scores (0-1)';
COMMENT ON COLUMN compression_metrics.processing_time_ms IS 'Time taken to compress the document in milliseconds';

