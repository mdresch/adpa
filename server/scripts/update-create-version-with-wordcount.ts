/**
 * Update create_document_version to calculate and store word_count
 */
import { pool, connectDatabase } from '../src/database/connection'

const updateSQL = `
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
  v_version_id := gen_random_uuid();
  
  -- Insert new document version with calculated word_count
  INSERT INTO document_versions (
    id,
    document_id,
    version,
    content,
    changes,
    author_id,
    word_count,
    created_at
  ) VALUES (
    v_version_id,
    p_document_id,
    p_version,
    p_content->>'content',
    p_change_summary,
    p_created_by,
    -- Calculate word count from content
    COALESCE(
      array_length(
        regexp_split_to_array(trim(p_content->>'content'), E'\\\\s+'), 
        1
      ), 
      0
    ),
    NOW()
  );
  
  -- Update main documents table with content
  UPDATE documents
  SET 
    content = p_content->>'content',
    updated_at = NOW()
  WHERE id = p_document_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;
`

async function update() {
  try {
    console.log('📊 Connecting...')
    await connectDatabase()
    console.log('🔄 Updating create_document_version to calculate word_count...')
    await pool.query(updateSQL)
    console.log('✅ Updated! Function now calculates and stores word_count')
    console.log('✅ Future versions will have accurate word counts')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

update()

