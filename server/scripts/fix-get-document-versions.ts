import { pool, connectDatabase } from '../src/database/connection'

async function fixFunction() {
  try {
    console.log('📊 Connecting to database...')
    await connectDatabase()
    
    console.log('🔧 Dropping old function...')
    await pool.query('DROP FUNCTION IF EXISTS get_document_versions(UUID)')
    
    console.log('✨ Creating fixed function...')
    const functionSQL = `
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
BEGIN
  RETURN QUERY
  WITH base_doc AS (
    -- Find the root parent document
    SELECT COALESCE(
      (SELECT d1.id FROM documents d1 WHERE d1.id = (SELECT d2.parent_document_id FROM documents d2 WHERE d2.id = p_document_id)),
      p_document_id
    ) as root_id
  )
  SELECT 
    d.id,
    d.name::TEXT,
    d.semantic_version,
    d.content,
    d.created_at,
    d.updated_at,
    d.created_by as author_id,
    COALESCE(d.author, u.name, 'System')::TEXT as author_name,
    COALESCE(d.word_count, 0)::INTEGER as word_count,
    COALESCE(d.is_regeneration, FALSE)::BOOLEAN as is_regeneration,
    d.generation_metadata,
    (d.id = p_document_id)::BOOLEAN as is_current
  FROM documents d
  LEFT JOIN users u ON d.created_by = u.id,
  base_doc
  WHERE d.id = base_doc.root_id
     OR d.parent_document_id = base_doc.root_id
     OR d.id = p_document_id
  ORDER BY d.created_at ASC;
END;
$$ LANGUAGE plpgsql;
    `
    
    await pool.query(functionSQL)
    
    console.log('✅ Function fixed successfully!')
    console.log('')
    console.log('Testing function...')
    
    // Test the function with the document ID from the error
    const testResult = await pool.query(
      `SELECT * FROM get_document_versions('67746659-62ff-45af-b081-52466d05cbc5'::UUID)`
    )
    
    console.log(`✅ Test successful! Found ${testResult.rows.length} version(s):`)
    testResult.rows.forEach(row => {
      console.log(`   - ${row.semantic_version}: ${row.name} (${row.word_count} words)`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixFunction()

