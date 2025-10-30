import { pool, connectDatabase } from '../src/database/connection'

async function runMigration() {
  try {
    console.log('🔧 Connecting to database...')
    await connectDatabase()

    console.log('🚀 Running migration 104: Create extraction tables...')
    
    // Split commands can't be run all at once due to CREATE EXTENSION
    await pool!.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    console.log('✅ Extension enabled')

    // Run each table creation separately to avoid multi-statement issues
    const tables = [
      {
        name: 'stakeholders',
        sql: `CREATE TABLE IF NOT EXISTS stakeholders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          role VARCHAR(255),
          interest VARCHAR(50) CHECK (interest IN ('high', 'medium', 'low')),
          influence VARCHAR(50) CHECK (influence IN ('high', 'medium', 'low')),
          contact_info TEXT,
          expectations TEXT,
          engagement_strategy TEXT,
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE(project_id, name)
        )`
      },
      {
        name: 'requirements',
        sql: `CREATE TABLE IF NOT EXISTS requirements (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          type VARCHAR(50) CHECK (type IN ('functional', 'non-functional', 'business', 'technical', 'quality')),
          priority VARCHAR(50) CHECK (priority IN ('critical', 'high', 'medium', 'low')),
          status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'approved', 'implemented', 'verified')),
          acceptance_criteria TEXT,
          source VARCHAR(255),
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'risks',
        sql: `CREATE TABLE IF NOT EXISTS risks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          probability VARCHAR(50) CHECK (probability IN ('very_high', 'high', 'medium', 'low', 'very_low')),
          impact VARCHAR(50) CHECK (impact IN ('very_high', 'high', 'medium', 'low', 'very_low')),
          severity VARCHAR(50) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
          mitigation_strategy TEXT,
          contingency_plan TEXT,
          owner UUID REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'assessed', 'mitigated', 'closed')),
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'milestones',
        sql: `CREATE TABLE IF NOT EXISTS milestones (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          due_date DATE,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')),
          deliverables TEXT[],
          dependencies TEXT[],
          completion_criteria TEXT,
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'constraints',
        sql: `CREATE TABLE IF NOT EXISTS constraints (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          description TEXT,
          type VARCHAR(100) CHECK (type IN ('technical', 'budget', 'time', 'resource', 'regulatory', 'business', 'environmental')),
          severity VARCHAR(50) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
          impact_area TEXT,
          workaround TEXT,
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'success_criteria',
        sql: `CREATE TABLE IF NOT EXISTS success_criteria (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          criterion VARCHAR(500) NOT NULL,
          description TEXT,
          measurement_method VARCHAR(255),
          target_value VARCHAR(100),
          current_value VARCHAR(100),
          status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'achieved', 'at_risk', 'not_achieved')),
          category VARCHAR(100),
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'best_practices',
        sql: `CREATE TABLE IF NOT EXISTS best_practices (
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
        )`
      },
      {
        name: 'phases',
        sql: `CREATE TABLE IF NOT EXISTS phases (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          start_date DATE,
          end_date DATE,
          status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'planning', 'in_progress', 'completed', 'on_hold')),
          key_deliverables TEXT[],
          milestones TEXT[],
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE(project_id, name)
        )`
      },
      {
        name: 'resources',
        sql: `CREATE TABLE IF NOT EXISTS resources (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100) CHECK (type IN ('human', 'equipment', 'material', 'software', 'facility', 'budget')),
          role VARCHAR(255),
          allocation_percentage INTEGER CHECK (allocation_percentage BETWEEN 0 AND 100),
          cost_per_unit DECIMAL(12, 2),
          quantity INTEGER,
          availability TEXT,
          skills TEXT[],
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'quality_standards',
        sql: `CREATE TABLE IF NOT EXISTS quality_standards (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          standard_name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          measurement_criteria TEXT,
          target_threshold VARCHAR(100),
          compliance_requirement TEXT,
          verification_method VARCHAR(255),
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE(project_id, standard_name)
        )`
      },
      {
        name: 'deliverables',
        sql: `CREATE TABLE IF NOT EXISTS deliverables (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(100),
          due_date DATE,
          status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'review', 'completed', 'delivered')),
          acceptance_criteria TEXT,
          responsible_party VARCHAR(255),
          dependencies TEXT[],
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'scope_items',
        sql: `CREATE TABLE IF NOT EXISTS scope_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          item_name VARCHAR(500) NOT NULL,
          description TEXT,
          inclusion_status VARCHAR(50) DEFAULT 'in_scope' CHECK (inclusion_status IN ('in_scope', 'out_of_scope', 'deferred', 'under_review')),
          category VARCHAR(100),
          justification TEXT,
          impact_if_excluded TEXT,
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      },
      {
        name: 'activities',
        sql: `CREATE TABLE IF NOT EXISTS activities (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          activity_name VARCHAR(500) NOT NULL,
          description TEXT,
          duration_days INTEGER,
          start_date DATE,
          end_date DATE,
          status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked', 'cancelled')),
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          dependencies TEXT[],
          deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
          extracted_from_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
          confidence_score DECIMAL(3, 2) DEFAULT 0.85,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL
        )`
      }
    ]

    for (const table of tables) {
      console.log(`📋 Creating table: ${table.name}...`)
      await pool!.query(table.sql)
    }

    // Create indexes
    console.log('\n📊 Creating indexes...')
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_stakeholders_project_id ON stakeholders(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_constraints_project_id ON constraints(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_success_criteria_project_id ON success_criteria(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_best_practices_project_id ON best_practices(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_phases_project_id ON phases(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_resources_project_id ON resources(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_quality_standards_project_id ON quality_standards(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON deliverables(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_scope_items_project_id ON scope_items(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id)`,
      `CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status)`,
      `CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity)`,
      `CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_deliverables_due_date ON deliverables(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status)`
    ]

    for (const indexSql of indexes) {
      await pool!.query(indexSql)
    }

    console.log('✅ Migration 104 completed successfully!')
    console.log('\n📊 Created 13 entity tables with indexes:')
    console.log('  1. stakeholders')
    console.log('  2. requirements')
    console.log('  3. risks')
    console.log('  4. milestones')
    console.log('  5. constraints')
    console.log('  6. success_criteria')
    console.log('  7. best_practices')
    console.log('  8. phases')
    console.log('  9. resources')
    console.log('  10. quality_standards')
    console.log('  11. deliverables')
    console.log('  12. scope_items')
    console.log('  13. activities')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()

