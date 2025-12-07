/**
 * Check Stakeholder Eligibility for Task Assignment
 * 
 * This script checks if a specific stakeholder meets all requirements
 * to be assigned to tasks:
 * 1. stakeholder_type = 'internal'
 * 2. is_team_member = true
 * 3. user_id IS NOT NULL (linked to user account)
 * 4. Belongs to the correct project
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'

interface StakeholderCheckResult {
  stakeholder: any
  user: any
  meetsRequirements: boolean
  requirements: {
    isInternal: boolean
    isTeamMember: boolean
    hasUserId: boolean
    correctProject: boolean
  }
  issues: string[]
}

async function checkStakeholderEligibility(
  projectId: string,
  email: string
): Promise<StakeholderCheckResult> {
  try {
    if (!pool) {
      throw new Error('Database pool not initialized. Call connectDatabase() first.')
    }
    
    // Find stakeholder by email and project
    const stakeholderResult = await pool.query(
      `SELECT 
        s.id,
        s.project_id,
        s.name,
        s.email,
        s.role,
        s.stakeholder_type,
        s.is_team_member,
        s.user_id,
        s.created_at,
        s.updated_at
      FROM stakeholders s
      WHERE s.email = $1
        AND s.project_id = $2`,
      [email, projectId]
    )

    if (stakeholderResult.rows.length === 0) {
      return {
        stakeholder: null,
        user: null,
        meetsRequirements: false,
        requirements: {
          isInternal: false,
          isTeamMember: false,
          hasUserId: false,
          correctProject: false,
        },
        issues: [`No stakeholder found with email ${email} in project ${projectId}`]
      }
    }

    const stakeholder = stakeholderResult.rows[0]
    const issues: string[] = []

    // Check requirements
    const isInternal = stakeholder.stakeholder_type === 'internal'
    const isTeamMember = stakeholder.is_team_member === true
    const hasUserId = stakeholder.user_id !== null && stakeholder.user_id !== undefined
    const correctProject = stakeholder.project_id === projectId

    if (!isInternal) {
      issues.push(`Stakeholder type is '${stakeholder.stakeholder_type}' but must be 'internal'`)
    }
    if (!isTeamMember) {
      issues.push(`is_team_member is ${stakeholder.is_team_member} but must be true`)
    }
    if (!hasUserId) {
      issues.push(`user_id is ${stakeholder.user_id} but must be set (linked to user account)`)
    }
    if (!correctProject) {
      issues.push(`Project ID mismatch: stakeholder belongs to ${stakeholder.project_id}, expected ${projectId}`)
    }

    // Get user details if user_id is set
    let user = null
    if (hasUserId) {
      const userResult = await pool.query(
        `SELECT id, email, name, role
        FROM users
        WHERE id = $1`,
        [stakeholder.user_id]
      )
      if (userResult.rows.length > 0) {
        user = userResult.rows[0]
      } else {
        issues.push(`User ID ${stakeholder.user_id} not found in users table`)
      }
    }

    const meetsRequirements = isInternal && isTeamMember && hasUserId && correctProject

    return {
      stakeholder,
      user,
      meetsRequirements,
      requirements: {
        isInternal,
        isTeamMember,
        hasUserId,
        correctProject,
      },
      issues
    }
  } catch (error) {
    logger.error('Error checking stakeholder eligibility', { error, projectId, email })
    throw error
  }
}

async function main() {
  const projectId = process.argv[2] || '45083436-7e90-4ecf-aa42-e4a73c4b64b7'
  const email = process.argv[3] || 'menno.drescher@gmail.com'

  console.log('\n🔍 Checking Stakeholder Eligibility for Task Assignment')
  console.log('=' .repeat(60))
  console.log(`Project ID: ${projectId}`)
  console.log(`Email: ${email}`)
  console.log('=' .repeat(60) + '\n')

  try {
    // Connect to database first
    console.log('Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    console.log('Database connected successfully\n')
    
    const result = await checkStakeholderEligibility(projectId, email)

    if (!result.stakeholder) {
      console.log('❌ Stakeholder not found\n')
      console.log('Issues:')
      result.issues.forEach(issue => console.log(`  - ${issue}`))
      process.exit(1)
    }

    console.log('📋 Stakeholder Information:')
    console.log(`  ID: ${result.stakeholder.id}`)
    console.log(`  Name: ${result.stakeholder.name || 'N/A'}`)
    console.log(`  Email: ${result.stakeholder.email}`)
    console.log(`  Role: ${result.stakeholder.role}`)
    console.log(`  Project ID: ${result.stakeholder.project_id}`)
    console.log('')

    if (result.user) {
      console.log('👤 Linked User Account:')
      console.log(`  User ID: ${result.user.id}`)
      console.log(`  Name: ${result.user.name || 'N/A'}`)
      console.log(`  Email: ${result.user.email}`)
      console.log(`  Role: ${result.user.role || 'N/A'}`)
      console.log('')
    }

    console.log('✅ Requirements Check:')
    console.log(`  ✓ Stakeholder Type = 'internal': ${result.requirements.isInternal ? '✅ YES' : '❌ NO'}`)
    console.log(`  ✓ is_team_member = true: ${result.requirements.isTeamMember ? '✅ YES' : '❌ NO'}`)
    console.log(`  ✓ user_id is set: ${result.requirements.hasUserId ? '✅ YES' : '❌ NO'}`)
    console.log(`  ✓ Correct project: ${result.requirements.correctProject ? '✅ YES' : '❌ NO'}`)
    console.log('')

    if (result.meetsRequirements) {
      console.log('🎉 SUCCESS: Stakeholder meets all requirements for task assignment!')
      console.log('')
      console.log('This stakeholder will appear in the resource assignment dropdown.')
    } else {
      console.log('⚠️  WARNING: Stakeholder does NOT meet all requirements')
      console.log('')
      console.log('Issues to fix:')
      result.issues.forEach(issue => console.log(`  - ${issue}`))
      console.log('')
      console.log('To fix:')
      if (!result.requirements.isInternal) {
        console.log('  1. Set stakeholder_type to "internal" in the Stakeholders tab')
      }
      if (!result.requirements.isTeamMember) {
        console.log('  2. Check "Mark as Team Member" in the Stakeholders tab')
      }
      if (!result.requirements.hasUserId) {
        console.log('  3. Link stakeholder to a user account (set user_id)')
        console.log('     - Ensure a user account exists with email:', email)
        console.log('     - Use the "Link to User Account" feature in the Stakeholders tab')
      }
    }

    console.log('')
    await pool.end()
    process.exit(result.meetsRequirements ? 0 : 1)
  } catch (error) {
    console.error('Error:', error)
    await pool.end()
    process.exit(1)
  }
}

if (require.main === module) {
  void main()
}

export { checkStakeholderEligibility }

