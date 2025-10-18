-- Migration: Add 'generated' status for automated documents
-- Date: 2025-10-17
-- Purpose: Distinguish AI-generated documents requiring review from reviewed/published documents

-- Add 'generated' status to documents table status constraint
-- This allows for a clear workflow: generated → reviewed → published

-- First, drop the existing constraint if it exists
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_status_check;

-- Add new constraint with 'generated' and 'uploaded' status
-- Status workflow:
--   uploaded: Manually uploaded by user (pre-reviewed, bypasses AI workflow)
--   generated: AI-generated, requires human review
--   draft: Manual draft or work-in-progress
--   under_review: Currently being reviewed by stakeholders
--   reviewed: Reviewed and approved by author
--   published: Finalized and shared with team
--   archived: No longer active but kept for reference
ALTER TABLE documents 
ADD CONSTRAINT documents_status_check 
CHECK (status IN ('uploaded', 'generated', 'draft', 'under_review', 'reviewed', 'published', 'archived'));

-- Update existing documents with no status to 'draft'
UPDATE documents 
SET status = 'draft' 
WHERE status IS NULL OR status = '';

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Create index for finding documents needing review
CREATE INDEX IF NOT EXISTS idx_documents_review_queue ON documents(status, created_at)
WHERE status IN ('generated', 'under_review');

-- Add comment to status column for documentation
COMMENT ON COLUMN documents.status IS 'Document status: uploaded (manually uploaded, pre-reviewed), generated (AI-created, needs review), draft (manual work), under_review (stakeholder review), reviewed (approved by author), published (finalized), archived (inactive)';

-- Add review tracking columns if they don't exist
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS upload_source VARCHAR(100); -- Track where uploaded docs came from (e.g., 'manual_upload', 'sharepoint', 'github', etc.)

COMMENT ON COLUMN documents.upload_source IS 'For uploaded documents: source of upload (manual_upload, sharepoint, github, confluence, etc.)';

-- Create function to auto-track status transitions
CREATE OR REPLACE FUNCTION track_document_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- For uploaded documents: auto-set reviewed_at since they're pre-reviewed
  IF NEW.status = 'uploaded' AND (OLD.status IS NULL OR OLD.status != 'uploaded') THEN
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = NEW.created_by; -- Uploader is the reviewer
  END IF;
  
  -- Track when document is reviewed
  IF NEW.status = 'reviewed' AND OLD.status != 'reviewed' THEN
    NEW.reviewed_at = NOW();
    IF NEW.reviewed_by IS NULL THEN
      NEW.reviewed_by = NEW.created_by; -- Default to author if not specified
    END IF;
  END IF;
  
  -- Track when document is published
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_at = NOW();
    IF NEW.published_by IS NULL THEN
      NEW.published_by = NEW.created_by; -- Default to author if not specified
    END IF;
  END IF;
  
  -- Update updated_at timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status tracking
DROP TRIGGER IF EXISTS trigger_track_document_status ON documents;
CREATE TRIGGER trigger_track_document_status
  BEFORE UPDATE ON documents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION track_document_status_changes();

-- Add migration record
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('013', 'Add generated status for AI documents and review workflow', NOW())
ON CONFLICT (version) DO NOTHING;

-- Create view for documents requiring review with comprehensive metadata
CREATE OR REPLACE VIEW documents_review_queue AS
SELECT 
  d.id,
  d.name,
  d.status,
  d.created_at,
  d.updated_at,
  d.created_by,
  u.name as author_name,
  u.email as author_email,
  d.project_id,
  p.name as project_name,
  p.description as project_description,
  d.template_id,
  t.name as template_name,
  t.framework as template_framework,
  t.category as template_category,
  t.tags as template_tags,
  t.version as template_version,
  d.word_count,
  d.character_count,
  d.version as document_version,
  -- Metadata extraction
  d.metadata->>'category' as category,
  d.metadata->'document'->>'framework' as framework,
  (d.metadata->'document'->'tags')::jsonb as tags,
  d.metadata->'quality_metrics'->>'overall_score' as quality_score,
  d.metadata->'ai_usage'->>'provider_used' as ai_provider,
  d.metadata->'ai_usage'->>'model_used' as ai_model,
  d.metadata->'ai_usage'->>'total_tokens' as tokens_used,
  d.metadata->'ai_usage'->>'estimated_cost_usd' as generation_cost,
  d.metadata->'pipeline'->>'total_duration_seconds' as processing_time,
  d.metadata->'file_metrics'->>'file_size_kb' as file_size_kb,
  -- Calculate age and SLA
  NOW() - d.created_at as age,
  EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 3600 as age_hours,
  CASE 
    WHEN d.status = 'generated' AND EXTRACT(EPOCH FROM (NOW() - d.created_at)) > 172800 THEN 'overdue' -- > 48 hours
    WHEN d.status = 'generated' AND EXTRACT(EPOCH FROM (NOW() - d.created_at)) > 86400 THEN 'approaching' -- > 24 hours
    WHEN d.status = 'under_review' AND EXTRACT(EPOCH FROM (NOW() - d.created_at)) > 432000 THEN 'overdue' -- > 5 days
    ELSE 'on_time'
  END as sla_status
FROM documents d
LEFT JOIN users u ON d.created_by = u.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN templates t ON d.template_id = t.id
WHERE d.status IN ('generated', 'under_review')
ORDER BY d.created_at ASC; -- Oldest first (FIFO)

