/**
 * Fix calculate_next_version function to use correct column name
 * Run with: npm run fix:version-function
 */
import { pool, connectDatabase } from '../src/database/connection'

const fixSQL = `
-- Fix calculate_next_version function to use correct column name
DROP FUNCTION IF EXISTS calculate_next_version(UUID, VARCHAR);

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
  -- Get current version (column is 'version', not 'version_number')
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
`

async function fix() {
  try {
    console.log('📊 Connecting to database...')
    await connectDatabase()
    console.log('✅ Connected!')
    
    console.log('🔄 Fixing calculate_next_version function...')
    await pool.query(fixSQL)
    console.log('✅ Function fixed! Now uses column "version" instead of "version_number"')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fix()

