import { pool, connectDatabase } from '../src/database/connection'
import { logger } from '../src/utils/logger'
import { createPlaybookWithSteps, NATO_COMPLIANCE_PLAYBOOK } from '../src/utils/playbookUtils'

async function addNATOCompliancePlaybook() {
    console.log('🛡️ Adding NATO IT Security Compliance playbook...')

    try {
        // Connect to database
        await connectDatabase()
        const client = await pool!.connect()
        console.log('✅ Connected to database')

        try {
            // Get all active projects
            const projectsResult = await client.query('SELECT id, name FROM projects WHERE status = \'active\'')
            const projects = projectsResult.rows

            if (projects.length === 0) {
                console.log('⚠️ No active projects found.')
                return
            }

            // Get a valid user
            const usersResult = await client.query('SELECT id FROM users LIMIT 1')
            if (usersResult.rows.length === 0) {
                console.log('⚠️ No users found.')
                return
            }
            const userId = usersResult.rows[0].id
            console.log(`👤 Using user ID: ${userId}`)

            console.log(`Found ${projects.length} active projects. Adding NATO compliance playbook...`)

            for (const project of projects) {
                console.log(`\nProcessing project: ${project.name} (${project.id})`)

                // Check if NATO compliance playbook already exists
                const existingResult = await client.query(
                    'SELECT COUNT(*) FROM operational_playbooks WHERE project_id = $1 AND title = $2',
                    [project.id, 'NATO IT Security Compliance Protocol']
                )

                if (parseInt(existingResult.rows[0].count) > 0) {
                    console.log(`  - NATO compliance playbook already exists. Skipping.`)
                    continue
                }

                // Create NATO IT Security Compliance playbook using shared utility
                await createPlaybookWithSteps(client, project.id, userId, NATO_COMPLIANCE_PLAYBOOK)

                console.log(`  + Created NATO IT Security Compliance playbook`)
            }

            console.log('\n✨ NATO compliance playbook addition complete!')

        } finally {
            client.release()
        }

    } catch (error) {
        console.error('❌ Failed to add NATO compliance playbook:', error)
    } finally {
        if (pool) await pool.end()
    }
}

// Run the script
addNATOCompliancePlaybook().catch(console.error)
