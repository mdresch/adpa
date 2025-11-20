/**
 * Migration Script: Migrate Skills to Normalized Tables
 * 
 * Purpose: Extract unique skills from project_roles.required_skills arrays
 * and project_tasks.required_skills arrays, create entries in normalized
 * skills table, and create role_skills junction entries.
 * 
 * Usage: ts-node server/scripts/migrate-skills-to-normalized.ts
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function migrateSkillsToNormalized() {
  try {
    logger.info('Starting skills migration to normalized tables...')
    
    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    logger.info('Database connected successfully')

    // Step 1: Extract unique skills from project_roles.required_skills
    logger.info('Step 1: Extracting skills from project_roles...')
    const rolesResult = await pool.query(`
      SELECT id, required_skills
      FROM project_roles
      WHERE required_skills IS NOT NULL AND array_length(required_skills, 1) > 0
    `)

    const skillsSet = new Set<string>()
    const roleSkillsMap = new Map<string, string[]>() // roleId -> skill names

    for (const role of rolesResult.rows) {
      const skills = role.required_skills || []
      roleSkillsMap.set(role.id, skills)
      skills.forEach((skill: string) => {
        if (skill && skill.trim()) {
          skillsSet.add(skill.trim())
        }
      })
    }

    // Step 2: Extract unique skills from project_tasks.required_skills
    logger.info('Step 2: Extracting skills from project_tasks...')
    const tasksResult = await pool.query(`
      SELECT id, required_skills
      FROM project_tasks
      WHERE required_skills IS NOT NULL AND array_length(required_skills, 1) > 0
    `)

    for (const task of tasksResult.rows) {
      const skills = task.required_skills || []
      skills.forEach((skill: string) => {
        if (skill && skill.trim()) {
          skillsSet.add(skill.trim())
        }
      })
    }

    logger.info(`Found ${skillsSet.size} unique skills to migrate`)

    // Step 3: Create skills in normalized table
    logger.info('Step 3: Creating skills in normalized table...')
    const skillsArray = Array.from(skillsSet)
    const skillNameToIdMap = new Map<string, string>()

    for (const skillName of skillsArray) {
      try {
        // Try to find existing skill first
        const existingResult = await pool.query(
          `SELECT id FROM skills WHERE name = $1`,
          [skillName]
        )

        if (existingResult.rows.length > 0) {
          skillNameToIdMap.set(skillName, existingResult.rows[0].id)
          logger.debug(`Skill already exists: ${skillName}`)
        } else {
          // Create new skill
          const result = await pool.query(
            `INSERT INTO skills (name, category)
             VALUES ($1, $2)
             RETURNING id`,
            [skillName, 'technical'] // Default category
          )
          skillNameToIdMap.set(skillName, result.rows[0].id)
          logger.debug(`Created skill: ${skillName}`)
        }
      } catch (error: any) {
        if (error.code === '23505') { // Unique violation
          // Skill already exists, get its ID
          const existingResult = await pool.query(
            `SELECT id FROM skills WHERE name = $1`,
            [skillName]
          )
          if (existingResult.rows.length > 0) {
            skillNameToIdMap.set(skillName, existingResult.rows[0].id)
          }
        } else {
          logger.error(`Error creating skill ${skillName}:`, error)
        }
      }
    }

    logger.info(`Created/found ${skillNameToIdMap.size} skills`)

    // Step 4: Create role_skills junction entries
    logger.info('Step 4: Creating role_skills junction entries...')
    let roleSkillsCreated = 0

    for (const [roleId, skillNames] of roleSkillsMap.entries()) {
      for (const skillName of skillNames) {
        const skillId = skillNameToIdMap.get(skillName.trim())
        if (skillId) {
          try {
            await pool.query(
              `INSERT INTO role_skills (role_id, skill_id, required_proficiency, is_required)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (role_id, skill_id) DO NOTHING`,
              [roleId, skillId, 'intermediate', true]
            )
            roleSkillsCreated++
          } catch (error) {
            logger.error(`Error creating role_skill for role ${roleId}, skill ${skillName}:`, error)
          }
        }
      }
    }

    logger.info(`Created ${roleSkillsCreated} role_skills junction entries`)

    // Step 5: Summary
    logger.info('Migration completed successfully!')
    logger.info(`Summary:`)
    logger.info(`  - Unique skills found: ${skillsSet.size}`)
    logger.info(`  - Skills in normalized table: ${skillNameToIdMap.size}`)
    logger.info(`  - Role-skill assignments created: ${roleSkillsCreated}`)

    logger.info('Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    logger.error('Migration failed:', error)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

// Run migration
migrateSkillsToNormalized()

