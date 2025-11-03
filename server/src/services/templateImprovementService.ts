/**
 * Template Improvement Service
 * Analyzes template performance and generates AI-powered improvement suggestions
 * 
 * Features:
 * - Weekly automated template analysis
 * - Common issue pattern detection
 * - AI-generated specific improvements
 * - Template version control
 * - Quality tracking before/after
 */

import { pool } from '../database/connection'
import { aiService } from './aiService'
import { logger } from '../utils/logger'

interface TemplateQualityMetrics {
  avgQuality: number
  avgCompleteness: number
  avgConsistency: number
  avgProfessionalQuality: number
  avgStandardsCompliance: number
  avgAccuracy: number
  avgContextRelevance: number
  documentCount: number
  lowestScore: number
  highestScore: number
  standardDeviation: number
}

interface ImprovementSuggestion {
  issueAddressed: string
  proposedChange: string
  changeType: string
  section: string
  expectedImpact: {
    dimension: string
    currentScore: number
    predictedScore: number
    gain: number
  }
  priority: string
  implementationDifficulty: string
  rationale: string
}

class TemplateImprovementService {
  /**
   * Analyze template performance and generate improvement suggestions
   * Runs weekly as a background job
   */
  async analyzeTemplateQuality(templateId: string): Promise<void> {
    logger.info('[TEMPLATE-IMPROVEMENT] Analyzing template', { templateId })

    try {
      // 1. Get template details
      const template = await this.getTemplate(templateId)
      
      if (!template) {
        logger.warn('[TEMPLATE-IMPROVEMENT] Template not found', { templateId })
        return
      }

      // 2. Get quality audit history (last 30 days)
      const auditHistory = await this.getAuditHistory(templateId, 30)
      
      if (auditHistory.length < 5) {
        logger.info('[TEMPLATE-IMPROVEMENT] Insufficient data for analysis', {
          templateId,
          auditCount: auditHistory.length,
          required: 5
        })
        return // Need at least 5 audits for meaningful analysis
      }

      logger.info('[TEMPLATE-IMPROVEMENT] Analyzing quality history', {
        templateId,
        auditCount: auditHistory.length
      })

      // 3. Calculate aggregate quality metrics
      const qualityMetrics = this.calculateAggregateMetrics(auditHistory)
      
      // 4. Extract common issues and patterns
      const commonIssues = this.extractCommonIssues(auditHistory)
      const issueFrequency = this.calculateIssueFrequency(commonIssues, auditHistory.length)
      
      logger.info('[TEMPLATE-IMPROVEMENT] Found common issues', {
        templateId,
        issueCount: commonIssues.length,
        avgQuality: qualityMetrics.avgQuality
      })

      // 5. Use AI to analyze template and suggest improvements
      const improvements = await this.generateImprovementSuggestions(
        template,
        qualityMetrics,
        commonIssues,
        issueFrequency
      )
      
      if (!improvements || improvements.length === 0) {
        logger.info('[TEMPLATE-IMPROVEMENT] No improvements suggested', { templateId })
        return
      }

      // 6. Calculate expected quality gain
      const expectedGain = this.estimateQualityGain(qualityMetrics, improvements)
      
      // 7. Determine priority
      const priority = this.calculatePriority(
        qualityMetrics.avgQuality,
        expectedGain,
        auditHistory.length
      )
      
      logger.info('[TEMPLATE-IMPROVEMENT] Generated suggestions', {
        templateId,
        suggestionCount: improvements.length,
        expectedGain,
        priority
      })

      // 8. Save improvement suggestions
      await this.saveImprovementSuggestions({
        templateId,
        qualityMetrics,
        commonIssues,
        issueFrequency,
        improvements,
        expectedGain,
        priority
      })
      
      // 9. Notify template owner if high/critical priority
      if (priority === 'critical' || priority === 'high') {
        await this.notifyTemplateOwner(template, improvements, priority)
      }

      logger.info('[TEMPLATE-IMPROVEMENT] Analysis complete', {
        templateId,
        priority,
        expectedGain
      })
    } catch (error) {
      logger.error('[TEMPLATE-IMPROVEMENT] Analysis failed', {
        templateId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Get template details
   */
  private async getTemplate(templateId: string): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM templates WHERE id = $1 AND deleted_at IS NULL',
      [templateId]
    )
    
    return result.rows[0] || null
  }

  /**
   * Get quality audit history for a template
   */
  private async getAuditHistory(templateId: string, days: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT qa.*
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       AND qa.audited_at > NOW() - ($2 * INTERVAL '1 day')
       ORDER BY qa.audited_at DESC`,
      [templateId, days]
    )

    return result.rows
  }

  /**
   * Calculate aggregate quality metrics from audit history
   */
  private calculateAggregateMetrics(auditHistory: any[]): TemplateQualityMetrics {
    const count = auditHistory.length
    
    const scores = auditHistory.map(a => a.overall_score)
    
    return {
      avgQuality: Math.round(
        auditHistory.reduce((sum, a) => sum + a.overall_score, 0) / count
      ),
      avgCompleteness: Math.round(
        auditHistory.reduce((sum, a) => sum + a.completeness_score, 0) / count
      ),
      avgConsistency: Math.round(
        auditHistory.reduce((sum, a) => sum + a.consistency_score, 0) / count
      ),
      avgProfessionalQuality: Math.round(
        auditHistory.reduce((sum, a) => sum + a.professional_quality_score, 0) / count
      ),
      avgStandardsCompliance: Math.round(
        auditHistory.reduce((sum, a) => sum + a.standards_compliance_score, 0) / count
      ),
      avgAccuracy: Math.round(
        auditHistory.reduce((sum, a) => sum + a.accuracy_score, 0) / count
      ),
      avgContextRelevance: Math.round(
        auditHistory.reduce((sum, a) => sum + a.context_relevance_score, 0) / count
      ),
      documentCount: count,
      lowestScore: Math.min(...scores),
      highestScore: Math.max(...scores),
      standardDeviation: this.calculateStdDev(scores)
    }
  }

  /**
   * Extract and categorize common issues across audits
   */
  private extractCommonIssues(auditHistory: any[]): any[] {
    const issueMap = new Map<string, any>()
    
    auditHistory.forEach(audit => {
      const issues = audit.issues || []
      
      issues.forEach((issue: any) => {
        const key = `${issue.dimension}:${issue.description}`
        
        if (issueMap.has(key)) {
          const existing = issueMap.get(key)!
          existing.count++
        } else {
          issueMap.set(key, {
            ...issue,
            count: 1
          })
        }
      })
    })
    
    // Return issues that appear in >20% of audits
    const threshold = auditHistory.length * 0.2
    return Array.from(issueMap.values())
      .filter(issue => issue.count >= threshold)
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Calculate how frequently each issue appears (%)
   */
  private calculateIssueFrequency(commonIssues: any[], totalAudits: number): any {
    const frequency: any = {}
    
    commonIssues.forEach(issue => {
      const key = `${issue.dimension}:${issue.description}`
      frequency[key] = Math.round((issue.count / totalAudits) * 100)
    })
    
    return frequency
  }

  /**
   * Use AI to generate specific template improvement suggestions
   */
  private async generateImprovementSuggestions(
    template: any,
    qualityMetrics: TemplateQualityMetrics,
    commonIssues: any[],
    issueFrequency: any
  ): Promise<ImprovementSuggestion[]> {
    const analysisPrompt = this.buildImprovementPrompt(
      template,
      qualityMetrics,
      commonIssues,
      issueFrequency
    )

    logger.info('[TEMPLATE-IMPROVEMENT] Generating AI suggestions', {
      templateId: template.id,
      avgQuality: qualityMetrics.avgQuality,
      issueCount: commonIssues.length
    })

    try {
      const result = await aiService.generate({
        provider: 'google',
        model: 'gemini-2.5-flash',
        systemPrompt: `You are an expert in document template design and AI prompt engineering. You analyze template performance and suggest specific, actionable improvements. Always respond with valid JSON only. Do not include any explanatory text before or after the JSON.`,
        userPrompt: analysisPrompt,
        temperature: 0.5,
        maxTokens: 4000
      })

      const parsed = JSON.parse(result.content)
      return parsed.improvements || []
    } catch (error) {
      logger.error('[TEMPLATE-IMPROVEMENT] AI suggestion generation failed', {
        templateId: template.id,
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Build prompt for AI improvement analysis
   */
  private buildImprovementPrompt(
    template: any,
    qualityMetrics: TemplateQualityMetrics,
    commonIssues: any[],
    issueFrequency: any
  ): string {
    const templateContent = typeof template.content === 'string' 
      ? template.content 
      : JSON.stringify(template.content)

    const issuesText = commonIssues.map((issue, idx) => {
      const key = `${issue.dimension}:${issue.description}`
      const freq = issueFrequency[key] || 0
      
      return `${idx + 1}. **${issue.dimension}** (Frequency: ${freq}% of documents)
   - Description: ${issue.description}
   - Severity: ${issue.severity || 'minor'}
   - Count: ${issue.count} out of ${qualityMetrics.documentCount} documents`
    }).join('\n\n')

    return `# Template Improvement Analysis

Analyze this template and suggest specific improvements to address common quality issues.

## Template Information
**Name**: ${template.name}
**Type**: ${template.type || 'unknown'}
**Framework**: ${template.framework || 'unknown'}

## Current Template Content:
${templateContent.substring(0, 10000)}${templateContent.length > 10000 ? '\n... (content truncated for analysis)' : ''}

## System Prompt:
${template.system_prompt || 'No system prompt defined'}

## Quality Performance (last 30 days)
- **Documents Generated**: ${qualityMetrics.documentCount}
- **Average Overall Quality**: ${qualityMetrics.avgQuality}%
- **Average Completeness**: ${qualityMetrics.avgCompleteness}%
- **Average Consistency**: ${qualityMetrics.avgConsistency}%
- **Average Professional Quality**: ${qualityMetrics.avgProfessionalQuality}%
- **Average Standards Compliance**: ${qualityMetrics.avgStandardsCompliance}%
- **Quality Range**: ${qualityMetrics.lowestScore}% - ${qualityMetrics.highestScore}%

## Common Issues Found:

${issuesText}

## Your Task:

Suggest **5-10 specific, actionable improvements** to increase quality scores and address common issues.

For each improvement, provide:
1. **Issue Addressed**: Which specific issue(s) this fixes
2. **Proposed Change**: Exact text to add or modify in the template
3. **Change Type**: prompt_enhancement | structure_improvement | validation_rule | example_addition | clarity_improvement
4. **Section**: Which section to modify (or 'system_prompt')
5. **Expected Impact**: Predict quality improvement
6. **Priority**: critical | high | medium | low
7. **Implementation Difficulty**: easy | moderate | complex
8. **Rationale**: Why this will help

## Response Format (MUST BE VALID JSON):
\`\`\`json
{
  "improvements": [
    {
      "issue_addressed": "Consistency issues in stakeholder names",
      "proposed_change": "Add instruction: 'Use consistent stakeholder names. Create a name glossary at the start and reference it throughout.'",
      "change_type": "validation_rule",
      "section": "system_prompt",
      "expected_impact": {
        "dimension": "consistency",
        "current_score": 65,
        "predicted_score": 85,
        "gain": 20
      },
      "priority": "high",
      "implementation_difficulty": "easy",
      "rationale": "Consistency issues appear in 65% of documents. Adding explicit naming guidelines will reduce variations."
    }
  ],
  "overall_expected_gain": 15,
  "summary": "Add consistency guidelines, improve structure, add examples"
}
\`\`\`

Focus on the most impactful improvements. Be specific and actionable.`
  }

  /**
   * Estimate quality gain from implementing improvements
   */
  private estimateQualityGain(
    qualityMetrics: TemplateQualityMetrics,
    improvements: ImprovementSuggestion[]
  ): number {
    // Sum expected gains from individual improvements
    const totalGain = improvements.reduce(
      (sum, imp) => sum + (imp.expectedImpact?.gain || 0),
      0
    )
    
    // Cap at realistic maximum (diminishing returns)
    const maxGain = 100 - qualityMetrics.avgQuality
    return Math.min(totalGain, Math.round(maxGain * 0.8)) // 80% of theoretical max
  }

  /**
   * Calculate improvement priority based on quality and impact
   */
  private calculatePriority(
    currentQuality: number,
    expectedGain: number,
    sampleSize: number
  ): string {
    // Critical: Quality < 70% and expected gain > 10 points
    if (currentQuality < 70 && expectedGain > 10) return 'critical'
    
    // High: Quality < 80% and expected gain > 8 points
    if (currentQuality < 80 && expectedGain > 8) return 'high'
    
    // Medium: Quality < 85% and expected gain > 5 points
    if (currentQuality < 85 && expectedGain > 5) return 'medium'
    
    // Low: Everything else
    return 'low'
  }

  /**
   * Save improvement suggestions to database
   */
  private async saveImprovementSuggestions(data: any): Promise<string> {
    const result = await pool.query(
      `INSERT INTO template_improvement_suggestions (
        template_id, analysis_period_start, analysis_period_end, documents_analyzed,
        current_avg_quality, current_completeness, current_consistency,
        current_professional_quality, current_standards_compliance,
        common_issues, issue_frequency, suggested_improvements,
        improvement_rationale, expected_quality_gain, priority,
        analyzer_ai_provider, analyzer_ai_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id`,
      [
        data.templateId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date(),
        data.qualityMetrics.documentCount,
        data.qualityMetrics.avgQuality,
        data.qualityMetrics.avgCompleteness,
        data.qualityMetrics.avgConsistency,
        data.qualityMetrics.avgProfessionalQuality,
        data.qualityMetrics.avgStandardsCompliance,
        JSON.stringify(data.commonIssues),
        JSON.stringify(data.issueFrequency),
        JSON.stringify(data.improvements),
        data.improvements[0]?.rationale || 'See individual improvements for details',
        data.expectedGain,
        data.priority,
        'google',
        'gemini-2.5-flash'
      ]
    )

    const suggestionId = result.rows[0].id
    
    logger.info('[TEMPLATE-IMPROVEMENT] Suggestions saved', {
      suggestionId,
      templateId: data.templateId,
      priority: data.priority
    })

    return suggestionId
  }

  /**
   * Notify template owner of high-priority improvements
   */
  private async notifyTemplateOwner(
    template: any,
    improvements: ImprovementSuggestion[],
    priority: string
  ): Promise<void> {
    logger.info('[TEMPLATE-IMPROVEMENT] Notifying owner', {
      templateId: template.id,
      templateName: template.name,
      priority,
      improvementCount: improvements.length
    })
    
    // TODO: Integrate with notification system
    // For now, just log the notification
    logger.info('[TEMPLATE-IMPROVEMENT] Notification logged', {
      templateId: template.id,
      message: `Template "${template.name}" has ${priority} priority improvements pending review`
    })
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
    return Math.round(Math.sqrt(avgSquaredDiff) * 100) / 100
  }

  /**
   * Get pending improvement suggestions
   */
  async getPendingSuggestions(filters?: {
    status?: string
    priority?: string
    templateId?: string
  }): Promise<any[]> {
    let query = `
      SELECT 
        tis.*,
        t.name as template_name,
        t.type as template_type,
        t.framework
      FROM template_improvement_suggestions tis
      JOIN templates t ON tis.template_id = t.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (filters?.status) {
      query += ` AND tis.status = $${paramIndex++}`
      params.push(filters.status)
    }

    if (filters?.priority) {
      query += ` AND tis.priority = $${paramIndex++}`
      params.push(filters.priority)
    }

    if (filters?.templateId) {
      query += ` AND tis.template_id = $${paramIndex++}`
      params.push(filters.templateId)
    }

    query += `
      ORDER BY 
        CASE tis.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        tis.created_at DESC
    `

    const result = await pool.query(query, params)
    return result.rows
  }

  /**
   * Approve improvement suggestion
   */
  async approveSuggestion(suggestionId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE template_improvement_suggestions
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [userId, suggestionId]
    )

    logger.info('[TEMPLATE-IMPROVEMENT] Suggestion approved', {
      suggestionId,
      userId
    })
  }

  /**
   * Reject improvement suggestion
   */
  async rejectSuggestion(
    suggestionId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    await pool.query(
      `UPDATE template_improvement_suggestions
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2
       WHERE id = $3`,
      [userId, reason, suggestionId]
    )

    logger.info('[TEMPLATE-IMPROVEMENT] Suggestion rejected', {
      suggestionId,
      userId,
      reason
    })
  }

  /**
   * Implement approved improvements
   */
  async implementImprovements(
    suggestionId: string,
    userId: string
  ): Promise<void> {
    logger.info('[TEMPLATE-IMPROVEMENT] Implementing improvements', {
      suggestionId,
      userId
    })

    // 1. Get improvement suggestion
    const suggestion = await this.getSuggestion(suggestionId)
    
    if (!suggestion) {
      throw new Error(`Suggestion not found: ${suggestionId}`)
    }

    if (suggestion.status !== 'approved' && suggestion.status !== 'pending_review') {
      throw new Error(`Suggestion status is ${suggestion.status}, must be approved or pending_review`)
    }

    // 2. Get current template
    const template = await this.getTemplate(suggestion.template_id)
    
    if (!template) {
      throw new Error(`Template not found: ${suggestion.template_id}`)
    }

    // 3. Apply improvements to template content
    const newContent = await this.applyImprovements(
      template,
      suggestion.suggested_improvements
    )

    // 4. Get current version number
    const latestVersion = await this.getLatestTemplateVersion(suggestion.template_id)
    const newVersionNumber = latestVersion ? parseInt(latestVersion.version_number) + 1 : 1

    // 5. Create new template version
    await pool.query(
      `INSERT INTO template_versions (
        template_id, version_number, content, system_prompt,
        avg_quality_before, change_summary, improvement_suggestion_id,
        created_by, name, description, framework, category, change_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        suggestion.template_id,
        newVersionNumber,
        typeof newContent === 'string' ? newContent : JSON.stringify(newContent),
        template.system_prompt,
        suggestion.current_avg_quality,
        this.generateChangesSummary(suggestion.suggested_improvements),
        suggestionId,
        userId,
        template.name,
        template.description,
        template.framework,
        template.category,
        'quality_improvement'
      ]
    )

    // 6. Update main template
    await pool.query(
      `UPDATE templates
       SET content = $1, updated_at = NOW()
       WHERE id = $2`,
      [typeof newContent === 'string' ? newContent : JSON.stringify(newContent), suggestion.template_id]
    )

    // 7. Mark suggestion as implemented
    await pool.query(
      `UPDATE template_improvement_suggestions
       SET status = 'implemented', implemented_by = $1, implemented_at = NOW()
       WHERE id = $2`,
      [userId, suggestionId]
    )

    logger.info('[TEMPLATE-IMPROVEMENT] Improvements implemented', {
      templateId: suggestion.template_id,
      version: newVersionNumber,
      suggestionId
    })
  }

  /**
   * Get improvement suggestion
   */
  private async getSuggestion(suggestionId: string): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM template_improvement_suggestions WHERE id = $1',
      [suggestionId]
    )
    return result.rows[0] || null
  }

  /**
   * Get latest template version
   */
  private async getLatestTemplateVersion(templateId: string): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM template_versions 
       WHERE template_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [templateId]
    )
    return result.rows[0] || null
  }

  /**
   * Apply improvements to template content
   */
  private async applyImprovements(
    template: any,
    improvements: any[]
  ): Promise<any> {
    // For now, return template content with improvements appended as comments
    // In future, implement smart template modification
    
    let content = typeof template.content === 'string' 
      ? template.content 
      : JSON.stringify(template.content, null, 2)

    const improvementNotes = `

<!-- QUALITY IMPROVEMENTS APPLIED -->
<!-- Date: ${new Date().toISOString()} -->
${improvements.map((imp, idx) => `<!-- Improvement ${idx + 1}: ${imp.issue_addressed} -->`).join('\n')}
<!-- See template_improvement_suggestions for details -->
`

    content += improvementNotes

    return content
  }

  /**
   * Generate human-readable changes summary
   */
  private generateChangesSummary(improvements: any[]): string {
    if (!improvements || improvements.length === 0) {
      return 'Template improvements applied'
    }

    const summary = improvements
      .slice(0, 3)
      .map(imp => `- ${imp.issue_addressed}: ${imp.change_type}`)
      .join('\n')

    const remaining = improvements.length - 3
    return summary + (remaining > 0 ? `\n- ... and ${remaining} more improvements` : '')
  }

  /**
   * Run quality analysis for all templates (weekly job)
   */
  async analyzeAllTemplates(): Promise<void> {
    logger.info('[TEMPLATE-IMPROVEMENT] Starting weekly template analysis')

    try {
      // Get all active templates
      const templates = await pool.query(`
        SELECT id, name
        FROM templates
        WHERE deleted_at IS NULL
        AND archived_at IS NULL
      `)

      logger.info('[TEMPLATE-IMPROVEMENT] Analyzing templates', {
        count: templates.rows.length
      })

      let analyzed = 0
      let skipped = 0
      let failed = 0

      // Analyze each template
      for (const template of templates.rows) {
        try {
          await this.analyzeTemplateQuality(template.id)
          analyzed++
        } catch (error) {
          if (error instanceof Error && error.message.includes('Insufficient data')) {
            skipped++
          } else {
            failed++
            logger.error('[TEMPLATE-IMPROVEMENT] Template analysis failed', {
              templateId: template.id,
              templateName: template.name,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      }

      logger.info('[TEMPLATE-IMPROVEMENT] Weekly analysis complete', {
        total: templates.rows.length,
        analyzed,
        skipped,
        failed
      })
    } catch (error) {
      logger.error('[TEMPLATE-IMPROVEMENT] Weekly analysis job failed', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

export const templateImprovementService = new TemplateImprovementService()

