-- Evaluative Contextual Synthesis (ECS) System Database Schema
-- Advanced context-building system for AI providers

-- Project Dependencies Table
CREATE TABLE IF NOT EXISTS project_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) NOT NULL CHECK (dependency_type IN ('critical', 'high', 'medium', 'low')),
    traceability_path JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_project_id, target_project_id)
);

-- Critical Success Factors Table
CREATE TABLE IF NOT EXISTS critical_success_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
    impact_score DECIMAL(3,2) DEFAULT 1.0 CHECK (impact_score >= 0.0 AND impact_score <= 10.0),
    optical_spectrum INTEGER[] DEFAULT '{380, 450, 500, 550, 600, 650, 700, 750, 800, 850}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- KPIs Table
CREATE TABLE IF NOT EXISTS kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    unit VARCHAR(50),
    measurement_frequency VARCHAR(50) DEFAULT 'monthly',
    optical_spectrum INTEGER[] DEFAULT '{380, 450, 500, 550, 600, 650, 700, 750, 800, 850}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OKRs Table
CREATE TABLE IF NOT EXISTS okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    objective TEXT NOT NULL,
    key_results JSONB DEFAULT '[]',
    target_completion_date DATE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.0 CHECK (progress_percentage >= 0.0 AND progress_percentage <= 100.0),
    optical_spectrum INTEGER[] DEFAULT '{380, 450, 500, 550, 600, 650, 700, 750, 800, 850}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Requirements Traceability Table
CREATE TABLE IF NOT EXISTS requirements_traceability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    traceability_score DECIMAL(5,2) DEFAULT 0.0 CHECK (traceability_score >= 0.0 AND traceability_score <= 100.0),
    optical_spectrum INTEGER[] DEFAULT '{380, 450, 500, 550, 600, 650, 700, 750, 800, 850}',
    traceability_path JSONB DEFAULT '[]',
    dependencies JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Context Cache Table
CREATE TABLE IF NOT EXISTS document_context_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    importance_score DECIMAL(5,2) DEFAULT 0.0 CHECK (importance_score >= 0.0 AND importance_score <= 100.0),
    optical_spectrum INTEGER[] DEFAULT '{380, 450, 500, 550, 600, 650, 700, 750, 800, 850}',
    context_dimensions JSONB DEFAULT '[]',
    traceability_matrix JSONB DEFAULT '[]',
    dependencies JSONB DEFAULT '[]',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Provider Context Optimization Table
CREATE TABLE IF NOT EXISTS ai_provider_context_optimization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL,
    max_tokens INTEGER DEFAULT 4000,
    context_window VARCHAR(20) DEFAULT 'standard',
    optimization_config JSONB DEFAULT '{}',
    spectrum_focus INTEGER[] DEFAULT '{380, 450, 500, 550, 600, 650, 700, 750, 800, 850}',
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optical Spectrum Processing Log Table
CREATE TABLE IF NOT EXISTS optical_spectrum_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    spectrum_dimension VARCHAR(50) NOT NULL,
    processing_method VARCHAR(100) NOT NULL,
    processing_speed DECIMAL(15,2) DEFAULT 299792458, -- Speed of light
    processing_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_dependencies_source ON project_dependencies(source_project_id);
CREATE INDEX IF NOT EXISTS idx_project_dependencies_target ON project_dependencies(target_project_id);
CREATE INDEX IF NOT EXISTS idx_project_dependencies_type ON project_dependencies(dependency_type);

CREATE INDEX IF NOT EXISTS idx_critical_success_factors_project ON critical_success_factors(project_id);
CREATE INDEX IF NOT EXISTS idx_critical_success_factors_requirement ON critical_success_factors(requirement_id);
CREATE INDEX IF NOT EXISTS idx_critical_success_factors_priority ON critical_success_factors(priority);

CREATE INDEX IF NOT EXISTS idx_kpis_project ON kpis(project_id);
CREATE INDEX IF NOT EXISTS idx_kpis_requirement ON kpis(requirement_id);

CREATE INDEX IF NOT EXISTS idx_okrs_project ON okrs(project_id);
CREATE INDEX IF NOT EXISTS idx_okrs_requirement ON okrs(requirement_id);
CREATE INDEX IF NOT EXISTS idx_okrs_completion_date ON okrs(target_completion_date);

CREATE INDEX IF NOT EXISTS idx_requirements_traceability_requirement ON requirements_traceability(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirements_traceability_score ON requirements_traceability(traceability_score);

CREATE INDEX IF NOT EXISTS idx_document_context_cache_document ON document_context_cache(document_id);
CREATE INDEX IF NOT EXISTS idx_document_context_cache_project ON document_context_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_document_context_cache_importance ON document_context_cache(importance_score);
CREATE INDEX IF NOT EXISTS idx_document_context_cache_expires ON document_context_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_ai_provider_context_optimization_provider ON ai_provider_context_optimization(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_context_optimization_type ON ai_provider_context_optimization(provider_type);

CREATE INDEX IF NOT EXISTS idx_optical_spectrum_processing_log_document ON optical_spectrum_processing_log(document_id);
CREATE INDEX IF NOT EXISTS idx_optical_spectrum_processing_log_provider ON optical_spectrum_processing_log(provider_id);
CREATE INDEX IF NOT EXISTS idx_optical_spectrum_processing_log_created ON optical_spectrum_processing_log(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_dependencies_updated_at BEFORE UPDATE ON project_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_critical_success_factors_updated_at BEFORE UPDATE ON critical_success_factors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON kpis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_okrs_updated_at BEFORE UPDATE ON okrs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requirements_traceability_updated_at BEFORE UPDATE ON requirements_traceability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_context_cache_updated_at BEFORE UPDATE ON document_context_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_provider_context_optimization_updated_at BEFORE UPDATE ON ai_provider_context_optimization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default optical spectrum configurations
INSERT INTO ai_provider_context_optimization (provider_id, provider_type, max_tokens, context_window, optimization_config, spectrum_focus)
SELECT 
    id,
    provider_type,
    CASE 
        WHEN provider_type = 'openai' THEN 16000
        WHEN provider_type = 'google' THEN 32000
        WHEN provider_type = 'azure' THEN 8000
        ELSE 4000
    END,
    CASE 
        WHEN provider_type = 'openai' THEN 'large'
        WHEN provider_type = 'google' THEN 'extra_large'
        WHEN provider_type = 'azure' THEN 'medium'
        ELSE 'standard'
    END,
    CASE 
        WHEN provider_type = 'openai' THEN '{"optimization": "gpt4_optimized", "temperature": 0.7, "top_p": 0.9}'
        WHEN provider_type = 'google' THEN '{"optimization": "gemini_optimized", "temperature": 0.8, "top_p": 0.95}'
        WHEN provider_type = 'azure' THEN '{"optimization": "azure_optimized", "temperature": 0.6, "top_p": 0.85}'
        ELSE '{"optimization": "generic_optimized", "temperature": 0.7, "top_p": 0.9}'
    END::jsonb,
    CASE 
        WHEN provider_type = 'openai' THEN ARRAY[380, 400, 450, 500, 550]
        WHEN provider_type = 'google' THEN ARRAY[450, 500, 550, 600, 650, 700, 750]
        WHEN provider_type = 'azure' THEN ARRAY[600, 650, 700, 750, 800, 850]
        ELSE ARRAY[380, 450, 500, 550, 600, 650, 700, 750, 800, 850]
    END
FROM ai_providers 
WHERE is_active = true
ON CONFLICT DO NOTHING;
