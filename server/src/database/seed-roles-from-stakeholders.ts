/**
 * Seed Roles from Internal Stakeholders
 * 
 * Populates the project_roles table by extracting unique role names
 * from internal stakeholders in the database.
 * 
 * Usage: ts-node server/src/database/seed-roles-from-stakeholders.ts
 */

import { pool, connectDatabase } from "./connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

interface RoleSeed {
  roleName: string
  roleCode: string
  description?: string
  roleType: 'internal' | 'external' | 'contractor' | 'vendor'
  roleCategory?: string
  seniorityLevel?: string
  defaultHourlyRate: number
  currency: string
}

/**
 * Generate role code from role name
 * Converts "Project Manager" -> "PROJECT_MANAGER"
 * Truncates to 20 characters max to match database constraint
 */
function generateRoleCode(roleName: string): string {
  let code = roleName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
  
  // Truncate to 20 characters (database constraint)
  if (code.length > 20) {
    code = code.substring(0, 20)
    // Remove trailing underscore if truncated
    code = code.replace(/_$/, '')
  }
  
  return code
}

/**
 * Determine seniority level from role name
 */
function inferSeniorityLevel(roleName: string): string | undefined {
  const lowerName = roleName.toLowerCase()
  
  if (lowerName.includes('senior') || lowerName.includes('sr.') || lowerName.includes('sr ')) {
    return 'senior'
  }
  if (lowerName.includes('junior') || lowerName.includes('jr.') || lowerName.includes('jr ')) {
    return 'junior'
  }
  if (lowerName.includes('lead') || lowerName.includes('principal') || lowerName.includes('chief')) {
    return 'lead'
  }
  if (lowerName.includes('director') || lowerName.includes('vp') || lowerName.includes('vice president')) {
    return 'executive'
  }
  if (lowerName.includes('manager') || lowerName.includes('head of')) {
    return 'manager'
  }
  
  return undefined // Default to undefined, will be set to 'mid' if needed
}

/**
 * Determine role category from role name
 */
function inferRoleCategory(roleName: string): string | undefined {
  const lowerName = roleName.toLowerCase()
  
  if (lowerName.includes('project') || lowerName.includes('program')) {
    return 'Project Management'
  }
  if (lowerName.includes('developer') || lowerName.includes('engineer') || lowerName.includes('programmer')) {
    return 'Development'
  }
  if (lowerName.includes('analyst') || lowerName.includes('business analyst')) {
    return 'Business Analysis'
  }
  if (lowerName.includes('designer') || lowerName.includes('ui') || lowerName.includes('ux')) {
    return 'Design'
  }
  if (lowerName.includes('qa') || lowerName.includes('tester') || lowerName.includes('test')) {
    return 'Quality Assurance'
  }
  if (lowerName.includes('devops') || lowerName.includes('sre') || lowerName.includes('infrastructure')) {
    return 'DevOps'
  }
  if (lowerName.includes('data') || lowerName.includes('database') || lowerName.includes('dba')) {
    return 'Data Management'
  }
  if (lowerName.includes('architect') || lowerName.includes('architecture')) {
    return 'Architecture'
  }
  if (lowerName.includes('product') || lowerName.includes('product owner')) {
    return 'Product Management'
  }
  if (lowerName.includes('scrum') || lowerName.includes('agile') || lowerName.includes('coach')) {
    return 'Agile'
  }
  if (lowerName.includes('security') || lowerName.includes('cyber')) {
    return 'Security'
  }
  if (lowerName.includes('support') || lowerName.includes('help desk')) {
    return 'Support'
  }
  if (lowerName.includes('sales') || lowerName.includes('account')) {
    return 'Sales'
  }
  if (lowerName.includes('marketing')) {
    return 'Marketing'
  }
  if (lowerName.includes('finance') || lowerName.includes('accounting')) {
    return 'Finance'
  }
  if (lowerName.includes('hr') || lowerName.includes('human resources')) {
    return 'Human Resources'
  }
  if (lowerName.includes('legal') || lowerName.includes('compliance')) {
    return 'Legal'
  }
  
  return 'General'
}

/**
 * Get default hourly rate based on role
 */
function getDefaultHourlyRate(roleName: string, seniorityLevel?: string): number {
  const lowerName = roleName.toLowerCase()
  
  // Executive level
  if (seniorityLevel === 'executive' || lowerName.includes('director') || lowerName.includes('vp')) {
    return 150
  }
  
  // Senior/Lead level
  if (seniorityLevel === 'senior' || seniorityLevel === 'lead' || lowerName.includes('senior') || lowerName.includes('lead')) {
    if (lowerName.includes('architect') || lowerName.includes('principal')) {
      return 120
    }
    return 100
  }
  
  // Manager level
  if (seniorityLevel === 'manager' || lowerName.includes('manager')) {
    return 90
  }
  
  // Mid level (default)
  if (seniorityLevel === 'mid' || !seniorityLevel) {
    return 75
  }
  
  // Junior level
  if (seniorityLevel === 'junior' || lowerName.includes('junior')) {
    return 50
  }
  
  // Default
  return 75
}

