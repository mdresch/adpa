-- Migration: Compression Quality Assurance Tables
-- Description: Add tables for compression metrics, user feedback, and strategy optimization

-- Table for storing compression metrics
CREATE TABLE IF NOT EXISTS compression_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  strategy_used VARCHAR(50) NOT NULL,
  quality_metrics JSONB NOT NULL,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for user feedback on compression quality
CREATE TABLE IF NOT EXISTS compression_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  compression_method VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for compression strategies and their performance
CREATE TABLE IF NOT EXISTS compression_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method VARCHAR(50) UNIQUE NOT NULL,
  project_type VARCHAR(100),
  document_type VARCHAR(100),
  quality_metrics JSONB,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for workflow presets
CREATE TABLE IF NOT EXISTS workflow_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for workflow executions tracking
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  template_id UUID REFERENCES templates(id),
  project_id UUID REFERENCES projects(id),
  status VARCHAR(20) NOT NULL, -- 'running', 'completed', 'failed'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  processing_time_ms INTEGER,
  token_usage INTEGER,
  compression_stats JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for document versions
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  changes_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_compression_metrics_document_id ON compression_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_compression_metrics_strategy ON compression_metrics(strategy_used);
CREATE INDEX IF NOT EXISTS idx_compression_metrics_created_at ON compression_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_compression_feedback_document_id ON compression_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_compression_feedback_method ON compression_feedback(compression_method);
CREATE INDEX IF NOT EXISTS idx_compression_feedback_created_at ON compression_feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_compression_strategies_method ON compression_strategies(method);
CREATE INDEX IF NOT EXISTS idx_compression_strategies_project_type ON compression_strategies(project_type);
CREATE INDEX IF NOT EXISTS idx_compression_strategies_document_type ON compression_strategies(document_type);

CREATE INDEX IF NOT EXISTS idx_workflow_presets_category ON workflow_presets(category);
CREATE INDEX IF NOT EXISTS idx_workflow_presets_created_by ON workflow_presets(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_presets_public ON workflow_presets(is_public);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_template_id ON workflow_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_project_id ON workflow_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version ON document_versions(version);

-- Insert default compression strategies
INSERT INTO compression_strategies (method, project_type, document_type, quality_metrics, usage_count) VALUES
('truncate', 'general', 'general', '{"coherence": 0.6, "completeness": 0.4, "relevance": 0.5, "readability": 0.7, "overall": 0.55}', 0),
('summarize', 'general', 'general', '{"coherence": 0.8, "completeness": 0.7, "relevance": 0.8, "readability": 0.8, "overall": 0.78}', 0),
('smart', 'general', 'general', '{"coherence": 0.85, "completeness": 0.8, "relevance": 0.85, "readability": 0.8, "overall": 0.83}', 0),
('keyword', 'general', 'general', '{"coherence": 0.7, "completeness": 0.75, "relevance": 0.9, "readability": 0.7, "overall": 0.76}', 0)
ON CONFLICT (method) DO NOTHING;

-- Add columns to existing documents table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'version') THEN
        ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'parent_document_id') THEN
        ALTER TABLE documents ADD COLUMN parent_document_id UUID REFERENCES documents(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'compression_stats') THEN
        ALTER TABLE documents ADD COLUMN compression_stats JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'source_documents') THEN
        ALTER TABLE documents ADD COLUMN source_documents JSONB;
    END IF;
END $$;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_compression_metrics_updated_at BEFORE UPDATE ON compression_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compression_strategies_updated_at BEFORE UPDATE ON compression_strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_presets_updated_at BEFORE UPDATE ON workflow_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

