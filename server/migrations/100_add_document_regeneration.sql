-- Migration 100: Document Regeneration Jobs
-- This migration creates the infrastructure for tracking document version regeneration jobs
-- that use AI to regenerate documents with updated project context

-- Create regeneration_jobs table
CREATE TABLE IF NOT EXISTS regeneration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  version_type VARCHAR(10) NOT NULL CHECK (version_type IN ('patch', 'minor', 'major')),
  temperature DECIMAL(3, 2) DEFAULT 0.7,
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  new_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  context_summary JSONB,
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_regeneration_jobs_document_id ON regeneration_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_regeneration_jobs_user_id ON regeneration_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_regeneration_jobs_status ON regeneration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_regeneration_jobs_created_at ON regeneration_jobs(created_at DESC);

-- Function to calculate next version number with patch/minor support
CREATE OR REPLACE FUNCTION calculate_next_version(
  p_document_id UUID,
  p_version_type VARCHAR(10)
) RETURNS VARCHAR(20) AS $$
DECLARE
  v_current_version VARCHAR(20);
  v_major INTEGER;
  v_minor INTEGER;
  v_patch INTEGER;
  v_parts TEXT[];
BEGIN
  -- Get current version
  SELECT version INTO v_current_version
  FROM document_versions
  WHERE document_id = p_document_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no version exists, check documents table
  IF v_current_version IS NULL THEN
    SELECT version INTO v_current_version
    FROM documents
    WHERE id = p_document_id;
  END IF;
  
  -- Default to 1.0 if still no version
  IF v_current_version IS NULL THEN
    v_current_version := '1.0';
  END IF;
  
  -- Parse version number
  v_parts := string_to_array(v_current_version, '.');
  v_major := COALESCE(v_parts[1]::INTEGER, 1);
  v_minor := COALESCE(v_parts[2]::INTEGER, 0);
  v_patch := COALESCE(v_parts[3]::INTEGER, 0);
  
  -- Increment based on type
  IF p_version_type = 'major' THEN
    v_major := v_major + 1;
    v_minor := 0;
    v_patch := 0;
  ELSIF p_version_type = 'minor' THEN
    v_minor := v_minor + 1;
    v_patch := 0;
  ELSIF p_version_type = 'patch' THEN
    v_patch := v_patch + 1;
  END IF;
  
  -- Return formatted version
  RETURN CONCAT(v_major, '.', v_minor, '.', v_patch);
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old completed jobs (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_regeneration_jobs() RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM regeneration_jobs
  WHERE status IN ('completed', 'failed')
  AND completed_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create document versions
CREATE OR REPLACE FUNCTION create_document_version(
  p_document_id UUID,
  p_version VARCHAR(20),
  p_version_type VARCHAR(20),
  p_change_summary TEXT,
  p_change_reason VARCHAR(100),
  p_created_by UUID,
  p_content JSONB,
  p_metadata JSONB
) RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
BEGIN
  -- Generate new UUID for version
  v_version_id := gen_random_uuid();
  
  -- Insert new document version (without metadata column - doesn't exist in schema)
  INSERT INTO document_versions (
    id,
    document_id,
    version,
    content,
    changes,
    author_id,
    created_at
  ) VALUES (
    v_version_id,
    p_document_id,
    p_version,
    p_content->>'content',  -- Extract content string from JSONB
    p_change_summary,
    p_created_by,
    NOW()
  );
  
  -- Update the main documents table with content only
  -- (documents.version is INTEGER, document_versions.version is VARCHAR with semantic versioning)
  UPDATE documents
  SET 
    content = p_content->>'content',
    updated_at = NOW()
  WHERE id = p_document_id;
  
  -- Return the new version ID
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE regeneration_jobs IS 'Tracks document version regeneration jobs with AI and updated project context';
COMMENT ON FUNCTION calculate_next_version IS 'Calculates the next version number based on version type (major, minor, patch)';
COMMENT ON FUNCTION create_document_version IS 'Creates a new document version and updates the main document record';
COMMENT ON FUNCTION cleanup_old_regeneration_jobs IS 'Removes old completed/failed jobs older than 30 days';

