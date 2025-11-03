/**
 * Migration Script: Create calculate_next_document_version Function
 * Purpose: Add PostgreSQL function to calculate semantic version increments
 * Date: 2025-11-03
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Disable TLS certificate validation globally for this script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const migrationSQL = `
-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS calculate_next_document_version(UUID, VARCHAR);

-- Create the version calculation function
CREATE OR REPLACE FUNCTION calculate_next_document_version(
  p_document_id UUID,
  p_increment_type VARCHAR(10) -- 'major', 'minor', or 'patch'
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_version VARCHAR(20);
  v_major INTEGER;
  v_minor INTEGER;
  v_patch INTEGER;
  v_next_version VARCHAR(20);
BEGIN
  -- Get current version from document
  SELECT version INTO v_current_version
  FROM documents
  WHERE id = p_document_id;
  
  -- Handle NULL or missing version (default to 1.0.0)
  IF v_current_version IS NULL OR v_current_version = '' THEN
    v_current_version := '1.0.0';
  END IF;
  
  -- Parse semantic version (handles "1", "1.0", "1.0.0" formats)
  -- Split by dots and cast to integers
  DECLARE
    v_parts TEXT[];
  BEGIN
    v_parts := string_to_array(v_current_version, '.');
    
    v_major := COALESCE(v_parts[1]::INTEGER, 1);
    v_minor := COALESCE(v_parts[2]::INTEGER, 0);
    v_patch := COALESCE(v_parts[3]::INTEGER, 0);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to 1.0.0 if parsing fails
    v_major := 1;
    v_minor := 0;
    v_patch := 0;
  END;
  
  -- Increment based on type
  CASE p_increment_type
    WHEN 'major' THEN
      v_major := v_major + 1;
      v_minor := 0;
      v_patch := 0;
    WHEN 'minor' THEN
      v_minor := v_minor + 1;
      v_patch := 0;
    WHEN 'patch' THEN
      v_patch := v_patch + 1;
    ELSE
      -- Default to patch if invalid type
      v_patch := v_patch + 1;
  END CASE;
  
  -- Build next version string
  v_next_version := v_major || '.' || v_minor || '.' || v_patch;
  
  RETURN v_next_version;
END;
$$;

-- Add comment
COMMENT ON FUNCTION calculate_next_document_version(UUID, VARCHAR) IS 
'Calculates the next semantic version for a document based on increment type (major/minor/patch)';
`

async function runMigration() {
  const databaseUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL
  
  if (!databaseUrl) {
    throw new Error('No database connection string found! Set POSTGRES_URL_NON_POOLING or DATABASE_URL')
  }

  console.log(`🔍 Using connection: ${databaseUrl.substring(0, 40)}...`)
  console.log(`🔐 SSL Check: supabase=${databaseUrl.includes('supabase.co')}, neon=${databaseUrl.includes('neon.tech')}, DB_SSL=${process.env.DB_SSL}`)

  // Determine if SSL is needed
  const needsSSL = databaseUrl.includes('supabase') || 
                   databaseUrl.includes('neon.tech') || 
                   databaseUrl.includes('amazonaws') ||
                   process.env.DB_SSL === 'true' ||
                   databaseUrl.includes('sslmode=require')
  
  console.log(`🔐 SSL Mode: ${needsSSL ? 'ENABLED (rejectUnauthorized: false)' : 'DISABLED'}`)

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    max: 5,
    connectionTimeoutMillis: 30000
  })

  try {
    console.log('🔄 Connecting to database...')
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    console.log('✅ Connected successfully!')

    console.log('🔄 Creating calculate_next_document_version function...')
    await pool.query(migrationSQL)
    console.log('✅ Function created successfully!')

    // Test the function
    console.log('🧪 Testing the function...')
    const testResult = await pool.query(`
      SELECT 
        calculate_next_document_version(
          (SELECT id FROM documents WHERE version IS NOT NULL LIMIT 1),
          'patch'
        ) as test_version
    `)
    
    if (testResult.rows.length > 0) {
      console.log('✅ Function test passed! Sample result:', testResult.rows[0].test_version)
    } else {
      console.log('⚠️  No documents found to test with, but function is created')
    }

    console.log('')
    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Restart the backend server')
    console.log('   2. Edit a document in the UI')
    console.log('   3. Verify version increments (1.0.0 → 1.0.1)')

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error('')
    console.error('Stack trace:', error.stack)
    process.exit(1)
  } finally {
    await pool.end()
    console.log('')
    console.log('🔌 Database connection closed')
  }
}

// Run the migration
runMigration()

