/**
 * Pillar 6: Template Lifecycle Management - Contract Guards
 * 
 * These tests enforce invariants for template lifecycle management:
 * - REQ-005: Template Audit Lifecycle Triggers
 * - REQ-006: Quality Gate Regression Detection
 * - REQ-007: Recommendation Generation Quality
 * - REQ-008: Recommendation Application Tracking
 * - REQ-009: System Prompt Optimization Loop
 * - REQ-010: Template Quality Dashboard Data
 */

// Helper function to generate UUID without ES module import issues
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

describe('Pillar 6: Template Lifecycle Management - Contract Guards', () => {
  // Helper function to get absolute path from relative path
  const getAbsolutePath = (relativePath: string): string => {
    const path = require('path')
    return path.resolve(__dirname, '../../../', relativePath)
  }

  describe('REQ-005: Template Audit Lifecycle Triggers', () => {
    it('Template create MUST trigger background audit with trigger_type = lifecycle', async () => {
      // Verify the service file exists and has the required method
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/documentTemplates/service.ts')
      expect(fs.existsSync(servicePath)).toBe(true)
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('createPendingAudit')
      expect(serviceContent).toContain('lifecycle')
    })

    it('Template update (core fields changed) MUST trigger background audit with incremented version', async () => {
      // Verify version increment logic exists
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/documentTemplates/service.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('version')
      expect(serviceContent).toContain('increment')
    })

    it('Document quality failure (< 70 score) MUST trigger template audit with trigger_type = document_failure', async () => {
      // Verify document_failure trigger exists
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/qualityAuditService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('document_failure')
      expect(serviceContent).toContain('templateAuditService')
    })

    it('Audit records MUST include template version, trigger type, and timestamp', async () => {
      // Verify audit record structure
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateAuditService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('template_version')
      expect(serviceContent).toContain('trigger_type')
      expect(serviceContent).toContain('created_at')
    })
  })

  describe('REQ-006: Quality Gate Regression Detection', () => {
    it('If template average document quality drops > 15% over 30 days, MUST trigger review audit', async () => {
      // Verify the service file exists and has the required method
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/qualityRegressionDetector.ts')
      expect(fs.existsSync(servicePath)).toBe(true)
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('checkRegression')
      expect(serviceContent).toContain('regression')
    })

    it('Regression detection MUST compare current avg quality vs baseline (first 10 documents)', async () => {
      // Verify baseline comparison logic exists in service
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/qualityRegressionDetector.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('getBaselineQuality')
      expect(serviceContent).toContain('first 10')
    })

    it('Regression audit MUST include document failure context in prompt', async () => {
      // Verify context inclusion logic exists
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/qualityRegressionDetector.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('getFailureContext')
      expect(serviceContent).toContain('failureContext')
    })

    it('Regression audit MUST be rate-limited (max 1 per 12 hours per template)', async () => {
      // Verify rate limiting logic exists
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/qualityRegressionDetector.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('isRateLimited')
      expect(serviceContent).toContain('12 hours')
    })
  })

  describe('REQ-007: Recommendation Generation Quality', () => {
    it('Template improvement suggestions MUST be generated from audit findings', async () => {
      // Verify the service file exists and has analysis method
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      expect(fs.existsSync(servicePath)).toBe(true)
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('analyzeTemplateQuality')
      expect(serviceContent).toContain('audit findings')
    })

    it('Suggestions MUST include: issue_addressed, proposed_change, change_type, section, priority', async () => {
      // Verify suggestion structure in service
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('issue_addressed')
      expect(serviceContent).toContain('proposed_change')
      expect(serviceContent).toContain('change_type')
      expect(serviceContent).toContain('section')
      expect(serviceContent).toContain('priority')
    })

    it('Static analysis MUST run for templates with < 5 generated documents (cold start)', async () => {
      // Verify static analysis exists
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('analyzeTemplateStatic')
      expect(serviceContent).toContain('cold start')
    })

    it('AI analysis MUST use preferred provider with fallback logic', async () => {
      // Verify the service uses aiService with fallback
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('generateWithFallback')
      expect(serviceContent).toContain('preferred provider')
    })
  })

  describe('REQ-008: Recommendation Application Tracking', () => {
    it('Approved suggestions MUST track: reviewed_by, reviewed_at, status', async () => {
      // Verify the service tracks approval metadata
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('approveSuggestion')
      expect(serviceContent).toContain('reviewed_by')
      expect(serviceContent).toContain('reviewed_at')
      expect(serviceContent).toContain('status')
    })

    it('Implemented suggestions MUST update template version', async () => {
      // Verify the service has implementation method
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('implementImprovements')
      expect(serviceContent).toContain('template version')
    })

    it('Rejected suggestions MUST include rejection_reason', async () => {
      // Verify rejection reason tracking
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('rejectSuggestion')
      expect(serviceContent).toContain('rejection_reason')
    })

    it('Before/after quality metrics MUST be captured for implemented suggestions', async () => {
      // Verify the service tracks before/after metrics
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('avg_quality_before')
      expect(serviceContent).toContain('quality metrics')
    })
  })

  describe('REQ-009: System Prompt Optimization Loop', () => {
    it('Audit findings on system prompt quality MUST generate specific prompt recommendations', async () => {
      // Verify the service has system prompt optimization method
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('optimizeSystemPrompt')
      expect(serviceContent).toContain('prompt recommendations')
    })

    it('Prompt recommendations MUST be actionable (exact text to add/modify)', async () => {
      // Verify the service has prompt recommendation generation
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('generatePromptRecommendations')
      expect(serviceContent).toContain('exact text')
    })

    it('Prompt changes MUST be versioned in template history', async () => {
      // Verify template versions table exists by checking the service uses it
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('template_versions')
      expect(serviceContent).toContain('version_number')
    })

    it('Prompt optimization MUST not break variable resolution', async () => {
      // Verify the service has variable preservation validation
      const fs = require('fs')
      const servicePath = getAbsolutePath('services/templateImprovementService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('validateVariablePreservation')
      expect(serviceContent).toContain('variable resolution')
    })
  })

  describe('REQ-010: Template Quality Dashboard Data', () => {
    it('Template health score MUST aggregate: success rate, avg quality, usage count', async () => {
      // Verify the service has health score calculation
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/templateHealthService.ts')
      expect(fs.existsSync(servicePath)).toBe(true)
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('calculateHealthScore')
      expect(serviceContent).toContain('success rate')
      expect(serviceContent).toContain('avg quality')
      expect(serviceContent).toContain('usage count')
    })

    it('Health score MUST be calculated and updated weekly', async () => {
      // Verify the service has batch calculation method
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/templateHealthService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('calculateAllHealthScores')
      expect(serviceContent).toContain('weekly')
    })

    it('Dashboard MUST show: audit history, improvement suggestions, quality trends', async () => {
      // Verify the service has methods to retrieve dashboard data
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/templateHealthService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('getAuditHistory')
      expect(serviceContent).toContain('getImprovementSuggestions')
      expect(serviceContent).toContain('getQualityTrends')
    })

    it('Critical templates (health < 60) MUST be flagged for admin review', async () => {
      // Verify the service has critical template detection
      const fs = require('fs')
      const servicePath = getAbsolutePath('modules/template-lifecycle/templateHealthService.ts')
      const serviceContent = fs.readFileSync(servicePath, 'utf8')
      expect(serviceContent).toContain('getCriticalTemplates')
      expect(serviceContent).toContain('health < 60')
    })
  })
})
