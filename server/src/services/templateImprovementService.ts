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

interface AuditHistoryItem {
  overall_score: number
  completeness_score: number
  consistency_score: number
  professional_quality_score: number
  standards_compliance_score: number
  accuracy_score: number
  context_relevance_score: number
  issues: QualityIssue[]
  recommendations: string[]
  audited_at: string
}

interface QualityIssue {
  severity: string
  dimension: string
  description: string
  location?: string
  recommendation?: string
  count?: number
}

interface IssueFrequency {
  [key: string]: number
}

interface Template {
  id: string
  name: string
  type: string
  framework: string
  content: string | Record<string, unknown>
  system_prompt?: string
  description?: string
  category?: string
}

interface ImprovementSuggestionData {
  templateId: string
  qualityMetrics: TemplateQualityMetrics
  commonIssues: QualityIssue[]
  issueFrequency: IssueFrequency
  improvements: ImprovementItem[]
  expectedGain: number
  priority: string
  analysisTokens: number
  analysisCost: number
}

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

interface ImprovementItem {
  issue_addressed: string
  proposed_change: string
  change_type: string
  section?: string
  expected_impact?: {
    dimension: string
    current_score: number
    predicted_score: number
    gain: number
  }
  priority?: string
  implementation_difficulty?: string
  rationale?: string
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

      // 2. Check if recent analysis already exists (avoid spam)
      const recentSuggestion = await pool.query(
        `SELECT id, created_at, status
         FROM template_improvement_suggestions
         WHERE template_id = $1
         AND created_at > NOW() - INTERVAL '24 hours'
         AND status IN ('pending_review', 'approved')
         ORDER BY created_at DESC
         LIMIT 1`,
        [templateId]
      )

      if (recentSuggestion.rows.length > 0) {
        logger.info('[TEMPLATE-IMPROVEMENT] Recent suggestion exists, skipping analysis', {
          templateId,
          existingSuggestionId: recentSuggestion.rows[0].id,
          status: recentSuggestion.rows[0].status,
          createdAt: recentSuggestion.rows[0].created_at
        })
        return // Don't spam analysis - wait 24 hours between runs
      }

      // 3. Get quality audit history (last 30 days)
      const auditHistory = await this.getAuditHistory(templateId, 30)

      if (auditHistory.length < 1) {
        logger.info('[TEMPLATE-IMPROVEMENT] Insufficient data for analysis, attempting static analysis', {
          templateId,
          auditCount: auditHistory.length,
          required: 1
        })
        await this.analyzeTemplateStatic(templateId)
        return
      }

      logger.info('[TEMPLATE-IMPROVEMENT] Analyzing quality history', {
        templateId,
        auditCount: auditHistory.length
      })

      // 4. Calculate aggregate quality metrics
      const qualityMetrics = this.calculateAggregateMetrics(auditHistory)

      // 5. Extract common issues and patterns
      const commonIssues = this.extractCommonIssues(auditHistory)
      const issueFrequency = this.calculateIssueFrequency(commonIssues, auditHistory.length)

      logger.info('[TEMPLATE-IMPROVEMENT] Found common issues', {
        templateId,
        issueCount: commonIssues.length,
        avgQuality: qualityMetrics.avgQuality
      })

      // 6. Use AI to analyze template and suggest improvements
      const aiAnalysisResult = await this.generateImprovementSuggestions(
        template,
        qualityMetrics,
        commonIssues,
        issueFrequency
      )

      this.processAiAnalysisResult(templateId, template, aiAnalysisResult, qualityMetrics, auditHistory.length, commonIssues, issueFrequency)

    } catch (error) {
      logger.error('[TEMPLATE-IMPROVEMENT] Analysis failed', {
        templateId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Process and save AI analysis results
   */
  private async processAiAnalysisResult(
    templateId: string,
    template: Template,
    aiAnalysisResult: any,
    qualityMetrics: TemplateQualityMetrics,
    auditCount: number,
    commonIssues: QualityIssue[],
    issueFrequency: IssueFrequency
  ): Promise<void> {
    if (!aiAnalysisResult || !aiAnalysisResult.improvements || aiAnalysisResult.improvements.length === 0) {
      logger.info('[TEMPLATE-IMPROVEMENT] No improvements suggested', { templateId })
      return
    }

    const { improvements, tokens, cost } = aiAnalysisResult

    // 7. Calculate expected quality gain
    const expectedGain = this.estimateQualityGain(qualityMetrics, improvements)

    // 8. Determine priority
    const priority = this.calculatePriority(
      qualityMetrics.avgQuality,
      expectedGain,
      auditCount
    )

    logger.info('[TEMPLATE-IMPROVEMENT] Generated suggestions', {
      templateId,
      suggestionCount: improvements.length,
      expectedGain,
      priority,
      analysisTokens: tokens,
      analysisCost: `$${cost.toFixed(4)}`
    })

    // 9. Save improvement suggestions
    await this.saveImprovementSuggestions({
      templateId,
      qualityMetrics,
      commonIssues,
      issueFrequency,
      improvements,
      expectedGain,
      priority,
      analysisTokens: tokens,
      analysisCost: cost
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
  }

  /**
   * Analyze template structure statically (Cold Start / Zero History)
   */
  async analyzeTemplateStatic(templateId: string): Promise<void> {
    logger.info('[TEMPLATE-IMPROVEMENT] Running static analysis', { templateId })

    try {
      const template = await this.getTemplate(templateId)
      if (!template) return

      // Build static prompt
      const prompt = this.buildStaticAnalysisPrompt(template)

      // Get preferred provider (highest priority active)
      const providerResult = await pool.query(
        "SELECT provider_type FROM ai_providers WHERE is_active = true ORDER BY priority ASC LIMIT 1"
      )
      const preferredProvider = providerResult.rows[0]?.provider_type || 'google'

      // Call AI with fallback
      const result = await aiService.generateWithFallback({
        provider: preferredProvider,
        model: 'gemini-2.5-flash', // Default model, provider logic handles specific mapping if needed
        prompt: prompt,
        system_prompt: `You are an expert in document template design. Analyze the template structure and system prompt for clarity, completeness, and best practices. Respond with valid JSON.`,
        temperature: 0.3,
        max_tokens: 4000
      })

      // Process result
      const totalTokens = result.usage?.totalTokens || 0
      const cost = this.estimateCost(totalTokens)

      let improvements: ImprovementItem[] = []
      try {
        const cleaned = this.cleanJson(result.content)
        const parsed = JSON.parse(cleaned)
        improvements = parsed.improvements || []
      } catch (e) {
        logger.error('Failed to parse static analysis', { error: e })
        return
      }

      if (improvements.length === 0) return

      // Save as a "Baseline" suggestion
      // We mock some metrics since we have no history
      const mockMetrics: TemplateQualityMetrics = {
        avgQuality: 0, avgCompleteness: 0, avgConsistency: 0,
        avgProfessionalQuality: 0, avgStandardsCompliance: 0, avgAccuracy: 0,
        avgContextRelevance: 0, documentCount: 0, lowestScore: 0,
        highestScore: 0, standardDeviation: 0
      }

      await this.saveImprovementSuggestions({
        templateId,
        qualityMetrics: mockMetrics,
        commonIssues: [{
          severity: 'medium',
          dimension: 'Structure',
          description: 'Static Analysis Findings',
          count: 1
        }],
        issueFrequency: {},
        improvements,
        expectedGain: 10, // Arbitrary estimate for static improvements
        priority: 'medium',
        analysisTokens: totalTokens,
        analysisCost: cost
      })

    } catch (error) {
      logger.error('[TEMPLATE-IMPROVEMENT] Static analysis failed', { error })
    }
  }

  private cleanJson(content: string): string {
    let cleaned = content.trim()
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7)
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3)
    return cleaned.trim()
  }

  /**
   * Build prompt for static analysis
   */
  private buildStaticAnalysisPrompt(template: Template): string {
    const templateContent = typeof template.content === 'string'
      ? template.content
      : JSON.stringify(template.content, null, 2)

    return `# Static Template Analysis

Analyze this document template for structural quality, best practices, and system prompt clarity.

## Template Info
Name: ${template.name}
Framework: ${template.framework}
Category: ${template.category}

## System Prompt
${template.system_prompt || 'NO SYSTEM PROMPT DEFINED'}

## Content Structure
${templateContent.substring(0, 15000)}

## Task
Identify 3-5 structural improvements. Focus on:
1. **System Prompt Clarity**: Is it specific enough? Does it define a persona?
2. **Structure**: Are there missing standard sections for a "${template.category}" document?
3. **Variables**: Are variables clear and descriptive?
4. **Best Practices**: Does it use proper markdown or formatting?

## Output Format (JSON)
{
  "improvements": [
    {
      "issue_addressed": "Missing System Prompt Persona",
      "proposed_change": "Add 'You are a Senior Architect...' to system prompt",
      "change_type": "prompt_enhancement",
      "section": "system_prompt",
      "expected_impact": { "gain": 10 },
      "priority": "high",
      "rationale": "Defining a persona improves tone consistency."
    }
  ]
}`
  }

  /**
   * Get template details
   */
  private async getTemplate(templateId: string): Promise<Template | null> {
    const result = await pool.query(
      'SELECT * FROM templates WHERE id = $1 AND deleted_at IS NULL',
      [templateId]
    )

    return result.rows[0] || null
  }

  /**
   * Get quality audit history for a template
   */
  private async getAuditHistory(templateId: string, days: number): Promise<AuditHistoryItem[]> {
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
  private calculateAggregateMetrics(auditHistory: AuditHistoryItem[]): TemplateQualityMetrics {
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
  private extractCommonIssues(auditHistory: AuditHistoryItem[]): QualityIssue[] {
    const issueMap = new Map<string, QualityIssue>()

    auditHistory.forEach(audit => {
      const issues = audit.issues || []

      issues.forEach((issue: QualityIssue) => {
        const key = `${issue.dimension}:${issue.description}`

        if (issueMap.has(key)) {
          const existing = issueMap.get(key)!
          existing.count = (existing.count || 0) + 1
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
  private calculateIssueFrequency(commonIssues: QualityIssue[], totalAudits: number): IssueFrequency {
    const frequency: IssueFrequency = {}

    commonIssues.forEach(issue => {
      const key = `${issue.dimension}:${issue.description}`
      frequency[key] = Math.round(((issue.count || 0) / totalAudits) * 100)
    })

    return frequency
  }

  /**
   * Use AI to generate specific template improvement suggestions
   */
  private async generateImprovementSuggestions(
    template: Template,
    qualityMetrics: TemplateQualityMetrics,
    commonIssues: QualityIssue[],
    issueFrequency: IssueFrequency
  ): Promise<{ improvements: ImprovementItem[], tokens: number, cost: number }> {
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

    let result: any = null
    try {
      result = await aiService.generate({
        provider: 'google',
        model: 'gemini-2.5-flash',
        prompt: analysisPrompt, // User prompt (required)
        system_prompt: `You are an expert in document template design and AI prompt engineering. You analyze template performance and suggest specific, actionable improvements. Always respond with valid JSON only. Do not include any explanatory text before or after the JSON.`, // System prompt (optional, snake_case)
        temperature: 0.5,
        max_tokens: 4000 // Max tokens (snake_case to match interface)
      })

      // Extract token usage
      const totalTokens = result.usage?.totalTokens || result.usage?.total_tokens || 0
      const estimatedCost = this.estimateCost(totalTokens)

      // Clean markdown code blocks from AI response and parse with error handling
      try {
        let cleaned = result.content.trim()
        if (cleaned.startsWith('```json')) {
          cleaned = cleaned.substring(7)
        }
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.substring(3)
        }
        if (cleaned.endsWith('```')) {
          cleaned = cleaned.substring(0, cleaned.length - 3)
        }

        const parsed = JSON.parse(cleaned.trim())
        return {
          improvements: parsed.improvements || [],
          tokens: totalTokens,
          cost: estimatedCost
        }
      } catch (parseError) {
        logger.error('[TEMPLATE-IMPROVEMENT] Failed to parse AI response JSON', {
          templateId: template.id,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
          responsePreview: result?.content?.substring(0, 200) || 'No content'
        })
        return {
          improvements: [],
          tokens: totalTokens,
          cost: estimatedCost
        }
      }
    } catch (error) {
      logger.error('[TEMPLATE-IMPROVEMENT] AI suggestion generation failed', {
        templateId: template.id,
        error: error instanceof Error ? error.message : String(error),
        responsePreview: result?.content?.substring(0, 200) || 'No content'
      })
      return {
        improvements: [],
        tokens: 0,
        cost: 0
      }
    }
  }

  /**
   * Estimate cost for template improvement analysis
   */
  private estimateCost(tokens: number): number {
    // Gemini 2.5 Flash pricing
    const costPer1M = 0.50 // $0.50 per 1M tokens (average of input/output)
    return (tokens / 1000000) * costPer1M
  }

  /**
   * Build prompt for AI improvement analysis
   */
  private buildImprovementPrompt(
    template: Template,
    qualityMetrics: TemplateQualityMetrics,
    commonIssues: QualityIssue[],
    issueFrequency: IssueFrequency
  ): string {
    const templateContent = template.content
      ? (typeof template.content === 'string'
        ? template.content
        : JSON.stringify(template.content))
      : 'No template content available'

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
  private async saveImprovementSuggestions(data: ImprovementSuggestionData): Promise<string> {
    const result = await pool.query(
      `INSERT INTO template_improvement_suggestions (
        template_id, analysis_period_start, analysis_period_end, documents_analyzed,
        current_avg_quality, current_completeness, current_consistency,
        current_professional_quality, current_standards_compliance,
        common_issues, issue_frequency, suggested_improvements,
        improvement_rationale, expected_quality_gain, priority,
        analyzer_ai_provider, analyzer_ai_model, analysis_tokens, analysis_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
        'gemini-2.5-flash',
        data.analysisTokens || 0,
        data.analysisCost || 0
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
    template: Template,
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
        t.framework as template_framework
      FROM template_improvement_suggestions tis
      JOIN templates t ON tis.template_id = t.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (filters?.status && filters.status !== 'all') {
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
    template: Template,
    improvements: ImprovementItem[]
  ): Promise<string> {
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
  private generateChangesSummary(improvements: ImprovementItem[]): string {
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

