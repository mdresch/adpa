-- Migration 101: Add parent_document_id for document versioning
-- This migration adds support for storing regenerated documents as new documents
-- that link back to their parent/original document

-- Add parent_document_id column to documents table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'parent_document_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN parent_document_id UUID REFERENCES documents(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_document_id);
  END IF;
END $$;

-- Add is_regeneration flag to track AI-generated versions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'is_regeneration'
  ) THEN
    ALTER TABLE documents ADD COLUMN is_regeneration BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_documents_is_regeneration ON documents(is_regeneration);
  END IF;
END $$;

-- Add semantic_version column to store version strings like "1.0.1"
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'semantic_version'
  ) THEN
    ALTER TABLE documents ADD COLUMN semantic_version VARCHAR(20) DEFAULT '1.0.0';
  END IF;
END $$;

-- Add generation_metadata column to store AI generation details
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'generation_metadata'
  ) THEN
    ALTER TABLE documents ADD COLUMN generation_metadata JSONB;
  END IF;
END $$;

-- Update existing documents to have semantic_version if they don't have one
UPDATE documents 
SET semantic_version = COALESCE(version::TEXT, '1') || '.0.0'
WHERE semantic_version IS NULL OR semantic_version = '1.0.0';

-- Function to get all versions of a document (including parent and children)
CREATE OR REPLACE FUNCTION get_document_versions(p_document_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  semantic_version VARCHAR(20),
  content TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  author_id UUID,
  author_name TEXT,
  word_count INTEGER,
  is_regeneration BOOLEAN,
  generation_metadata JSONB,
  is_current BOOLEAN
) AS $$
DECLARE
  root_id UUID;
BEGIN
  -- Find the root document by traversing up the tree
  WITH RECURSIVE parent_tree AS (
    SELECT d.id, d.parent_document_id, 0 as depth
    FROM documents d
    WHERE d.id = p_document_id
    
    UNION ALL
    
    SELECT p.id, p.parent_document_id, pt.depth + 1
    FROM documents p
    INNER JOIN parent_tree pt ON p.id = pt.parent_document_id
    WHERE pt.parent_document_id IS NOT NULL
  )
  SELECT id INTO root_id
  FROM parent_tree
  WHERE parent_document_id IS NULL
  LIMIT 1;
  
  -- If no parent chain found, use the provided document as root
  IF root_id IS NULL THEN
    root_id := p_document_id;
  END IF;
  
  -- Return all documents in this version tree (root and all descendants)
  RETURN QUERY
  WITH RECURSIVE version_tree AS (
    SELECT d.id, d.name, d.semantic_version, d.content, d.created_at, d.updated_at, 
           d.created_by, d.author, d.word_count, d.is_regeneration, d.generation_metadata
    FROM documents d
    WHERE d.id = root_id
    
    UNION ALL
    
    SELECT d.id, d.name, d.semantic_version, d.content, d.created_at, d.updated_at,
           d.created_by, d.author, d.word_count, d.is_regeneration, d.generation_metadata
    FROM documents d
    INNER JOIN version_tree vt ON d.parent_document_id = vt.id
  )
  SELECT 
    vt.id,
    vt.name::TEXT,
    vt.semantic_version,
    vt.content,
    vt.created_at,
    vt.updated_at,
    vt.created_by as author_id,
    COALESCE(vt.author, u.name, 'System')::TEXT as author_name,
    COALESCE(vt.word_count, 0)::INTEGER as word_count,
    COALESCE(vt.is_regeneration, FALSE)::BOOLEAN as is_regeneration,
    vt.generation_metadata,
    (vt.id = p_document_id)::BOOLEAN as is_current
  FROM version_tree vt
  LEFT JOIN users u ON vt.created_by = u.id
  ORDER BY vt.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate next version for new document creation
CREATE OR REPLACE FUNCTION calculate_next_document_version(
  p_parent_document_id UUID,
  p_version_type VARCHAR(10)
) RETURNS VARCHAR(20) AS $$
DECLARE
  v_current_version VARCHAR(20);
  v_major INTEGER;
  v_minor INTEGER;
  v_patch INTEGER;
  v_parts TEXT[];
BEGIN
  -- Get the latest version from parent or any children
  SELECT semantic_version INTO v_current_version
  FROM documents
  WHERE id = p_parent_document_id 
     OR parent_document_id = p_parent_document_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Default to 1.0.0 if no version exists
  IF v_current_version IS NULL THEN
    v_current_version := '1.0.0';
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

COMMENT ON COLUMN documents.parent_document_id IS 'Links regenerated documents to their parent/original document';
COMMENT ON COLUMN documents.is_regeneration IS 'TRUE if this document was AI-generated from another document';
COMMENT ON COLUMN documents.semantic_version IS 'Semantic version string (e.g., 1.0.1, 1.2.0)';
COMMENT ON COLUMN documents.generation_metadata IS 'AI generation details (provider, model, temperature, context, etc.)';
COMMENT ON FUNCTION get_document_versions IS 'Returns all versions of a document including parent and children';
COMMENT ON FUNCTION calculate_next_document_version IS 'Calculates next semantic version for document regeneration';

