import { pool, connectDatabase } from '../src/database/connection'

async function addConstraints() {
  try {
    await connectDatabase()
    
    console.log('🔧 Adding unique constraints to extraction tables...\n')
    
    const constraints = [
      {
        table: 'stakeholders',
        columns: ['project_id', 'name'],
        name: 'stakeholders_project_name_unique'
      },
      {
        table: 'requirements',
        columns: ['project_id', 'name'],
        name: 'requirements_project_name_unique'
      },
      {
        table: 'risks',
        columns: ['project_id', 'name'],
        name: 'risks_project_name_unique'
      },
      {
        table: 'milestones',
        columns: ['project_id', 'name'],
        name: 'milestones_project_name_unique'
      },
      {
        table: 'constraints',
        columns: ['project_id', 'name'],
        name: 'constraints_project_name_unique'
      },
      {
        table: 'success_criteria',
        columns: ['project_id', 'name'],
        name: 'success_criteria_project_name_unique'
      },
      {
        table: 'best_practices',
        columns: ['project_id', 'title'],
        name: 'best_practices_project_title_unique'
      },
      {
        table: 'phases',
        columns: ['project_id', 'name'],
        name: 'phases_project_name_unique'
      },
      {
        table: 'resources',
        columns: ['project_id', 'name'],
        name: 'resources_project_name_unique'
      },
      {
        table: 'quality_standards',
        columns: ['project_id', 'standard_name'],
        name: 'quality_standards_project_name_unique'
      },
      {
        table: 'deliverables',
        columns: ['project_id', 'name'],
        name: 'deliverables_project_name_unique'
      },
      {
        table: 'scope_items',
        columns: ['project_id', 'item_name'],
        name: 'scope_items_project_name_unique'
      },
      {
        table: 'activities',
        columns: ['project_id', 'activity_name'],
        name: 'activities_project_name_unique'
      }
    ]
    
    for (const constraint of constraints) {
      try {
        // Drop existing constraint if it exists
        await pool!.query(`
          ALTER TABLE ${constraint.table} 
          DROP CONSTRAINT IF EXISTS ${constraint.name}
        `)
        
        // Add new constraint
        await pool!.query(`
          ALTER TABLE ${constraint.table} 
          ADD CONSTRAINT ${constraint.name} 
          UNIQUE (${constraint.columns.join(', ')})
        `)
        
        console.log(`✅ ${constraint.table.padEnd(25)} - Added unique constraint on (${constraint.columns.join(', ')})`)
      } catch (error: any) {
        console.log(`❌ ${constraint.table.padEnd(25)} - Failed: ${error.message}`)
      }
    }
    
    console.log('\n🎉 All unique constraints added!')
    console.log('\n💡 Now you can re-run extraction and it will properly upsert data.')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

addConstraints()

