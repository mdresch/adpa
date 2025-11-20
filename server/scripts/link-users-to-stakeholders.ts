/**
 * Migration Script: Link Users to Stakeholders
 * 
 * Purpose: For each user, find or create matching stakeholder by email.
 * Set stakeholder_type = 'internal' and set user_id link.
 * Handle duplicates and conflicts.
 * 
 * Usage: ts-node server/scripts/link-users-to-stakeholders.ts [--project-id PROJECT_ID]
 */

import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'

async function linkUsersToStakeholders(projectId?: string) {
  try {
    logger.info('Starting user-to-stakeholder linking...')
    
    // Connect to database first
    logger.info('Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null')
    }
    
    logger.info('Database connected successfully')

    // Get all users
    logger.info('Step 1: Fetching all users...')
    const usersResult = await pool.query(`
      SELECT id, email, name
      FROM users
      ORDER BY email
    `)

    logger.info(`Found ${usersResult.rows.length} users`)

    let linked = 0
    let created = 0
    let skipped = 0
    let errors = 0

    // Process each user
    for (const user of usersResult.rows) {
      try {
        if (!user.email) {
          logger.warn(`User ${user.id} has no email, skipping`)
          skipped++
          continue
        }

        // Check if stakeholder already exists with this email
        let stakeholderQuery = `
          SELECT id, user_id, stakeholder_type, project_id
          FROM stakeholders
          WHERE email = $1
        `
        const queryParams: any[] = [user.email]

        if (projectId) {
          stakeholderQuery += ` AND project_id = $2`
          queryParams.push(projectId)
        }

        stakeholderQuery += ` ORDER BY created_at ASC LIMIT 1`

        const stakeholderResult = await pool.query(stakeholderQuery, queryParams)

        if (stakeholderResult.rows.length > 0) {
          const stakeholder = stakeholderResult.rows[0]

          // Check if already linked to a different user
          if (stakeholder.user_id && stakeholder.user_id !== user.id) {
            logger.warn(
              `Stakeholder ${stakeholder.id} (${user.email}) already linked to user ${stakeholder.user_id}, skipping`
            )
            skipped++
            continue
          }

          // Link existing stakeholder to user
          if (!stakeholder.user_id) {
            await pool.query(
              `UPDATE stakeholders 
               SET user_id = $1, 
                   stakeholder_type = 'internal',
                   updated_at = NOW()
               WHERE id = $2`,
              [user.id, stakeholder.id]
            )
            linked++
            logger.debug(`Linked existing stakeholder ${stakeholder.id} to user ${user.id}`)
          } else {
            logger.debug(`Stakeholder ${stakeholder.id} already linked to user ${user.id}`)
            skipped++
          }
        } else {
          // Create new stakeholder for user
          // If projectId provided, create in that project; otherwise create in first project or skip
          if (!projectId) {
            // Get first project
            const projectResult = await pool.query(
              `SELECT id FROM projects ORDER BY created_at ASC LIMIT 1`
            )

            if (projectResult.rows.length === 0) {
              logger.warn(`No projects found, cannot create stakeholder for user ${user.id}`)
              skipped++
              continue
            }

            const firstProjectId = projectResult.rows[0].id

            try {
              await pool.query(
                `INSERT INTO stakeholders (
                   project_id, name, email, role, stakeholder_type, 
                   interest_level, influence_level, engagement_approach,
                   communication_frequency, stakeholder_category, user_id
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                  firstProjectId,
                  user.name || 'User',
                  user.email,
                  'Team Member',
                  'internal',
                  'high',
                  'medium',
                  'manage_closely',
                  'weekly',
                  'primary',
                  user.id
                ]
              )
              created++
              logger.debug(`Created new stakeholder for user ${user.id} in project ${firstProjectId}`)
            } catch (error: any) {
              if (error.code === '23505') { // Unique constraint violation
                // Stakeholder with same name already exists in this project
                // Try to link existing stakeholder to user instead
                const existingStakeholder = await pool.query(
                  `SELECT id, user_id FROM stakeholders 
                   WHERE project_id = $1 AND email = $2 LIMIT 1`,
                  [firstProjectId, user.email]
                )
                
                if (existingStakeholder.rows.length > 0 && !existingStakeholder.rows[0].user_id) {
                  await pool.query(
                    `UPDATE stakeholders 
                     SET user_id = $1, stakeholder_type = 'internal', updated_at = NOW()
                     WHERE id = $2`,
                    [user.id, existingStakeholder.rows[0].id]
                  )
                  linked++
                  logger.debug(`Linked existing stakeholder to user ${user.id}`)
                } else {
                  skipped++
                  logger.debug(`Skipped user ${user.id} - duplicate constraint`)
                }
              } else {
                throw error
              }
            }
          } else {
            try {
              await pool.query(
                `INSERT INTO stakeholders (
                   project_id, name, email, role, stakeholder_type, 
                   interest_level, influence_level, engagement_approach,
                   communication_frequency, stakeholder_category, user_id
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                  projectId,
                  user.name || 'User',
                  user.email,
                  'Team Member',
                  'internal',
                  'high',
                  'medium',
                  'manage_closely',
                  'weekly',
                  'primary',
                  user.id
                ]
              )
              created++
              logger.debug(`Created new stakeholder for user ${user.id} in project ${projectId}`)
            } catch (error: any) {
              if (error.code === '23505') { // Unique constraint violation
                // Stakeholder with same name already exists in this project
                // Try to link existing stakeholder to user instead
                const existingStakeholder = await pool.query(
                  `SELECT id, user_id FROM stakeholders 
                   WHERE project_id = $1 AND email = $2 LIMIT 1`,
                  [projectId, user.email]
                )
                
                if (existingStakeholder.rows.length > 0 && !existingStakeholder.rows[0].user_id) {
                  await pool.query(
                    `UPDATE stakeholders 
                     SET user_id = $1, stakeholder_type = 'internal', updated_at = NOW()
                     WHERE id = $2`,
                    [user.id, existingStakeholder.rows[0].id]
                  )
                  linked++
                  logger.debug(`Linked existing stakeholder to user ${user.id}`)
                } else {
                  skipped++
                  logger.debug(`Skipped user ${user.id} - duplicate constraint`)
                }
              } else {
                throw error
              }
            }
          }
        }
      } catch (error: any) {
        logger.error(`Error processing user ${user.id} (${user.email}):`, error)
        errors++
      }
    }

    // Summary
    logger.info('Migration completed!')
    logger.info(`Summary:`)
    logger.info(`  - Users processed: ${usersResult.rows.length}`)
    logger.info(`  - Stakeholders linked: ${linked}`)
    logger.info(`  - Stakeholders created: ${created}`)
    logger.info(`  - Skipped: ${skipped}`)
    logger.info(`  - Errors: ${errors}`)

    logger.info('Migration completed!')
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

// Parse command line arguments
const args = process.argv.slice(2)
let projectId: string | undefined

const projectIdIndex = args.indexOf('--project-id')
if (projectIdIndex !== -1 && args[projectIdIndex + 1]) {
  projectId = args[projectIdIndex + 1]
}

// Run migration
linkUsersToStakeholders(projectId)

