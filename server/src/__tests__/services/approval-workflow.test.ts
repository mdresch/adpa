/**
 * Approval Workflow Service Tests
 * TASK-745: Approval workflow integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { pool } from '../../database/connection'
import { approvalWorkflowService } from '../../services/approvalWorkflowService'

describe('Approval Workflow Service', () => {
  let testUserId: string
  let testProjectId: string
  let testWorkflowId: string

  beforeAll(async () => {
    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, name, role) 
       VALUES ('test-approver@example.com', 'Test Approver', 'project_sponsor') 
       RETURNING id`
    )
    testUserId = userResult.rows[0].id

    // Create test project
    const projectResult = await pool.query(
      `INSERT INTO projects (name, description, status) 
       VALUES ('Test Project for Approvals', 'Testing approval workflow', 'active') 
       RETURNING id`
    )
    testProjectId = projectResult.rows[0].id

    // Get existing workflow or create one
    const workflowResult = await pool.query(
      `SELECT id FROM approval_workflows WHERE workflow_type = 'positive_drift' AND is_active = TRUE LIMIT 1`
    )
    if (workflowResult.rows.length > 0) {
      testWorkflowId = workflowResult.rows[0].id
    } else {
      // Create test workflow
      const newWorkflowResult = await pool.query(
        `INSERT INTO approval_workflows (
          name, workflow_type, approval_stages, sla_hours, is_active
        ) VALUES (
          'Test Workflow',
          'positive_drift',
          '[{"stage": 1, "role": "project_sponsor", "required": true}]'::jsonb,
          72,
          true
        ) RETURNING id`
      )
      testWorkflowId = newWorkflowResult.rows[0].id
    }
  })

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM approval_requests WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    await pool.end()
  })

  describe('createApprovalRequest', () => {
    it('should create a new approval request with correct defaults', async () => {
      const approvalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: 'positive_drift',
        project_id: testProjectId,
        title: 'Test Approval Request',
        description: 'Testing approval workflow creation',
        requested_by: testUserId,
        priority: 'medium',
        severity: 'medium'
      })

      expect(approvalRequest).toBeTruthy()
      expect(approvalRequest.id).toBeTruthy()
      expect(approvalRequest.title).toBe('Test Approval Request')
      expect(approvalRequest.status).toBe('pending')
      expect(approvalRequest.current_stage).toBe(1)
      expect(approvalRequest.total_stages).toBeGreaterThan(0)
      expect(approvalRequest.sla_deadline).toBeTruthy()
    })

    it('should create approval steps for the request', async () => {
      const approvalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: 'positive_drift',
        project_id: testProjectId,
        title: 'Test Approval with Steps',
        description: 'Testing approval step creation',
        requested_by: testUserId,
        priority: 'high',
        severity: 'medium'
      })

      const steps = await approvalWorkflowService.getApprovalSteps(approvalRequest.id)

      expect(steps).toBeTruthy()
      expect(steps.length).toBeGreaterThan(0)
      expect(steps[0].status).toBe('pending')
      expect(steps[0].step_order).toBe(1)
    })

    it('should set correct SLA deadline based on priority', async () => {
      const criticalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: 'budget_overrun',
        project_id: testProjectId,
        title: 'Critical Budget Overrun',
        description: 'Testing critical SLA',
        requested_by: testUserId,
        priority: 'critical',
        severity: 'critical'
      })

      const normalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: 'positive_drift',
        project_id: testProjectId,
        title: 'Normal Request',
        description: 'Testing normal SLA',
        requested_by: testUserId,
        priority: 'medium',
        severity: 'medium'
      })

      // Critical should have shorter deadline
      const criticalDeadline = new Date(criticalRequest.sla_deadline!).getTime()
      const normalDeadline = new Date(normalRequest.sla_deadline!).getTime()
      
      expect(criticalDeadline).toBeLessThan(normalDeadline)
    })
  })

  describe('processApprovalStep', () => {
    let testApprovalRequestId: string
    let testApprovalStepId: string

    beforeEach(async () => {
      // Create a fresh approval request for each test
      const approvalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: 'positive_drift',
        project_id: testProjectId,
        title: 'Test Approval for Processing',
        description: 'Testing approval step processing',
        requested_by: testUserId,
        priority: 'medium',
        severity: 'medium'
      })
      testApprovalRequestId = approvalRequest.id

      const steps = await approvalWorkflowService.getApprovalSteps(testApprovalRequestId)
      testApprovalStepId = steps[0].id
    })

    it('should approve a step successfully', async () => {
      const updatedRequest = await approvalWorkflowService.processApprovalStep({
        approval_step_id: testApprovalStepId,
        approver_user_id: testUserId,
        decision: 'approved',
        decision_notes: 'Looks good'
      })

      expect(updatedRequest).toBeTruthy()
      expect(updatedRequest.status).toMatch(/approved|in_progress/)

      // Verify step was updated
      const steps = await approvalWorkflowService.getApprovalSteps(testApprovalRequestId)
      const approvedStep = steps.find(s => s.id === testApprovalStepId)
      expect(approvedStep?.status).toBe('approved')
      expect(approvedStep?.decision).toBe('approved')
      expect(approvedStep?.decision_notes).toBe('Looks good')
    })

    it('should reject a step and stop the approval process', async () => {
      const updatedRequest = await approvalWorkflowService.processApprovalStep({
        approval_step_id: testApprovalStepId,
        approver_user_id: testUserId,
        decision: 'rejected',
        decision_notes: 'Does not meet requirements'
      })

      expect(updatedRequest).toBeTruthy()
      expect(updatedRequest.status).toBe('rejected')
      expect(updatedRequest.final_decision).toBe('rejected')
      expect(updatedRequest.completed_at).toBeTruthy()

      // Verify step was updated
      const steps = await approvalWorkflowService.getApprovalSteps(testApprovalRequestId)
      const rejectedStep = steps.find(s => s.id === testApprovalStepId)
      expect(rejectedStep?.status).toBe('rejected')
      expect(rejectedStep?.decision).toBe('rejected')
    })

    it('should advance to next stage after approval', async () => {
      // Create a multi-stage approval request
      const multiStageWorkflow = await pool.query(
        `INSERT INTO approval_workflows (
          name, workflow_type, approval_stages, sla_hours, is_active
        ) VALUES (
          'Multi Stage Test',
          'general_cr',
          '[
            {"stage": 1, "role": "project_sponsor", "required": true},
            {"stage": 2, "role": "cfo", "required": true}
          ]'::jsonb,
          72,
          true
        ) RETURNING id`
      )

      const approvalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: 'general_cr',
        project_id: testProjectId,
        title: 'Multi-Stage Approval Test',
        description: 'Testing multi-stage advancement',
        requested_by: testUserId,
        priority: 'medium',
        severity: 'medium'
      })

      expect(approvalRequest.current_stage).toBe(1)
      expect(approvalRequest.total_stages).toBe(2)

      // Approve stage 1
      const steps = await approvalWorkflowService.getApprovalSteps(approvalRequest.id)
      const stage1Step = steps.find(s => s.step_order === 1)
      
      const updatedRequest = await approvalWorkflowService.processApprovalStep({
        approval_step_id: stage1Step!.id,
        approver_user_id: testUserId,
        decision: 'approved'
      })

      // Should advance to stage 2
      expect(updatedRequest.current_stage).toBe(2)
      expect(updatedRequest.status).toBe('in_progress')
    })
  })

  describe('getApprovalRequest', () => {
    it('should retrieve an approval request by id', async () => {
      const created = await approvalWorkflowService.createApprovalRequest({
        request_type: 'positive_drift',
        project_id: testProjectId,
        title: 'Test Retrieval',
        description: 'Testing request retrieval',
        requested_by: testUserId,
        priority: 'low',
        severity: 'low'
      })

      const retrieved = await approvalWorkflowService.getApprovalRequest(created.id)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.title).toBe('Test Retrieval')
    })

    it('should return null for non-existent request', async () => {
      const result = await approvalWorkflowService.getApprovalRequest('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('getPendingApprovalsForUser', () => {
    beforeEach(async () => {
      // Clean up any existing approvals
      await pool.query('DELETE FROM approval_requests WHERE project_id = $1', [testProjectId])
    })

    it('should return pending approvals for a user', async () => {
      // Create approval request
      await approvalWorkflowService.createApprovalRequest({
        request_type: 'positive_drift',
        project_id: testProjectId,
        title: 'Pending Approval for User',
        description: 'Testing user pending approvals',
        requested_by: testUserId,
        priority: 'medium',
        severity: 'medium'
      })

      const pendingApprovals = await approvalWorkflowService.getPendingApprovalsForUser(testUserId)

      expect(pendingApprovals).toBeTruthy()
      expect(Array.isArray(pendingApprovals)).toBe(true)
      expect(pendingApprovals.length).toBeGreaterThan(0)
    })

    it('should not return completed approvals', async () => {
      // Create and complete an approval
      const request = await approvalWorkflowService.createApprovalRequest({
        request_type: 'positive_drift',
        project_id: testProjectId,
        title: 'Completed Approval',
        description: 'Testing completed approval filtering',
        requested_by: testUserId,
        priority: 'medium',
        severity: 'medium'
      })

      // Complete the approval
      const steps = await approvalWorkflowService.getApprovalSteps(request.id)
      await approvalWorkflowService.processApprovalStep({
        approval_step_id: steps[0].id,
        approver_user_id: testUserId,
        decision: 'approved'
      })

      // Get pending approvals - should not include the completed one if it's fully approved
      const pendingApprovals = await approvalWorkflowService.getPendingApprovalsForUser(testUserId)
      
      // If the workflow only has one stage, it should be completed and not in pending
      const completedRequest = await approvalWorkflowService.getApprovalRequest(request.id)
      if (completedRequest?.status === 'approved') {
        expect(pendingApprovals.find(a => a.id === request.id)).toBeUndefined()
      }
    })
  })

  describe('checkSLABreaches', () => {
    it('should identify requests past SLA deadline', async () => {
      // Create approval with very short SLA (in the past)
      const pastSLARequest = await pool.query(
        `INSERT INTO approval_requests (
          workflow_id, request_type, project_id, title, description, 
          current_stage, total_stages, status, priority, severity,
          sla_deadline, requested_by
        ) VALUES (
          $1, 'positive_drift', $2, 'Past SLA Request', 'Testing SLA breach detection',
          1, 1, 'pending', 'medium', 'medium',
          NOW() - INTERVAL '1 hour', $3
        ) RETURNING id`,
        [testWorkflowId, testProjectId, testUserId]
      )

      // Run SLA breach check
      await approvalWorkflowService.checkSLABreaches()

      // Verify request was marked as expired
      const result = await pool.query(
        'SELECT status FROM approval_requests WHERE id = $1',
        [pastSLARequest.rows[0].id]
      )

      expect(result.rows[0].status).toBe('expired')
    })
  })
})
