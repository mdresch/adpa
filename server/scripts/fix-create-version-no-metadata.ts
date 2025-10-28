/**
 * Fix create_document_version to not use metadata column (doesn't exist)
 */
import { pool, connectDatabase } from '../src/database/connection'

const fixSQL = `
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
  
  -- Insert new document version (without metadata - column doesn't exist)
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
    p_content->>'content',
    p_change_summary,
    p_created_by,
    NOW()
  );
  
  -- Update the main documents table with the new version
  UPDATE documents
  SET 
    version = p_version,
    content = p_content->>'content',
    updated_at = NOW()
  WHERE id = p_document_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;
`

async function fix() {
  try {
    console.log('📊 Connecting...')
    await connectDatabase()
    console.log('🔄 Fixing create_document_version (removing metadata column)...')
    await pool.query(fixSQL)
    console.log('✅ Fixed! Function now works without metadata column')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fix()

