import { pool, connectDatabase } from '../src/database/connection'

async function fixTable() {
  try {
    await connectDatabase()
    
    console.log('🔧 Fixing best_practices table...')
    
    // Drop old table if exists
    await pool!.query(`DROP TABLE IF EXISTS best_practices CASCADE`)
    console.log('✅ Dropped old best_practices table')
    
    // Recreate with correct schema
    await pool!.query(`
      CREATE TABLE best_practices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        source VARCHAR(255),
        applicability TEXT,
        implementation_notes TEXT,
        extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
        confidence_score DECIMAL(3, 2) DEFAULT 0.85,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `)
    console.log('✅ Recreated best_practices table with project_id')
    
    // Create index
    await pool!.query(`CREATE INDEX IF NOT EXISTS idx_best_practices_project_id ON best_practices(project_id)`)
    console.log('✅ Created index on project_id')
    
    console.log('\n🎉 best_practices table is now ready!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Fix failed:', error)
    process.exit(1)
  }
}

fixTable()

