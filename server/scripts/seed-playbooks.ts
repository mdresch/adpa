import { pool, connectDatabase } from '../src/database/connection'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../src/utils/logger'

async function seedPlaybooks() {
    console.log('🌱 Starting playbook seed...')

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
                console.log('⚠️ No active projects found. Cannot seed playbooks.')
                return
            }

            // Get a valid user
            const usersResult = await client.query('SELECT id FROM users LIMIT 1')
            if (usersResult.rows.length === 0) {
                console.log('⚠️ No users found. Cannot seed playbooks.')
                return
            }
            const userId = usersResult.rows[0].id
            console.log(`👤 Using user ID: ${userId}`)

            console.log(`Found ${projects.length} active projects. Seeding playbooks for each...`)

            for (const project of projects) {
                console.log(`\nProcessing project: ${project.name} (${project.id})`)

                // Check existing playbooks
                const existingPlaybooks = await client.query(
                    'SELECT count(*) FROM operational_playbooks WHERE project_id = $1',
                    [project.id]
                )

                if (parseInt(existingPlaybooks.rows[0].count) > 0) {
                    console.log(`  - Playbooks already exist. Skipping.`)
                    continue
                }

                // 1. Standard Issue Resolution (Generic)
                await createPlaybook(client, project.id, userId, {
                    title: 'Standard Issue Resolution',
                    description: 'A general-purpose workflow for resolving standard project issues.',
                    category: 'resolution',
                    trigger_type: 'manual',
                    steps: [
                        { title: 'Assess Impact', type: 'action', description: 'Evaluate the issue impact on scope, timeline, and budget.' },
                        { title: 'Identify Root Cause', type: 'documentation', description: 'Determine the underlying cause of the issue.' },
                        { title: 'Propose Solution', type: 'action', description: 'Develop a solution plan and get necessary approvals.' },
                        { title: 'Implement Fix', type: 'action', description: 'Execute the solution plan.' },
                        { title: 'Verify Resolution', type: 'approval', description: 'Confirm with stakeholders that the issue is resolved.' }
                    ]
                })

                // 2. Technical Bug Fix (Technical)
                await createPlaybook(client, project.id, userId, {
                    title: 'Technical Bug Fix',
                    description: 'Streamlined process for software defects and technical debt.',
                    category: 'resolution',
                    trigger_type: 'manual',
                    applicable_risk_categories: ['technical'],
                    steps: [
                        { title: 'Reproduce Issue', type: 'action', description: 'Confirm the bug can be reproduced in a dev environment.' },
                        { title: 'Code Fix', type: 'action', description: 'Implement the fix in the codebase.' },
                        { title: 'Unit Testing', type: 'documentation', description: 'Add unit tests to cover the fix and prevent regression.' },
                        { title: 'Code Review', type: 'approval', description: 'Get code review approval from a peer.' },
                        { title: 'Deploy to Staging', type: 'action', description: 'Deploy and verify in the staging environment.' }
                    ]
                })

                // 3. Risk Mitigation (Risk)
                await createPlaybook(client, project.id, userId, {
                    title: 'Risk Mitigation Protocol',
                    description: 'Standard procedure for addressing materialized risks.',
                    category: 'risk',
                    trigger_type: 'threshold',
                    applicable_risk_categories: ['schedule', 'cost', 'resource'],
                    steps: [
                        { title: 'Analyze Triggers', type: 'action', description: 'Review the triggers that caused this risk to materialize.' },
                        { title: 'Activate Contingency', type: 'action', description: 'Execute the pre-planned contingency strategy.' },
                        { title: 'Monitor Effectiveness', type: 'wait', description: 'Wait for 24-48 hours to measure the effect of the mitigation.' },
                        { title: 'Update Risk Register', type: 'documentation', description: 'Log the outcome and close the risk entry.' }
                    ]
                })
            }

            console.log('\n✨ Seeding complete!')

        } finally {
            client.release()
        }

    } catch (error) {
        console.error('❌ Seeding failed:', error)
    } finally {
        await pool.end()
    }
}

async function createPlaybook(client: any, projectId: string, userId: string, data: any) {
    const playbookId = uuidv4()

    // Create Playbook
    await client.query(`
        INSERT INTO operational_playbooks (
            id, project_id, title, description, category, trigger_type, 
            applicable_risk_categories, is_active, created_by, created_at, updated_at, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW(), 1)
    `, [
        playbookId,
        projectId,
        data.title,
        data.description,
        data.category,
        data.trigger_type,
        data.applicable_risk_categories || null,
        userId
    ])

    // Create Steps
    for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i]
        await client.query(`
            INSERT INTO playbook_response_steps (
                id, playbook_id, step_order, step_title, step_description, 
                step_type, step_config, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
            uuidv4(),
            playbookId,
            i + 1,
            step.title,
            step.description,
            step.type,
            '{}'
        ])
    }

    console.log(`  + Created playbook: "${data.title}"`)
}

// Run the seed
seedPlaybooks().catch(console.error)
