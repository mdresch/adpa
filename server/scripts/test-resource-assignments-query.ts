/**
 * Test the exact query used by getProjectResourceAssignments
 */

import { pool, connectDatabase } from '../src/database/connection'

async function testQuery(projectId: string) {
  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database pool not initialized')
    }

    console.log(`\n🔍 Testing getProjectResourceAssignments query for project: ${projectId}\n`)

    // Test the exact query from timeTrackingService.ts
    const teamMembersResult = await pool.query(
      `SELECT 
        s.id,
        s.project_id,
        s.user_id,
        s.name as user_name,
        s.email as user_email,
        s.role as role_name,
        s.is_team_member,
        s.stakeholder_type,
        -- Try to find a matching project_role by role name
        pr.id as role_id,
        pr.role_type,
        pr.seniority_level,
        -- Use a default hourly rate from project_role, or 0 if not set
        COALESCE(pr.default_hourly_rate, 0) as hourly_rate,
        -- Mark as stakeholder-based assignment
        'stakeholder' as assignment_source
      FROM stakeholders s
      LEFT JOIN project_roles pr ON LOWER(TRIM(pr.role_name)) = LOWER(TRIM(s.role))
      WHERE s.project_id = $1
        AND s.is_team_member = true
        AND s.stakeholder_type = 'internal'
        AND s.user_id IS NOT NULL
      ORDER BY s.name ASC`,
      [projectId]
    )

    console.log(`✅ Query executed successfully`)
    console.log(`📊 Results: ${teamMembersResult.rows.length} team members found\n`)

    if (teamMembersResult.rows.length === 0) {
      console.log('⚠️  No team members found. Checking individual conditions...\n')
      
      // Check each condition separately
      const allStakeholders = await pool.query(
        `SELECT id, name, email, role, stakeholder_type, is_team_member, user_id
        FROM stakeholders
        WHERE project_id = $1`,
        [projectId]
      )
      
      console.log(`Total stakeholders in project: ${allStakeholders.rows.length}`)
      
      for (const s of allStakeholders.rows) {
        console.log(`\n  Stakeholder: ${s.name || s.email}`)
        console.log(`    - stakeholder_type: ${s.stakeholder_type} ${s.stakeholder_type === 'internal' ? '✅' : '❌'}`)
        console.log(`    - is_team_member: ${s.is_team_member} ${s.is_team_member === true ? '✅' : '❌'}`)
        console.log(`    - user_id: ${s.user_id || 'NULL'} ${s.user_id ? '✅' : '❌'}`)
      }
    } else {
      console.log('✅ Team members found:\n')
      teamMembersResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.user_name} (${row.user_email})`)
        console.log(`   - Role: ${row.role_name || 'N/A'}`)
        console.log(`   - Hourly Rate: $${row.hourly_rate || 0}`)
        console.log(`   - Role ID: ${row.role_id || 'No matching project_role'}`)
        console.log('')
      })
    }

    await pool.end()
  } catch (error) {
    console.error('Error:', error)
    if (pool) await pool.end()
    process.exit(1)
  }
}

const projectId = process.argv[2] || '45083436-7e90-4ecf-aa42-e4a73c4b64b7'
void testQuery(projectId)

