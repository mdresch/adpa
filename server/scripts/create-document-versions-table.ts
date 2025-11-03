/**
 * Create Document Versions Table
 * Migration 206: Add support for Smart Document Versioning
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl?.includes('supabase.co') || databaseUrl?.includes('azure') || process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})

async function createDocumentVersionsTable() {
  const client = await pool.connect()
  
  try {
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'document_versions'
      );
    `)
    
    const tableExists = tableCheck.rows[0].exists
    
    if (tableExists) {
      console.log('ℹ️ document_versions table already exists')
      
      // Check if semantic_version column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'document_versions' AND column_name = 'semantic_version';
      `)
      
      if (columnCheck.rows.length === 0) {
        console.log('🔄 Adding semantic_version column...')
        await client.query(`
          ALTER TABLE document_versions 
          ADD COLUMN IF NOT EXISTS semantic_version VARCHAR(20) NOT NULL DEFAULT '1.0.0';
        `)
        console.log('✅ semantic_version column added')
      } else {
        console.log('✅ semantic_version column already exists')
      }
      
      // Check other columns and add if missing
      const columnsToAdd = [
        { name: 'change_description', type: 'TEXT' },
        { name: 'change_type', type: "VARCHAR(50) CHECK (change_type IN ('ai_regeneration', 'manual_edit', 'template_change', 'baseline_approval'))" },
        { name: 'generation_metadata', type: 'JSONB' }
      ]
      
      for (const col of columnsToAdd) {
        const colCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'document_versions' AND column_name = $1;
        `, [col.name])
        
        if (colCheck.rows.length === 0) {
          console.log(`🔄 Adding ${col.name} column...`)
          await client.query(`ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`)
          console.log(`✅ ${col.name} column added`)
        }
      }
      
    } else {
      console.log('🔄 Creating document_versions table...')
      
      // Create document_versions table
      await client.query(`
        CREATE TABLE document_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            semantic_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
            
            -- Version content snapshot
            content JSONB NOT NULL,
            
            -- Version metadata
            created_by UUID REFERENCES users(id),
            created_at TIMESTAMP DEFAULT NOW(),
            
            -- Version description
            change_description TEXT,
            change_type VARCHAR(50) CHECK (change_type IN ('ai_regeneration', 'manual_edit', 'template_change', 'baseline_approval')),
            
            -- AI generation metadata (if applicable)
            generation_metadata JSONB,
            
            -- Constraints
            CONSTRAINT unique_document_version UNIQUE (document_id, version),
            CONSTRAINT unique_document_semantic_version UNIQUE (document_id, semantic_version)
        );
      `)
      
      console.log('✅ document_versions table created')
    }
    
    // Create indexes
    console.log('🔄 Creating indexes...')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_versions_document_id 
      ON document_versions(document_id);
    `)
    console.log('✅ idx_document_versions_document_id created')
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_versions_created_at 
      ON document_versions(created_at DESC);
    `)
    console.log('✅ idx_document_versions_created_at created')
    
    // Check if semantic_version column exists before creating index
    const semVerColCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'document_versions' AND column_name = 'semantic_version';
    `)
    
    if (semVerColCheck.rows.length > 0) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_document_versions_semantic_version 
        ON document_versions(document_id, semantic_version);
      `)
      console.log('✅ idx_document_versions_semantic_version created')
    } else {
      console.log('⚠️ semantic_version column not found, skipping index')
    }
    
    console.log('✅ All indexes created')
    
    // Add comments
    console.log('🔄 Adding table comments...')
    
    await client.query(`
      COMMENT ON TABLE document_versions IS 
      'Stores complete version history for documents including content snapshots and semantic versioning';
    `)
    
    await client.query(`
      COMMENT ON COLUMN document_versions.semantic_version IS 
      'Semantic version in MAJOR.MINOR.PATCH format (e.g., 1.2.3)';
    `)
    
    await client.query(`
      COMMENT ON COLUMN document_versions.change_type IS 
      'Type of change: ai_regeneration (minor), manual_edit (patch), template_change (major), baseline_approval (no version change)';
    `)
    
    console.log('✅ Comments added')
    
    // Verify table was created
    const result = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_versions' 
      ORDER BY ordinal_position;
    `)
    
    console.log('\n✅ document_versions table schema:')
    console.log('─'.repeat(60))
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(25)} ${row.data_type}`)
    })
    console.log('─'.repeat(60))
    
    console.log('\n🎉 Migration 206 completed successfully!')
    console.log('✅ Smart Document Versioning database setup complete')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the migration
console.log('🚀 Starting Migration 206: Create Document Versions Table')
console.log('─'.repeat(60))

createDocumentVersionsTable()
  .then(() => {
    console.log('\n✅ Migration complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })

