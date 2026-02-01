/**
 * Unit Tests for Playbook Service
 * RISK_MANAGEMENT_ENHANCEMENT_DESIGN.md - Phase 1 Verification
 */

import { playbookService } from '../services/playbookService';
import { pool, connectDatabase } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

describe('Playbook Service', () => {
    let testUserId: string;
    let testProjectId: string;
    let testPlaybookId: string;
    let testStepId: string;
    let testStep2Id: string;

    beforeAll(async () => {
        await connectDatabase();
        // Setup test user
        const userRes = await pool!.query(
            "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id",
            [`test-playbook-${Date.now()}@example.com`, 'hashedpassword', 'Test Playbook User']
        );
        testUserId = userRes.rows[0].id;

        // Setup test project
        const projectRes = await pool!.query(
            "INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id",
            ['Test Playbook Project', 'Project for testing playbooks', testUserId]
        );
        testProjectId = projectRes.rows[0].id;
    });

    afterAll(async () => {
        // Clean up test data
        await pool!.query("DELETE FROM operational_playbooks WHERE project_id = $1", [testProjectId]);
        await pool!.query("DELETE FROM projects WHERE id = $1", [testProjectId]);
        await pool!.query("DELETE FROM users WHERE id = $1", [testUserId]);
        await pool!.end();
    });

    describe('Playbook CRUD', () => {
        it('should create a new playbook', async () => {
            const input = {
                project_id: testProjectId,
                title: 'Technical Risk Response',
                description: 'Response for technical risks',
                category: 'risk' as const,
                trigger_type: 'manual' as const,
                applicable_risk_categories: ['technical']
            };

            const playbook = await playbookService.createPlaybook(input, testUserId);
            expect(playbook).toBeDefined();
            expect(playbook.title).toBe(input.title);
            expect(playbook.project_id).toBe(testProjectId);
            testPlaybookId = playbook.id;
        });

        it('should get playbook by ID', async () => {
            const playbook = await playbookService.getPlaybookById(testPlaybookId);
            expect(playbook).toBeDefined();
            expect(playbook?.id).toBe(testPlaybookId);
        });

        it('should update a playbook', async () => {
            const input = {
                title: 'Updated Technical Risk Response',
                is_active: false
            };

            const playbook = await playbookService.updatePlaybook(testPlaybookId, input, testUserId);
            expect(playbook.title).toBe(input.title);
            expect(playbook.is_active).toBe(false);
        });

        it('should list playbooks with filters', async () => {
            const playbooks = await playbookService.getPlaybooks({ project_id: testProjectId });
            expect(Array.isArray(playbooks)).toBe(true);
            expect(playbooks.length).toBeGreaterThan(0);
            expect(playbooks[0].project_id).toBe(testProjectId);
        });
    });

    describe('Scenario Management', () => {
        it('should add a scenario to a playbook', async () => {
            const input = {
                playbook_id: testPlaybookId,
                scenario_condition: { risk_category: 'technical', impact: 'high' },
                trigger_type: 'manual' as const,
                priority: 10,
                description: 'High impact technical risk'
            };

            const scenario = await playbookService.addScenario(input, testUserId);
            expect(scenario).toBeDefined();
            expect(scenario.playbook_id).toBe(testPlaybookId);
            expect(scenario.scenario_condition).toEqual(input.scenario_condition);
        });
    });

    describe('Step Management', () => {
        it('should add a step to a playbook', async () => {
            const input = {
                playbook_id: testPlaybookId,
                step_order: 1,
                step_title: 'Assess Impact',
                step_description: 'Analyze how this risk affects the project',
                step_type: 'action' as const,
                sla_hours: 4
            };

            const step = await playbookService.addStep(input, testUserId);
            expect(step).toBeDefined();
            expect(step.playbook_id).toBe(testPlaybookId);
            expect(step.step_title).toBe(input.step_title);
            testStepId = step.id;
        });

        it('should update a step', async () => {
            const input = {
                step_title: 'Detailed Impact Assessment'
            };

            const step = await playbookService.updateStep(testStepId, input, testUserId);
            expect(step.step_title).toBe(input.step_title);
        });
        it('should add a second step to a playbook', async () => {
            const input = {
                playbook_id: testPlaybookId,
                step_order: 2,
                step_title: 'Mitigate Risk',
                step_description: 'Execute mitigation plan',
                step_type: 'action' as const,
                sla_hours: 24
            };

            const step = await playbookService.addStep(input, testUserId);
            expect(step).toBeDefined();
            testStep2Id = step.id;
        });
    });

    describe('Playbook Matching', () => {
        it('should find matching playbooks', async () => {
            const criteria = {
                project_id: testProjectId,
                risk_category: 'technical',
                severity_level: 'high'
            };

            const matches = await playbookService.findMatchingPlaybooks(criteria);
            expect(Array.isArray(matches)).toBe(true);
            expect(matches.length).toBeGreaterThan(0);
            // Our test playbook is currently inactive from previous test, let's reactivate it
            await playbookService.updatePlaybook(testPlaybookId, { is_active: true }, testUserId);

            const activeMatches = await playbookService.findMatchingPlaybooks(criteria);
            expect(activeMatches.some(p => p.id === testPlaybookId)).toBe(true);
        });
    });

    describe('Playbook Execution', () => {
        let executionId: string;

        it('should execute a playbook', async () => {
            const input = {
                playbook_id: testPlaybookId,
                triggered_by_type: 'risk' as const,
                triggered_by_id: uuidv4(), // Mock risk ID
                trigger_type: 'manual' as const,
                trigger_reason: 'Testing execution'
            };

            const execution = await playbookService.executePlaybook(input, testUserId);
            expect(execution).toBeDefined();
            expect(execution.playbook_id).toBe(testPlaybookId);
            expect(execution.status).toBe('in_progress');
            expect(execution.current_step_order).toBe(1);
            executionId = execution.id;
        });

        it('should get execution by ID with steps', async () => {
            const execution = await playbookService.getExecutionById(executionId);
            expect(execution).toBeDefined();
            expect(execution?.id).toBe(executionId);
            expect(execution?.step_executions).toBeDefined();
            expect(execution!.step_executions!.length).toBeGreaterThan(0);
        });

        it('should complete a step', async () => {
            const stepExecution = await playbookService.completeStep(
                executionId,
                testStepId,
                testUserId,
                'Impact assessed: Minimal',
                { findings: 'all good' }
            );

            expect(stepExecution).toBeDefined();
            expect(stepExecution.status).toBe('completed');
            expect(stepExecution.completion_notes).toBe('Impact assessed: Minimal');

            const updatedExec = await playbookService.getExecutionById(executionId);
            expect(updatedExec?.completed_steps).toBe(1);
            expect(updatedExec?.current_step_order).toBe(2);
        });

        it('should cancel an execution', async () => {
            const cancelled = await playbookService.cancelExecution(
                executionId,
                testUserId,
                'Testing cancellation'
            );

            expect(cancelled).toBeDefined();
            expect(cancelled.status).toBe('cancelled');
            expect(cancelled.cancellation_reason).toBe('Testing cancellation');
        });
    });
});