COMMENT ON VIEW documents_review_queue IS 'Documents requiring human review with template info, quality metrics, and SLA tracking (excludes uploaded documents which are pre-reviewed), ordered by creation time (oldest first)';

-- Create separate view for uploaded documents with comprehensive metadata
CREATE OR REPLACE VIEW documents_uploaded AS
SELECT 
  d.id,
  d.name,
  d.status,
  d.created_at,
  d.updated_at,
  d.created_by,
  u.name as uploader_name,
  u.email as uploader_email,
  d.project_id,
  p.name as project_name,
  p.description as project_description,
  d.template_id,
  t.name as template_name,
  t.framework as template_framework,
  t.category as template_category,
  t.tags as template_tags,
  d.word_count,
  d.character_count,
  d.version,
  d.upload_source,
  d.reviewed_at,
  d.reviewed_by,
  reviewer.name as reviewer_name,
  d.published_at,
  d.published_by,
  publisher.name as publisher_name,
  -- Metadata extraction
  d.metadata->>'category' as category,
  d.metadata->'document'->>'framework' as framework,
  (d.metadata->'document'->'tags')::jsonb as tags,
  d.metadata->'author'->>'name' as author_name,
  d.metadata->'file_metrics'->>'file_size_kb' as file_size_kb,
  d.metadata->'file_metrics'->>'file_hash' as file_hash,
  -- Calculate age
  NOW() - d.created_at as age
FROM documents d
LEFT JOIN users u ON d.created_by = u.id
LEFT JOIN users reviewer ON d.reviewed_by = reviewer.id
LEFT JOIN users publisher ON d.published_by = publisher.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN templates t ON d.template_id = t.id
WHERE d.status = 'uploaded'
ORDER BY d.created_at DESC;

COMMENT ON VIEW documents_uploaded IS 'Manually uploaded documents with template info and metadata (pre-reviewed, bypass AI workflow)';

-- Create comprehensive view for ALL documents with rich metadata
CREATE OR REPLACE VIEW documents_with_metadata AS
SELECT 
  d.id,
  d.name,
  d.status,
  d.created_at,
  d.updated_at,
  d.created_by,
  creator.name as creator_name,
  creator.email as creator_email,
  d.project_id,
  p.name as project_name,
  p.description as project_description,
  d.template_id,
  t.name as template_name,
  t.framework as template_framework,
  t.category as template_category,
  t.tags as template_tags,
  t.version as template_version,
  d.word_count,
  d.character_count,
  d.version as document_version,
  d.upload_source,
  d.reviewed_at,
  d.reviewed_by,
  reviewer.name as reviewer_name,
  d.published_at,
  d.published_by,
  publisher.name as publisher_name,
  d.review_notes,
  -- Metadata extraction
  d.metadata->>'category' as category,
  d.metadata->'document'->>'framework' as framework,
  (d.metadata->'document'->'tags')::jsonb as tags,
  d.metadata->'author'->>'name' as author_name,
  d.metadata->'quality_metrics'->>'overall_score' as quality_score,
  d.metadata->'ai_usage'->>'provider_used' as ai_provider,
  d.metadata->'ai_usage'->>'model_used' as ai_model,
  d.metadata->'ai_usage'->>'total_tokens' as tokens_used,
  d.metadata->'ai_usage'->>'estimated_cost_usd' as generation_cost,
  d.metadata->'pipeline'->>'total_duration_seconds' as processing_time,
  d.metadata->'file_metrics'->>'file_size_kb' as file_size_kb,
  d.metadata->'file_metrics'->>'file_hash' as file_hash,
  -- Status indicators
  CASE 
    WHEN d.status = 'uploaded' THEN '📤 Uploaded (Pre-Reviewed)'
    WHEN d.status = 'generated' THEN '🤖 Generated (Needs Review)'
    WHEN d.status = 'draft' THEN '📝 Draft'
    WHEN d.status = 'under_review' THEN '👥 Under Review'
    WHEN d.status = 'reviewed' THEN '✅ Reviewed'
    WHEN d.status = 'published' THEN '📢 Published'
    WHEN d.status = 'archived' THEN '📦 Archived'
  END as status_label,
  -- Calculate age
  NOW() - d.created_at as age,
  EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 3600 as age_hours,
  -- SLA status for documents needing review
  CASE 
    WHEN d.status = 'generated' AND EXTRACT(EPOCH FROM (NOW() - d.created_at)) > 172800 THEN 'overdue'
    WHEN d.status = 'generated' AND EXTRACT(EPOCH FROM (NOW() - d.created_at)) > 86400 THEN 'approaching'
    WHEN d.status = 'under_review' AND EXTRACT(EPOCH FROM (NOW() - d.created_at)) > 432000 THEN 'overdue'
    WHEN d.status IN ('uploaded', 'reviewed', 'published') THEN 'n/a'
    ELSE 'on_time'
  END as sla_status,
  -- Source type
  CASE 
    WHEN d.status = 'uploaded' THEN 'user_upload'
    WHEN d.status = 'generated' THEN 'ai_generated'
    ELSE 'manual'
  END as source_type
FROM documents d
LEFT JOIN users creator ON d.created_by = creator.id
LEFT JOIN users reviewer ON d.reviewed_by = reviewer.id
LEFT JOIN users publisher ON d.published_by = publisher.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN templates t ON d.template_id = t.id
ORDER BY d.created_at DESC;

COMMENT ON VIEW documents_with_metadata IS 'All documents with comprehensive metadata including template info, quality metrics, AI usage, and SLA tracking';

