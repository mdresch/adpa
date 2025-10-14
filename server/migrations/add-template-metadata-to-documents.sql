-- Add Template Metadata to Documents
-- Stores comprehensive template information with each generated document

-- Add template metadata columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS template_version VARCHAR(50),
ADD COLUMN IF NOT EXISTS template_author VARCHAR(255),
ADD COLUMN IF NOT EXISTS template_framework VARCHAR(100),
ADD COLUMN IF NOT EXISTS template_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS template_complexity VARCHAR(50),
ADD COLUMN IF NOT EXISTS template_metadata JSONB,
ADD COLUMN IF NOT EXISTS generation_metadata JSONB;

-- Add index for template queries
CREATE INDEX IF NOT EXISTS idx_documents_template_id ON documents(template_id);
CREATE INDEX IF NOT EXISTS idx_documents_template_framework ON documents(template_framework);
CREATE INDEX IF NOT EXISTS idx_documents_generation_metadata ON documents USING gin(generation_metadata);

-- Add template usage tracking
CREATE TABLE IF NOT EXISTS template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generation_time_ms INTEGER,
  word_count INTEGER,
  quality_score INTEGER,
  ai_provider VARCHAR(100),
  ai_model VARCHAR(100),
  token_count INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Add indexes for analytics
CREATE INDEX IF NOT EXISTS idx_template_usage_template_id ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_used_at ON template_usage(used_at DESC);
CREATE INDEX IF NOT EXISTS idx_template_usage_user_id ON template_usage(user_id);

-- Create view for template statistics
CREATE OR REPLACE VIEW template_statistics AS
SELECT 
  t.id,
  t.name,
  t.framework,
  t.category,
  (t.content::jsonb -> 'metadata' ->> 'version') as version,
  t.created_at,
  t.updated_at,
  t.created_by,
  u.name as author_name,
  COUNT(DISTINCT tu.document_id) as total_uses,
  COUNT(DISTINCT tu.user_id) as unique_users,
  AVG(tu.generation_time_ms) as avg_generation_time_ms,
  AVG(tu.word_count) as avg_word_count,
  AVG(tu.quality_score) as avg_quality_score,
  MAX(tu.used_at) as last_used,
  COUNT(CASE WHEN tu.success = true THEN 1 END) as successful_generations,
  COUNT(CASE WHEN tu.success = false THEN 1 END) as failed_generations
FROM templates t
LEFT JOIN users u ON t.created_by = u.id
LEFT JOIN template_usage tu ON t.id = tu.template_id
GROUP BY t.id, t.name, t.framework, t.category, t.created_at, t.updated_at, t.created_by, u.name;

-- Add comments for documentation
COMMENT ON COLUMN documents.template_version IS 'Version of the template used to generate this document';
COMMENT ON COLUMN documents.template_author IS 'Author of the template';
COMMENT ON COLUMN documents.template_framework IS 'Framework (PMBOK, BABOK, DMBOK, etc.)';
COMMENT ON COLUMN documents.template_category IS 'Category (Integration Management, etc.)';
COMMENT ON COLUMN documents.template_complexity IS 'Complexity level (basic, intermediate, advanced)';
COMMENT ON COLUMN documents.template_metadata IS 'Full template metadata snapshot at generation time';
COMMENT ON COLUMN documents.generation_metadata IS 'AI generation metadata (tokens, quality, performance)';

COMMENT ON TABLE template_usage IS 'Tracks every template usage for analytics and usage patterns';
COMMENT ON VIEW template_statistics IS 'Aggregated statistics for template usage and performance';

