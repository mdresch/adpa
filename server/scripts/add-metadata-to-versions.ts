/**
 * Add metadata column to document_versions table and update function
 */
import { pool, connectDatabase } from '../src/database/connection'

const updateSQL = `
-- Add metadata column to document_versions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_versions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE document_versions ADD COLUMN metadata JSONB;
    COMMENT ON COLUMN document_versions.metadata IS 'Version-specific metadata (AI provider, model, temperature, context, etc.)';
  END IF;
END $$;

-- Update create_document_version function to store metadata
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
  
  -- Insert new document version with content, word_count, and metadata
  INSERT INTO document_versions (
    id,
    document_id,
    version,
    content,
    changes,
    author_id,
    word_count,
    metadata,
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
    p_metadata,
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
    console.log('🔄 Adding metadata column to document_versions...')
    await pool.query(updateSQL)
    console.log('✅ Metadata column added!')
    console.log('✅ create_document_version function updated to store metadata')
    console.log('\n📝 Metadata can now include:')
    console.log('   - AI provider and model used')
    console.log('   - Temperature and parameters')
    console.log('   - Context summary (documents, stakeholders, baselines)')
    console.log('   - Generation timestamp')
    console.log('   - Source documents included')
    console.log('   - Token usage and cost')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

update()

