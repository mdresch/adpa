import { pool, connectDatabase } from '../src/database/connection'
import * as fs from 'fs'
import * as path from 'path'

async function updateFunction() {
  console.log('🔧 Updating get_document_versions function...')
  await connectDatabase()
  
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
`
  
  await pool.query(functionSQL)
  
  console.log('✅ Function updated successfully!')
  console.log('')
  console.log('Changes:')
  console.log('  - Now uses recursive CTE to find root document')
  console.log('  - Traverses entire version tree (not just one level)')
  console.log('  - Returns ALL versions from root to deepest child')
  
  await pool.end()
}

updateFunction().catch(console.error)