async function seedRolesFromStakeholders() {
  try {
    logger.info("🚀 Starting roles seeding from internal stakeholders...")
    
    // Connect to database
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    logger.info("✅ Database connected successfully")
    
    // Step 1: Get all unique roles from internal stakeholders
    logger.info("📋 Step 1: Fetching unique roles from internal stakeholders...")
    const stakeholdersResult = await pool.query(`
      SELECT DISTINCT 
        role,
        COUNT(*) as stakeholder_count,
        STRING_AGG(DISTINCT department, ', ') as departments
      FROM stakeholders
      WHERE stakeholder_type = 'internal'
        AND role IS NOT NULL
        AND role != ''
        AND TRIM(role) != ''
      GROUP BY role
      ORDER BY role ASC
    `)
    
    const uniqueRoles = stakeholdersResult.rows
    logger.info(`Found ${uniqueRoles.length} unique roles from internal stakeholders`)
    
    if (uniqueRoles.length === 0) {
      logger.warn("⚠️  No internal stakeholders with roles found. Nothing to seed.")
      return { created: 0, skipped: 0 }
    }
    
    // Step 2: Create roles
    logger.info("📝 Step 2: Creating roles...")
    let created = 0
    let skipped = 0
    
    for (const stakeholderRole of uniqueRoles) {
      const roleName = stakeholderRole.role.trim()
      let roleCode = generateRoleCode(roleName)
      const seniorityLevel = inferSeniorityLevel(roleName) || 'mid'
      const roleCategory = inferRoleCategory(roleName)
      const defaultHourlyRate = getDefaultHourlyRate(roleName, seniorityLevel)
      
      try {
        // Check if role already exists (by role_name first, then role_code)
        const existingByName = await pool.query(
          `SELECT id FROM project_roles WHERE role_name = $1`,
          [roleName]
        )
        
        if (existingByName.rows.length > 0) {
          skipped++
          logger.debug(`Role already exists by name: ${roleName}`)
          continue
        }
        
        // Check if role_code already exists (might have collisions due to truncation)
        const existingByCode = await pool.query(
          `SELECT id, role_name FROM project_roles WHERE role_code = $1`,
          [roleCode]
        )
        
        if (existingByCode.rows.length > 0) {
          // If code exists but name is different, append a number
          let finalRoleCode = roleCode
          let counter = 1
          while (existingByCode.rows.length > 0 && counter < 100) {
            const suffix = counter.toString().padStart(2, '0')
            finalRoleCode = roleCode.substring(0, 18) + suffix // Keep last 2 chars for counter
            const check = await pool.query(
              `SELECT id FROM project_roles WHERE role_code = $1`,
              [finalRoleCode]
            )
            if (check.rows.length === 0) {
              break
            }
            counter++
          }
          roleCode = finalRoleCode
        }
        
        // Create role
        const description = `Role derived from internal stakeholders. ${stakeholderRole.stakeholder_count} stakeholder(s) with this role.${stakeholderRole.departments ? ` Departments: ${stakeholderRole.departments}` : ''}`
        
        await pool.query(
          `INSERT INTO project_roles (
            id,
            role_name,
            role_code,
            description,
            role_type,
            role_category,
            seniority_level,
            default_hourly_rate,
            currency,
            is_active,
            is_billable,
            display_order,
            created_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
            (SELECT COALESCE(MAX(display_order), 0) + 1 FROM project_roles),
            NOW(),
            NOW()
          )`,
          [
            uuidv4(),
            roleName,
            roleCode,
            description,
            'internal',
            roleCategory,
            seniorityLevel,
            defaultHourlyRate,
            'USD',
            true,
            true
          ]
        )
        
        created++
        logger.debug(`Created role: ${roleName} (${roleCode}) - ${seniorityLevel} - $${defaultHourlyRate}/hr`)
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation
          skipped++
          logger.debug(`Role already exists (unique violation): ${roleName}`)
        } else {
          logger.error(`Error creating role ${roleName}:`, error)
        }
      }
    }
    
    logger.info(`✅ Roles seeding complete: ${created} created, ${skipped} skipped`)
    
    // Step 3: Summary
    const totalRoles = await pool.query(`SELECT COUNT(*) as count FROM project_roles WHERE role_type = 'internal'`)
    logger.info(`📊 Summary:`)
    logger.info(`   Roles created: ${created}`)
    logger.info(`   Roles skipped: ${skipped}`)
    logger.info(`   Total internal roles: ${totalRoles.rows[0].count}`)
    
    return { created, skipped }
  } catch (error) {
    logger.error("❌ Roles seeding failed:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedRolesFromStakeholders()
    .then((result) => {
      logger.info("🎯 Roles seeding completed successfully")
      logger.info(`   Created: ${result.created}, Skipped: ${result.skipped}`)
      process.exit(0)
    })
    .catch((error) => {
      logger.error("❌ Roles seeding failed:", error)
      process.exit(1)
    })
}

export { seedRolesFromStakeholders }

