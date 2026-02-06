
import { pool, connectDatabase } from '../src/database/connection'
import { escalateRiskToIssue } from '../src/services/issueService'
import { logger } from '../src/utils/logger'
import { v4 as uuidv4 } from 'uuid'

async function verify() {
    await connectDatabase()
    const client = await pool!.connect()
    try {
        console.log('Starting verification...')

        // 1. Create a test user (mock)
        const userRes = await client.query('SELECT id FROM users LIMIT 1')
        let userId = userRes.rows[0]?.id

        if (!userId) {
            const newUser = await client.query(`INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
                [uuidv4(), 'test@example.com', 'Test User', 'admin'])
            userId = newUser.rows[0].id
        }

        // 2. Create a test project
        const projectRes = await client.query(`INSERT INTO projects (id, name, description, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [uuidv4(), 'Test Project Escalation', 'Test Desc', 'active', userId])
        const projectId = projectRes.rows[0].id

        // 3. Create a test risk
        const riskRes = await client.query(`INSERT INTO risks (id, project_id, title, description, category, impact, probability, status, owner) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [uuidv4(), projectId, 'Test Risk for Escalation', 'This is a test risk', 'technical', 'high', 'high', 'identified', userId])
        const riskId = riskRes.rows[0].id
        console.log('Created risk:', riskId)

        // 4. Create a mitigation plan for this risk
        const planRes = await client.query(`INSERT INTO mitigation_plans (id, risk_id, title, action_type, created_by, status, completion_percentage) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [uuidv4(), riskId, 'Test Mitigation Plan', 'mitigation', userId, 'planned', 0])
        const planId = planRes.rows[0].id
        console.log('Created mitigation plan:', planId)

        // 5. Escalate the risk (calling the service function)
        const issue = await escalateRiskToIssue(riskId, userId, {
            trigger_reason: 'manual_escalation',
            trigger_description: 'Verification Test',
            priority: 'high'
        })
        console.log('Escalated to issue:', issue.id)

        // 6. Verify result
        // Check if plan has issue_id
        const updatedPlanRes = await client.query('SELECT issue_id FROM mitigation_plans WHERE id = $1', [planId])
        const linkedIssueId = updatedPlanRes.rows[0].issue_id

        if (linkedIssueId === issue.id) {
            console.log('SUCCESS: Mitigation plan is linked to the new issue.')
        } else {
            console.error('FAILURE: Mitigation plan is NOT linked correctly. issue_id:', linkedIssueId)
        }

        // Cleanup
        await client.query('DELETE FROM mitigation_plans WHERE risk_id = $1', [riskId])
        await client.query('DELETE FROM issues WHERE id = $1', [issue.id])
        await client.query('DELETE FROM risks WHERE id = $1', [riskId])
        await client.query('DELETE FROM projects WHERE id = $1', [projectId])

    } catch (error) {
        console.error('Verification failed:', error)
    } finally {
        client.release()
        await pool!.end()
    }
}

verify();
