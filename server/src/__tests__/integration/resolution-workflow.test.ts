/**
 * Integration Test: Resolution Workflow
 * Covers: Issue -> Playbook Recommendation -> Workflow Tracking
 */

import * as issueService from '../../services/issueService';
import { playbookService } from '../../services/playbookService';
import { pool, connectDatabase } from '../../database/connection';

describe('Resolution Workflow Integration', () => {
    let testUserId: string;
    let testProjectId: string;

    beforeAll(async () => {
        await connectDatabase();

        // Setup test user
        const userRes = await pool!.query(
            "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id",
            [`res-test-${Date.now()}@example.com`, 'password', 'Res Test User']
        );
        testUserId = userRes.rows[0].id;

        // Setup test project
        const projectRes = await pool!.query(
            "INSERT INTO projects (name, description, owner_id, framework, status, priority) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            ['Res Test Project', 'Resolution testing', testUserId, 'PMBOK', 'active', 'medium']
        );
        testProjectId = projectRes.rows[0].id;
    });

    afterAll(async () => {
        if (testProjectId) {
            await pool!.query("DELETE FROM projects WHERE id = $1", [testProjectId]);
        }
        if (testUserId) {
            await pool!.query("DELETE FROM users WHERE id = $1", [testUserId]);
        }
    });

    it('should recommend and associate a playbook with an issue', async () => {
        // 1. Create a resolution playbook
        const playbook = await playbookService.createPlaybook({
            project_id: testProjectId,
            title: 'Technical Issue Resolution',
            category: 'resolution',
            trigger_type: 'manual',
            applicable_risk_categories: ['technical']
        }, testUserId);

        // 2. Create a technical issue
        const issue = await issueService.createIssue({
            project_id: testProjectId,
            title: 'Database connection leak',
            description: 'The app is leaking connections',
            category: 'technical',
            priority: 'high'
        }, testUserId);

        // 3. Get recommendations for the issue
        const recommendations = await issueService.getResolutionRecommendations(issue.id);

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations[0].id).toBe(playbook.id);

        // 4. Start execution and link to issue
        const execution = await playbookService.executePlaybook({
            playbook_id: playbook.id,
            triggered_by_type: 'issue',
            triggered_by_id: issue.id,
            trigger_type: 'manual'
        }, testUserId);

        await issueService.updateIssue(issue.id, {
            playbook_execution_id: execution.id,
            resolution_workflow: {
                current_phase: 'investigation',
                playbook_started_at: new Date().toISOString()
            }
        }, testUserId);

        // 5. Verify issue updated
        const updatedIssue = await issueService.getIssueById(issue.id);
        expect(updatedIssue?.playbook_execution_id).toBe(execution.id);
        expect(updatedIssue?.resolution_workflow?.current_phase).toBe('investigation');

        // 6. Check metrics
        const metrics = await issueService.getResolutionMetrics(testProjectId);
        expect(parseInt(metrics.total_issues)).toBe(1);
        expect(parseInt(metrics.issues_with_playbooks)).toBe(1);

        // Cleanup
        await pool!.query("DELETE FROM playbook_executions WHERE id = $1", [execution.id]);
        await pool!.query("DELETE FROM issues WHERE id = $1", [issue.id]);
        await pool!.query("DELETE FROM operational_playbooks WHERE id = $1", [playbook.id]);
    });
});
