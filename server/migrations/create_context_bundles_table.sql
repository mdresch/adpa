-- Migration: Create Context Bundles Table
-- Description: Creates table for storing context injection bundles
-- Date: 2024-01-XX
-- Version: 1.0.0

-- Create context_bundles table
CREATE TABLE IF NOT EXISTS context_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    project_id UUID,
    user_id UUID NOT NULL,
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    injection_strategy VARCHAR(50) NOT NULL DEFAULT 'prepend',
    max_context_length INTEGER NOT NULL DEFAULT 4000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_context_bundles_template 
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    CONSTRAINT fk_context_bundles_project 
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_context_bundles_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_context_bundles_template_id 
    ON context_bundles (template_id);

CREATE INDEX IF NOT EXISTS idx_context_bundles_project_id 
    ON context_bundles (project_id);

CREATE INDEX IF NOT EXISTS idx_context_bundles_user_id 
    ON context_bundles (user_id);

CREATE INDEX IF NOT EXISTS idx_context_bundles_created_at 
    ON context_bundles (created_at);

CREATE INDEX IF NOT EXISTS idx_context_bundles_results 
    ON context_bundles USING GIN (results);

CREATE INDEX IF NOT EXISTS idx_context_bundles_metadata 
    ON context_bundles USING GIN (metadata);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_context_bundles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_context_bundles_updated_at
    BEFORE UPDATE ON context_bundles
    FOR EACH ROW
    EXECUTE FUNCTION update_context_bundles_updated_at();

-- Add comments to document the table
COMMENT ON TABLE context_bundles IS 'Stores context injection bundles for AI-enhanced document generation';
COMMENT ON COLUMN context_bundles.id IS 'Unique identifier for the context bundle';
COMMENT ON COLUMN context_bundles.template_id IS 'Reference to the template this bundle was created for';
COMMENT ON COLUMN context_bundles.project_id IS 'Reference to the project context (optional)';
COMMENT ON COLUMN context_bundles.user_id IS 'Reference to the user who created this bundle';
COMMENT ON COLUMN context_bundles.results IS 'JSON array of context results from various sources';
COMMENT ON COLUMN context_bundles.metadata IS 'JSON object containing bundle metadata and statistics';
COMMENT ON COLUMN context_bundles.injection_strategy IS 'Strategy used for context injection (prepend, append, interleave, structured)';
COMMENT ON COLUMN context_bundles.max_context_length IS 'Maximum context length in characters';
COMMENT ON COLUMN context_bundles.created_at IS 'Timestamp when the bundle was created';
COMMENT ON COLUMN context_bundles.updated_at IS 'Timestamp when the bundle was last updated';

-- Create a view for context bundle analysis
CREATE OR REPLACE VIEW context_bundles_analysis AS
SELECT 
    cb.id,
    cb.template_id,
    t.name as template_name,
    cb.project_id,
    p.name as project_name,
    cb.user_id,
    u.name as user_name,
    cb.injection_strategy,
    cb.max_context_length,
    cb.created_at,
    cb.updated_at,
    
    -- Extract metrics from metadata
    (cb.metadata->>'total_sources')::integer as total_sources,
    (cb.metadata->>'successful_sources')::integer as successful_sources,
    (cb.metadata->>'failed_sources')::integer as failed_sources,
    (cb.metadata->>'total_size_bytes')::bigint as total_size_bytes,
    (cb.metadata->>'processing_time_ms')::integer as processing_time_ms,
    
    -- Calculate derived metrics
    CASE 
        WHEN (cb.metadata->>'total_sources')::integer > 0 
        THEN (cb.metadata->>'successful_sources')::integer::float / (cb.metadata->>'total_sources')::integer
        ELSE 0 
    END as success_rate,
    
    -- Count context results
    jsonb_array_length(cb.results) as context_results_count,
    
    -- Check if bundle has errors
    EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(cb.results) as result
        WHERE result->'errors' IS NOT NULL 
        AND jsonb_array_length(result->'errors') > 0
    ) as has_errors,
    
    -- Check if bundle has warnings
    EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(cb.results) as result
        WHERE result->'warnings' IS NOT NULL 
        AND jsonb_array_length(result->'warnings') > 0
    ) as has_warnings

FROM context_bundles cb
LEFT JOIN templates t ON cb.template_id = t.id
LEFT JOIN projects p ON cb.project_id = p.id
LEFT JOIN users u ON cb.user_id = u.id;

-- Grant permissions on the view
GRANT SELECT ON context_bundles_analysis TO authenticated_users;

-- Create function to get context bundle statistics
CREATE OR REPLACE FUNCTION get_context_bundle_stats(
    template_id_param UUID DEFAULT NULL,
    project_id_param UUID DEFAULT NULL,
    user_id_param UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_bundles BIGINT,
    successful_bundles BIGINT,
    failed_bundles BIGINT,
    average_processing_time_ms NUMERIC,
    average_success_rate NUMERIC,
    total_context_sources BIGINT,
    average_context_size_bytes NUMERIC,
    most_used_strategy TEXT,
    error_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_bundles,
        COUNT(*) FILTER (WHERE (metadata->>'successful_sources')::integer > 0) as successful_bundles,
        COUNT(*) FILTER (WHERE (metadata->>'failed_sources')::integer > 0) as failed_bundles,
        AVG((metadata->>'processing_time_ms')::integer) as average_processing_time_ms,
        AVG(
            CASE 
                WHEN (metadata->>'total_sources')::integer > 0 
                THEN (metadata->>'successful_sources')::integer::float / (metadata->>'total_sources')::integer
                ELSE 0 
            END
        ) as average_success_rate,
        SUM((metadata->>'total_sources')::integer) as total_context_sources,
        AVG((metadata->>'total_size_bytes')::bigint) as average_context_size_bytes,
        MODE() WITHIN GROUP (ORDER BY injection_strategy) as most_used_strategy,
        AVG(
            CASE 
                WHEN (metadata->>'total_sources')::integer > 0 
                THEN (metadata->>'failed_sources')::integer::float / (metadata->>'total_sources')::integer
                ELSE 0 
            END
        ) as error_rate
    FROM context_bundles
    WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day' * days_back
    AND (template_id_param IS NULL OR template_id = template_id_param)
    AND (project_id_param IS NULL OR project_id = project_id_param)
    AND (user_id_param IS NULL OR user_id = user_id_param);
END;
$$ LANGUAGE plpgsql;

-- Log the migration completion
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    'create_context_bundles_table', 
    CURRENT_TIMESTAMP, 
    'Created context_bundles table with indexes, triggers, views, and analysis functions'
) ON CONFLICT DO NOTHING;
