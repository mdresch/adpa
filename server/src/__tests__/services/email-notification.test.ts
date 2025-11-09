/**
 * Email Notification Service Tests
 * TASK-739: Email notification system
 */

import { EmailNotificationService, PositiveDriftEmailData, BudgetOverrunEmailData, ScopeCreepEmailData } from '../../services/emailNotificationService'

describe('EmailNotificationService', () => {
  let emailService: EmailNotificationService

  beforeEach(() => {
    // Create a new instance for each test
    emailService = new EmailNotificationService()
  })

  describe('Email Template Generation', () => {
    test('should generate positive drift email HTML with all data', () => {
      const testData: PositiveDriftEmailData = {
        title: 'AI Cost Optimization',
        description: 'Team switched from GPT-4 to Claude Sonnet',
        projectId: 'test-project-id',
        projectName: 'CRM Upgrade',
        costSavings: 2500,
        timeAcceleration: 15,
        qualityImprovement: 10,
        potentialValue: 30000,
        replicableProjects: 12,
        severity: 'medium',
        recommendations: [
          'Approve Claude as preferred provider',
          'Update AI provider standards',
          'Apply to similar projects'
        ],
        changeRequestId: 'CR-2025-042',
        deadline: new Date('2025-10-18')
      }

      // Access private method for testing
      const html = (emailService as any).generatePositiveDriftEmailHTML(testData)

      expect(html).toContain('Positive Drift Detected')
      expect(html).toContain('AI Cost Optimization')
      expect(html).toContain('$2,500')
      expect(html).toContain('15 days')
      expect(html).toContain('10%')
      expect(html).toContain('$30,000')
      expect(html).toContain('12 projects')
      expect(html).toContain('Approve Claude as preferred provider')
      expect(html).toContain('CR-2025-042')
    })

    test('should generate positive drift email text format', () => {
      const testData: PositiveDriftEmailData = {
        title: 'Process Improvement',
        description: 'Automated manual workflow',
        projectName: 'Automation Project',
        costSavings: 5000,
        potentialValue: 60000,
        replicableProjects: 8,
        severity: 'medium'
      }

      const text = (emailService as any).generatePositiveDriftEmailText(testData)

      expect(text).toContain('POSITIVE DRIFT DETECTED')
      expect(text).toContain('Process Improvement')
      expect(text).toContain('$5,000')
      expect(text).toContain('$60,000')
      expect(text).toContain('8 projects')
    })

    test('should generate budget overrun email HTML for critical alert', () => {
      const testData: BudgetOverrunEmailData = {
        projectId: 'test-project',
        projectName: 'CRM Implementation',
        approvedBudget: 500000,
        projectedCost: 725000,
        overrunAmount: 225000,
        overrunPercentage: 45,
        severity: 'critical',
        deadline: new Date('2025-10-20'),
        rootCause: 'Scope increased by 40% without approval',
        options: [
          {
            option: 'Approve additional $225K',
            impact: 'Complete all 7 modules',
            recommendation: false
          },
          {
            option: 'Remove 4 additional modules',
            impact: 'Stay within $500K budget',
            recommendation: true
          }
        ]
      }

      const html = (emailService as any).generateBudgetOverrunEmailHTML(testData)

      expect(html).toContain('CRITICAL')
      expect(html).toContain('Budget Overrun')
      expect(html).toContain('45.0%')
      expect(html).toContain('$500,000')
      expect(html).toContain('$725,000')
      expect(html).toContain('$225,000')
      expect(html).toContain('Scope increased by 40%')
      expect(html).toContain('RECOMMENDED')
    })

    test('should generate budget overrun email HTML for emergency alert', () => {
      const testData: BudgetOverrunEmailData = {
        projectName: 'High Priority Project',
        approvedBudget: 1000000,
        projectedCost: 1300000,
        overrunAmount: 300000,
        overrunPercentage: 30,
        severity: 'emergency'
      }

      const html = (emailService as any).generateBudgetOverrunEmailHTML(testData)

      expect(html).toContain('EMERGENCY')
      expect(html).toContain('30.0%')
      expect(html).toContain('$300,000')
    })

    test('should generate scope creep email HTML', () => {
      const testData: ScopeCreepEmailData = {
        projectName: 'Website Redesign',
        baselineScope: ['Homepage', 'About Page', 'Contact Page'],
        currentScope: [
          'Homepage',
          'About Page',
          'Contact Page',
          'Blog',
          'E-commerce',
          'Customer Portal',
          'API Integration'
        ],
        scopeIncrease: 133,
        severity: 'critical',
        unapprovedFeatures: ['Blog', 'E-commerce', 'Customer Portal', 'API Integration']
      }

      const html = (emailService as any).generateScopeCreepEmailHTML(testData)

      expect(html).toContain('CRITICAL')
      expect(html).toContain('Scope Creep')
      expect(html).toContain('133%')
      expect(html).toContain('Baseline Scope (3 items)')
      expect(html).toContain('Current Scope (7 items)')
      expect(html).toContain('Blog')
      expect(html).toContain('(NEW)')
    })

    test('should generate scope creep email text format', () => {
      const testData: ScopeCreepEmailData = {
        projectName: 'Mobile App',
        baselineScope: ['User Auth', 'Dashboard'],
        currentScope: ['User Auth', 'Dashboard', 'Social Features'],
        scopeIncrease: 50,
        severity: 'warning',
        unapprovedFeatures: ['Social Features']
      }

      const text = (emailService as any).generateScopeCreepEmailText(testData)

      expect(text).toContain('SCOPE CREEP DETECTED')
      expect(text).toContain('50%')
      expect(text).toContain('User Auth')
      expect(text).toContain('Dashboard')
      expect(text).toContain('Social Features')
      expect(text).toContain('(NEW - UNAPPROVED)')
    })
  })

  describe('Email Configuration', () => {
    test('should handle missing SMTP configuration gracefully', () => {
      // The service should initialize even without SMTP config
      expect(emailService).toBeDefined()
    })

    test('should be able to check configuration status', async () => {
      // Without valid SMTP config, this should return false
      const isConfigured = await emailService.testEmailConfiguration()
      // Will be false in test environment without SMTP
      expect(typeof isConfigured).toBe('boolean')
    })
  })

  describe('Recipient Management', () => {
    // Note: These tests would need database mocking in a real scenario
    test('should define getUsersByRoles method', () => {
      expect(typeof emailService.getUsersByRoles).toBe('function')
    })

    test('should define getProjectStakeholders method', () => {
      expect(typeof emailService.getProjectStakeholders).toBe('function')
    })
  })

  describe('Notification Methods', () => {
    test('should define sendPositiveDriftNotification method', () => {
      expect(typeof emailService.sendPositiveDriftNotification).toBe('function')
    })

    test('should define sendBudgetOverrunAlert method', () => {
      expect(typeof emailService.sendBudgetOverrunAlert).toBe('function')
    })

    test('should define sendScopeCreepAlert method', () => {
      expect(typeof emailService.sendScopeCreepAlert).toBe('function')
    })

    test('should define sendEmail method', () => {
      expect(typeof emailService.sendEmail).toBe('function')
    })
  })
})
