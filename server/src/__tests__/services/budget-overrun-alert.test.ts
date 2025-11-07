/**
 * Budget Overrun Alert Service Tests
 * Tests for budget overrun detection and emergency alert generation
 */

import { budgetOverrunAlertService } from '../../services/budgetOverrunAlertService'
import { pool } from '../../database/connection'

describe('BudgetOverrunAlertService', () => {
  const testProjectId = '123e4567-e89b-12d3-a456-426614174000'
  const testUserId = '123e4567-e89b-12d3-a456-426614174001'
  
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM budget_overrun_alerts WHERE project_id = $1', [testProjectId])
    await pool.query('DELETE FROM meetings WHERE project_id = $1', [testProjectId])
    await pool.end()
  })
  
  describe('processBudgetOverrun', () => {
    it('should create emergency alert for 30% budget overrun', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Test Project',
        approvedBudget: 100000,
        projectedCost: 130000,
        overrunAmount: 30000,
        overrunPercentage: 30,
        rootCause: {
          category: 'Scope Creep',
          description: 'Unapproved features added',
          preventable: true
        }
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      expect(alert).toBeDefined()
      expect(alert.id).toBeDefined()
      expect(alert.severity).toBe('emergency')
      expect(alert.overrunPercentage).toBe(30)
      expect(alert.escalatedTo).toContain('CEO')
      expect(alert.escalatedTo).toContain('CFO')
      
      // Emergency budget overrun should auto-schedule meeting
      expect(alert.meetingId).toBeDefined()
    })
    
    it('should create critical alert for 15% budget overrun', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Test Project',
        approvedBudget: 100000,
        projectedCost: 115000,
        overrunAmount: 15000,
        overrunPercentage: 15
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      expect(alert.severity).toBe('critical')
      expect(alert.escalatedTo).toContain('CFO')
      expect(alert.escalatedTo).toContain('Project_Sponsor')
      
      // Critical budget overrun should also auto-schedule meeting
      expect(alert.meetingId).toBeDefined()
    })
    
    it('should create warning alert for 7% budget overrun', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Test Project',
        approvedBudget: 100000,
        projectedCost: 107000,
        overrunAmount: 7000,
        overrunPercentage: 7
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      expect(alert.severity).toBe('warning')
      expect(alert.escalatedTo).toContain('Project_Manager')
      expect(alert.escalatedTo).toContain('Finance_Controller')
      
      // Warning level should not auto-schedule meeting
      expect(alert.meetingId).toBeUndefined()
    })
    
    it('should generate corrective options', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Test Project',
        approvedBudget: 100000,
        projectedCost: 120000,
        overrunAmount: 20000,
        overrunPercentage: 20
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      // Retrieve full alert to check corrective options
      const fullAlert = await budgetOverrunAlertService.getAlert(alert.id)
      const options = JSON.parse(fullAlert.corrective_options)
      
      expect(options).toBeDefined()
      expect(options.length).toBeGreaterThan(0)
      
      // Should have standard options
      const optionTitles = options.map((o: any) => o.option)
      expect(optionTitles).toContain('Approve additional funding')
      expect(optionTitles).toContain('Reduce scope to baseline')
    })
  })
  
  describe('listAlerts', () => {
    it('should list alerts for a project', async () => {
      // Create a test alert first
      await budgetOverrunAlertService.processBudgetOverrun(
        {
          projectId: testProjectId,
          projectName: 'Test Project',
          approvedBudget: 100000,
          projectedCost: 110000,
          overrunAmount: 10000,
          overrunPercentage: 10
        },
        testUserId
      )
      
      const alerts = await budgetOverrunAlertService.listAlerts(testProjectId)
      
      expect(alerts).toBeDefined()
      expect(alerts.length).toBeGreaterThan(0)
    })
    
    it('should filter alerts by severity', async () => {
      const alerts = await budgetOverrunAlertService.listAlerts(
        testProjectId,
        { severity: 'emergency' }
      )
      
      expect(alerts).toBeDefined()
      alerts.forEach(alert => {
        expect(alert.severity).toBe('emergency')
      })
    })
  })
  
  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Test Project',
        approvedBudget: 100000,
        projectedCost: 108000,
        overrunAmount: 8000,
        overrunPercentage: 8
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      await budgetOverrunAlertService.acknowledgeAlert(alert.id, testUserId)
      
      const updatedAlert = await budgetOverrunAlertService.getAlert(alert.id)
      expect(updatedAlert.status).toBe('acknowledged')
    })
  })
  
  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      const detection = {
        projectId: testProjectId,
        projectName: 'Test Project',
        approvedBudget: 100000,
        projectedCost: 106000,
        overrunAmount: 6000,
        overrunPercentage: 6
      }
      
      const alert = await budgetOverrunAlertService.processBudgetOverrun(
        detection,
        testUserId
      )
      
      const resolutionNotes = 'Scope reduced to baseline, back within budget'
      await budgetOverrunAlertService.resolveAlert(alert.id, testUserId, resolutionNotes)
      
      const resolvedAlert = await budgetOverrunAlertService.getAlert(alert.id)
      expect(resolvedAlert.status).toBe('resolved')
      expect(resolvedAlert.resolution_notes).toBe(resolutionNotes)
      expect(resolvedAlert.resolved_by).toBe(testUserId)
    })
  })
})
