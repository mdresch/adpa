-- Migration: Create pipeline processing tables
-- These tables store the state and execution details of the 6-stage document processing pipeline
-- Created: 2024-01-15

-- Pipeline executions table - stores overall pipeline job information
CREATE TABLE IF NOT EXISTS pipeline_executions (
    job_id UUID PRIMARY KEY,
    request_id UUID NOT NULL,
    template_id UUID,
    project_id UUID,
    user_id UUID,
    
    -- Status and progress
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress NUMERIC(5,2) DEFAULT 0,
    current_stage VARCHAR(100),
    stages_completed TEXT[] DEFAULT '{}',
    stages_remaining TEXT[] DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    estimated_completion TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Quality and results
    overall_quality_score NUMERIC(3,2),
    final_document_id UUID,
    
    -- Configuration
    processing_config JSONB DEFAULT '{}',
    enhancement_config JSONB DEFAULT '{}',
    quality_config JSONB DEFAULT '{}',
    output_config JSONB DEFAULT '{}',
    
    -- Error handling
    error TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100),
    CONSTRAINT valid_quality_score CHECK (overall_quality_score IS NULL OR (overall_quality_score >= 0 AND overall_quality_score <= 1))
);

-- Stage executions table - stores individual stage execution details
CREATE TABLE IF NOT EXISTS stage_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES pipeline_executions(job_id) ON DELETE CASCADE,
    stage_id VARCHAR(100) NOT NULL,
    stage_type VARCHAR(100) NOT NULL,
    
    -- Status and progress
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    execution_time BIGINT,  -- Changed from INTEGER to BIGINT for large execution times
    quality_score NUMERIC(5,2),  -- Changed from (3,2) to (5,2) to allow values 0-100
    
    -- Data
    input_data JSONB,
    output_data JSONB,
    metadata JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    
    CONSTRAINT valid_stage_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    CONSTRAINT valid_stage_quality_score CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1))
);

-- Pipeline configurations table - stores reusable pipeline configurations
CREATE TABLE IF NOT EXISTS pipeline_configurations (
    pipeline_id VARCHAR(100) PRIMARY KEY,
    pipeline_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuration
    stages JSONB NOT NULL,
    global_config JSONB DEFAULT '{}',
    quality_gates JSONB DEFAULT '[]',
    monitoring_config JSONB DEFAULT '{}',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys after table creation (optional - will succeed if reference tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
        ALTER TABLE pipeline_executions DROP CONSTRAINT IF EXISTS fk_pipeline_executions_template_id;
        ALTER TABLE pipeline_executions ADD CONSTRAINT fk_pipeline_executions_template_id
            FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE pipeline_executions DROP CONSTRAINT IF EXISTS fk_pipeline_executions_project_id;
        ALTER TABLE pipeline_executions ADD CONSTRAINT fk_pipeline_executions_project_id
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE pipeline_executions DROP CONSTRAINT IF EXISTS fk_pipeline_executions_user_id;
        ALTER TABLE pipeline_executions ADD CONSTRAINT fk_pipeline_executions_user_id
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            
        ALTER TABLE pipeline_configurations DROP CONSTRAINT IF EXISTS fk_pipeline_configurations_created_by;
        ALTER TABLE pipeline_configurations ADD CONSTRAINT fk_pipeline_configurations_created_by
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for pipeline_executions
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_user_id ON pipeline_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_status ON pipeline_executions(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_template_id ON pipeline_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_project_id ON pipeline_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_created_at ON pipeline_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_executions_user_status ON pipeline_executions(user_id, status, created_at DESC);

-- Indexes for stage_executions
CREATE INDEX IF NOT EXISTS idx_stage_executions_job_id ON stage_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_stage_executions_stage_id ON stage_executions(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_executions_status ON stage_executions(status);
CREATE INDEX IF NOT EXISTS idx_stage_executions_job_stage ON stage_executions(job_id, stage_id, created_at DESC);

-- Indexes for pipeline_configurations
CREATE INDEX IF NOT EXISTS idx_pipeline_configurations_active ON pipeline_configurations(is_active);

-- Trigger to automatically update updated_at timestamp for pipeline_executions
CREATE OR REPLACE FUNCTION update_pipeline_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_pipeline_executions_updated_at ON pipeline_executions;
CREATE TRIGGER trg_update_pipeline_executions_updated_at
    BEFORE UPDATE ON pipeline_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_executions_updated_at();

-- Trigger to automatically update updated_at timestamp for pipeline_configurations
DROP TRIGGER IF EXISTS trg_update_pipeline_configurations_updated_at ON pipeline_configurations;
CREATE TRIGGER trg_update_pipeline_configurations_updated_at
    BEFORE UPDATE ON pipeline_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_pipeline_executions_updated_at();

-- Comments for documentation
COMMENT ON TABLE pipeline_executions IS 'Stores overall pipeline job execution state and progress';
COMMENT ON TABLE stage_executions IS 'Stores individual stage execution details within a pipeline job';
COMMENT ON TABLE pipeline_configurations IS 'Stores reusable pipeline configurations';

COMMENT ON COLUMN pipeline_executions.job_id IS 'Unique identifier for the pipeline job';
COMMENT ON COLUMN pipeline_executions.request_id IS 'Request identifier for tracking';
COMMENT ON COLUMN pipeline_executions.status IS 'Current status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN pipeline_executions.progress IS 'Overall progress percentage (0-100)';
COMMENT ON COLUMN pipeline_executions.current_stage IS 'Currently executing stage';
COMMENT ON COLUMN pipeline_executions.overall_quality_score IS 'Overall quality score (0-1)';

COMMENT ON COLUMN stage_executions.stage_id IS 'Stage identifier (e.g., context_gathering)';
COMMENT ON COLUMN stage_executions.stage_type IS 'Type of stage';
COMMENT ON COLUMN stage_executions.execution_time IS 'Stage execution time in milliseconds';
COMMENT ON COLUMN stage_executions.quality_score IS 'Stage quality score (0-1)';

