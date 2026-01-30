/**
 * Integration Test: Playbook Execution Flow
 * Covers: Risk -> Escalation -> Playbook Match -> Execution
 */

import { EscalationService } from '../../services/escalationService';
import { playbookService } from '../../services/playbookService';
import { pool, connectDatabase } from '../../database/connection';

describe('Playbook Execution Integration', () => {
    let escalationService: EscalationService;
    let testUserId: string;
    let testProjectId: string;

    beforeAll(async () => {
        await connectDatabase();
        escalationService = new EscalationService();

        // Setup test user
        const userRes = await pool!.query(
            "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id",
            [`int-test-${Date.now()}@example.com`, 'password', 'Int Test User']
        );
        testUserId = userRes.rows[0].id;

        // Setup test project
        const projectRes = await pool!.query(
            "INSERT INTO projects (name, description, owner_id, framework, status, priority) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            ['Int Test Project', 'Integration testing', testUserId, 'PMBOK', 'active', 'medium']
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

    it('should recommend and execute a playbook during drift evaluation', async () => {
        // 1. Create a playbook for budget overrun
        const playbook = await playbookService.createPlaybook({
            project_id: testProjectId,
            title: 'Budget Recovery Playbook',
            category: 'risk',
            trigger_type: 'auto',
            applicable_risk_categories: ['budget']
        }, testUserId);

        await playbookService.addStep({
            playbook_id: playbook.id,
            step_order: 1,
            step_title: 'Review Overrun Root Cause',
            step_type: 'action',
            step_config: {}
        }, testUserId);

        // 2. Evaluate drift that should trigger this playbook
        const driftData = {
            approved_budget: 10000,
            projected_cost: 15000, // 50% overrun
            overrun_amount: 5000
        };

        const result = await escalationService.evaluateDrift(
            'test-drift-id',
            testProjectId,
            'budget_overrun',
            'high',
            driftData
        );

        // 3. Verify recommendation
        expect(result.shouldEscalate).toBe(true);
        expect(result.recommendedPlaybooks).toBeDefined();
        expect(result.recommendedPlaybooks!.length).toBeGreaterThan(0);
        expect(result.recommendedPlaybooks![0].id).toBe(playbook.id);
        expect(result.suggestedActions).toContain(`Consider executing playbook: ${playbook.title}`);

        // 4. Manually execute the recommended playbook
        const execution = await playbookService.executePlaybook({
            playbook_id: playbook.id,
            triggered_by_type: 'risk',
            triggered_by_id: testProjectId,
            trigger_type: 'manual',
            trigger_reason: 'Budget overrun detected'
        }, testUserId);

        expect(execution.status).toBe('in_progress');
        expect(execution.total_steps).toBe(1);

        // 5. Cleanup execution
        await pool!.query("DELETE FROM playbook_executions WHERE id = $1", [execution.id]);
        await pool!.query("DELETE FROM operational_playbooks WHERE id = $1", [playbook.id]);
    });
});
