/**
 * Template Optimization Service
 * 
 * AI-powered template improvement system that analyzes quality regressions
 * and generates optimized system prompts and template content.
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { v4 as uuidv4 } from 'uuid'

interface TemplateVersion {
  id: string
  name: string
  content: any
  system_prompt?: string
  prompt_version: number
  framework: string
  category: string
}

interface QualityAudit {
  overall_score: number
  overall_grade: string
  completeness_score: number
  consistency_score: number
  professional_quality_score: number
  standards_compliance_score: number
  accuracy_score: number
  context_relevance_score: number
  issues: unknown[]
  recommendations: unknown[]
}

interface TemplateOptimizationSuggestion {
  suggested_system_prompt: string
  suggested_content?: string
  change_explanation: string
  expected_quality_gain: number
  changes_summary: {
    system_prompt_changes: string[]
    content_changes: string[]
    key_improvements: string[]
  }
  tokens?: number
  cost?: number
  analyzerProvider?: string
  analyzerModel?: string
}

interface TemplateAuditResult {
  id: string
  overall_score: number | null
  governance_score: number | null
  resilience_score: number | null
  verdict: string | null
  governance_findings: unknown[]
  governance_recommendations: unknown[]
  compliance_gaps: unknown[]
  challenger_findings: unknown[]
  challenger_recommendations: unknown[]
  logical_vulnerabilities: unknown[]
  challenged_assumptions: unknown[]
}

export class TemplateOptimizationService {
  /**
   * Create a reviewable, system-prompt-only optimization from the latest template audit.
   */
  async generatePromptSuggestionFromLatestAudit(templateId: string): Promise<string> {
    const templateResult = await pool.query(
      `SELECT id, name, content, system_prompt, prompt_version, framework, category
       FROM templates
       WHERE id = $1`,
      [templateId]
    )

    if (templateResult.rows.length === 0) {
      throw new Error('Template not found')
    }

    const auditResult = await pool.query(
      `SELECT id, overall_score, governance_score, resilience_score, verdict,
              governance_findings, governance_recommendations, compliance_gaps,
              challenger_findings, challenger_recommendations,
              logical_vulnerabilities, challenged_assumptions
       FROM template_audits
       WHERE template_id = $1
       AND status = 'completed'
       ORDER BY completed_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [templateId]
    )

    if (auditResult.rows.length === 0) {
      throw new Error('No completed template audit found for prompt suggestion')
    }

    const template = templateResult.rows[0] as TemplateVersion
    const audit = this.normalizeAuditResult(auditResult.rows[0])
    const { provider, model } = await this.getPreferredProvider()

    const result = await aiService.generateWithFallback({
      provider,
      model,
      prompt: this.buildAuditPromptSuggestionPrompt(template, audit),
      system_prompt: `You are an expert audit-driven system prompt optimization specialist for governance document templates.
Improve only the system prompt. Preserve the current template content and output valid JSON only.`,
      temperature: 0.2,
      max_tokens: 4000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    const usage = result.usage
    const totalTokens = usage?.totalTokens ?? usage?.total_tokens ?? 0
    const estimatedCost = (totalTokens / 1000000) * 0.50
    const parsed = this.parseOptimizationJson(result.content)
    const suggestedSystemPrompt = parsed.suggested_system_prompt?.trim()

    if (!suggestedSystemPrompt) {
      throw new Error('AI response did not include a suggested system prompt')
    }

    const suggestionId = uuidv4()
    const expectedQualityGain = Number(parsed.expected_quality_gain) || 10
    const currentContent = this.normalizeTemplateContentForJsonb(template.content)
    const originalContent = this.templateContentToText(template.content)
    const changesSummary = parsed.changes_summary || {
      system_prompt_changes: [],
      content_changes: [],
      key_improvements: []
    }

    await pool.query(
      `INSERT INTO template_improvement_suggestions
       (id, template_id, status, priority, expected_quality_gain, current_avg_quality,
        analysis_period_start, analysis_period_end, documents_analyzed,
        common_issues, suggested_improvements, improvement_rationale,
        analyzer_ai_provider, analyzer_ai_model, analysis_tokens, analysis_cost,
        created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 day', NOW(), $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        suggestionId,
        templateId,
        'pending_review',
        expectedQualityGain > 10 ? 'high' : 'medium',
        expectedQualityGain,
        audit.overall_score ?? 0,
        1,
        JSON.stringify(this.extractAuditIssues(audit)),
        JSON.stringify([{
          issue_addressed: 'Latest template audit recommendations',
          proposed_change: parsed.change_explanation || 'Improved system prompt generated from latest template audit.',
          change_type: 'template_optimization',
          section: 'system_prompt',
          system_prompt: suggestedSystemPrompt,
          template_content: currentContent,
          changes_summary: changesSummary,
          metadata: {
            optimization_type: 'ai_generated',
            trigger: 'template_audit',
            audit_id: audit.id,
            audit_score: audit.overall_score,
            governance_score: audit.governance_score,
            resilience_score: audit.resilience_score,
            generated_at: new Date().toISOString(),
            original_system_prompt: template.system_prompt || null,
            original_content: originalContent
          }
        }]),
        parsed.change_explanation || 'Audit-generated system prompt improvement.',
        result.providerUsed || result.provider || provider,
        result.model || model,
        totalTokens,
        estimatedCost
      ]
    )

    logger.info('[TEMPLATE-OPT] Audit prompt suggestion created', {
      templateId,
      auditId: audit.id,
      suggestionId,
      expectedQualityGain
    })

    return suggestionId
  }

  /**
   * Get the newest pending system-prompt suggestion generated from a template audit.
   */
  async getLatestAuditPromptSuggestion(templateId: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT *
       FROM template_improvement_suggestions tis
       WHERE tis.template_id = $1
       AND tis.status = 'pending_review'
       AND EXISTS (
         SELECT 1
         FROM jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(tis.suggested_improvements) = 'array'
               THEN tis.suggested_improvements
             ELSE '[]'::jsonb
           END
         ) AS imp
         WHERE imp->'metadata'->>'trigger' = 'template_audit'
         AND imp->>'section' = 'system_prompt'
       )
       ORDER BY tis.created_at DESC
       LIMIT 1`,
      [templateId]
    )

    return result.rows[0] || null
  }

  /**
   * Analyze quality regression and generate template improvement
   */
  async analyzeRegressionAndOptimize(
    templateId: string,
    auditBefore: QualityAudit,
    auditAfter: QualityAudit
  ): Promise<string | null> {
    try {
      const qualityDrop = auditBefore.overall_score - auditAfter.overall_score

      if (qualityDrop < 5) {
        logger.info('[TEMPLATE-OPT] Quality drop < 5%, skipping optimization', {
          templateId,
          qualityDrop
        })
        return null
      }

      logger.info('[TEMPLATE-OPT] Quality regression detected, analyzing...', {
        templateId,
        scoreBefore: auditBefore.overall_score,
        scoreAfter: auditAfter.overall_score,
        qualityDrop
      })

      // Get current template
      const templateResult = await pool.query(
        `SELECT id, name, content, system_prompt, prompt_version, framework, category
         FROM templates
         WHERE id = $1`,
        [templateId]
      )

      if (templateResult.rows.length === 0) {
        logger.warn('[TEMPLATE-OPT] Template not found', { templateId })
        return null
      }

      const currentTemplate = templateResult.rows[0]

      // Generate optimization suggestion using AI
      const optimization = await this.generateOptimizationWithAI(
        currentTemplate,
        auditBefore,
        auditAfter
      )

      // Save suggestion to database (include original template for diff view)
      const suggestionId = await this.saveSuggestion(
        templateId,
        optimization,
        auditBefore.overall_score,
        auditAfter.overall_score,
        {
          content: currentTemplate.content,
          system_prompt: currentTemplate.system_prompt
        }
      )

      logger.info('[TEMPLATE-OPT] Optimization suggestion created', {
        templateId,
        suggestionId,
        expectedGain: optimization.expected_quality_gain
      })

      return suggestionId

    } catch (error: any) {
      logger.error('[TEMPLATE-OPT] Failed to analyze regression', {
        templateId,
        error: error.message
      })
      return null
    }
  }

  /**
   * Use AI to generate improved template based on quality regression
   */
  private async generateOptimizationWithAI(
    currentTemplate: TemplateVersion,
    auditBefore: QualityAudit,
    auditAfter: QualityAudit
  ): Promise<TemplateOptimizationSuggestion> {
    const metaPrompt = this.buildOptimizationMetaPrompt(
      currentTemplate,
      auditBefore,
      auditAfter
    )

    logger.info('[TEMPLATE-OPT] Generating AI optimization suggestion', {
      templateId: currentTemplate.id,
      currentVersion: currentTemplate.prompt_version
    })

    // Get preferred provider (highest priority active) with fallback
    const providerResult = await pool.query(
      "SELECT provider_type, default_model FROM ai_providers WHERE is_active = true ORDER BY priority ASC LIMIT 1"
    )
    const preferredProvider = providerResult.rows[0]?.provider_type || 'openai'
    const defaultModel = providerResult.rows[0]?.default_model || 'gpt-4o'

    // Build system prompt, appending domain-specific guidance for Communications templates
    let systemPrompt = `You are an expert template optimization AI specializing in PMBOK, BABOK, and DMBOK documentation standards.
Your role is to analyze template performance data and generate improved templates that produce higher-quality documents.
Always respond with valid JSON only.`

    try {
      if (typeof currentTemplate.name === 'string' && /communications management plan/i.test(currentTemplate.name)) {
        const fs = await import('fs')
        const path = await import('path')
        const extraPath = path.resolve(__dirname, '..', 'services', 'template_system_prompts', 'communications_system_prompt.md')
        if (fs.existsSync(extraPath)) {
          const extra = fs.readFileSync(extraPath, 'utf8')
          systemPrompt += `\n\n# Additional System Prompt Guidance\n${extra}`
        }
      }
    } catch (e) {
      logger.warn('[TEMPLATE-OPT] Could not load communications system prompt enhancements', { error: (e as any).message })
    }

    const result = await aiService.generateWithFallback({
      provider: preferredProvider,
      model: defaultModel,
      prompt: metaPrompt,
      system_prompt: systemPrompt,
      temperature: 0.3, // Lower temperature for consistent, analytical responses
      max_tokens: 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    const usage = result.usage

    // Extract token usage for analytics (support camelCase and snake_case)
    const totalTokens =
      usage?.totalTokens ?? usage?.total_tokens ?? 0
    const promptTokens =
      usage?.promptTokens ?? usage?.prompt_tokens ?? 0
    const completionTokens =
      usage?.completionTokens ?? usage?.completion_tokens ?? 0
    const estimatedCost = (totalTokens / 1000000) * 0.50 // Gemini 2.0 Flash Exp pricing

    logger.info('[TEMPLATE-OPT] AI optimization generated', {
      totalTokens,
      promptTokens,
      completionTokens,
      estimatedCost: `$${estimatedCost.toFixed(4)}`
    })

    // Parse AI response with error handling
    try {
      const parsed = this.parseOptimizationJson(result.content)

      return {
        suggested_system_prompt: parsed.suggested_system_prompt,
        suggested_content: parsed.suggested_content,
        change_explanation: parsed.change_explanation,
        expected_quality_gain: parsed.expected_quality_gain || 10,
        changes_summary: parsed.changes_summary || { system_prompt_changes: [], content_changes: [], key_improvements: [] },
        tokens: totalTokens,
        cost: estimatedCost,
        analyzerProvider: result.providerUsed || result.provider,
        analyzerModel: result.model
      }
    } catch (error) {
      logger.error('[TEMPLATE-OPT] Failed to parse AI optimization response', {
        error: error instanceof Error ? error.message : String(error),
        responsePreview: result.content.substring(0, 200)
      })
      throw new Error('Failed to parse AI optimization response. Please try again.')
    }
  }

  /**
   * Build meta-prompt for AI template optimization
   */
  private buildOptimizationMetaPrompt(
    template: TemplateVersion,
    auditBefore: QualityAudit,
    auditAfter: QualityAudit
  ): string {
    const qualityDrop = auditBefore.overall_score - auditAfter.overall_score
    
    // Identify which dimensions dropped the most
    const dimensionDrops = [
      { name: 'Completeness', before: auditBefore.completeness_score, after: auditAfter.completeness_score },
      { name: 'Consistency', before: auditBefore.consistency_score, after: auditAfter.consistency_score },
      { name: 'Professional Quality', before: auditBefore.professional_quality_score, after: auditAfter.professional_quality_score },
      { name: 'Standards Compliance', before: auditBefore.standards_compliance_score, after: auditAfter.standards_compliance_score },
      { name: 'Accuracy', before: auditBefore.accuracy_score, after: auditAfter.accuracy_score },
      { name: 'Context Relevance', before: auditBefore.context_relevance_score, after: auditAfter.context_relevance_score }
    ]
      .map(d => ({ ...d, drop: d.before - d.after }))
      .filter(d => d.drop > 0)
      .sort((a, b) => b.drop - a.drop)

    return `# Template Optimization Task

You are analyzing a template that experienced a quality regression after recent changes.
Your task is to generate an IMPROVED template that fixes the regression and produces higher-quality documents.

## Current Template Information

**Template Name:** ${template.name}
**Framework:** ${template.framework}
**Category:** ${template.category}
**Current Version:** v${template.prompt_version}

**Current System Prompt:**
\`\`\`
${template.system_prompt || 'No system prompt defined'}
\`\`\`

**Current Template Content:**
\`\`\`markdown
${template.content}
\`\`\`

---

## Quality Regression Analysis

**Overall Quality Change:**
- Before (v${template.prompt_version - 1}): ${auditBefore.overall_score}% (Grade ${auditBefore.overall_grade})
- After (v${template.prompt_version}): ${auditAfter.overall_score}% (Grade ${auditAfter.overall_grade})
- **Regression: -${qualityDrop}%** 📉

**Dimensions with Quality Drops:**
${dimensionDrops.map(d => `- **${d.name}:** ${d.before}% → ${d.after}% (${d.drop > 0 ? '-' : '+'}${Math.abs(d.drop)}%)`).join('\n')}

**Issues Identified (Recent Audit):**
${auditAfter.issues.map((issue: any, idx: number) => `
${idx + 1}. **${issue.severity}** - ${issue.dimension}
   Problem: ${issue.description}
   Location: ${issue.location}
   Recommendation: ${issue.recommendation}
`).join('\n')}

**AI Recommendations:**
${auditAfter.recommendations?.map((rec: any, idx: number) => `${idx + 1}. ${rec}`).join('\n') || 'None provided'}

---

## Your Task

Generate an OPTIMIZED template that:

1. **Fixes the quality regression** by addressing all identified issues
2. **Improves system prompt** to give AI clearer, more effective instructions
3. **Enhances template structure** to elicit better content from AI providers
4. **Maintains ${template.framework} compliance** and professional standards
5. **Targets 90%+ quality score** on next generation

## Output Requirements

Respond with VALID JSON in this exact format:

\`\`\`json
{
  "suggested_system_prompt": "Improved system prompt with specific instructions for AI provider...",
  "suggested_content": "Improved template content in markdown...",
  "change_explanation": "Detailed explanation of what changed and why each change improves quality...",
  "expected_quality_gain": 12,
  "changes_summary": {
    "system_prompt_changes": [
      "Added active voice requirement",
      "Specified minimum word counts per section",
      "Enhanced formatting guidelines"
    ],
    "content_changes": [
      "Restructured sections for better flow",
      "Added detailed examples",
      "Improved variable placeholders"
    ],
    "key_improvements": [
      "Addresses passive voice issue (Professional Quality +15%)",
      "Adds content depth requirements (Content Depth +20%)",
      "Enhances cross-referencing (Standards Compliance +10%)"
    ]
  }
}
\`\`\`

Focus on ACTIONABLE changes that directly address the regression causes.
Make the system prompt crystal-clear and the template structure easy for AI to follow.`
  }

  private async getPreferredProvider(): Promise<{ provider: string; model: string }> {
    const providerResult = await pool.query(
      "SELECT provider_type, default_model FROM ai_providers WHERE is_active = true ORDER BY priority ASC LIMIT 1"
    )

    return {
      provider: providerResult.rows[0]?.provider_type || 'openai',
      model: providerResult.rows[0]?.default_model || 'gpt-4o'
    }
  }

  private parseOptimizationJson(content: string): any {
    let cleaned = content.trim()
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7)
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3)
    return JSON.parse(cleaned.trim())
  }

  private normalizeAuditResult(row: any): TemplateAuditResult {
    return {
      id: row.id,
      overall_score: row.overall_score ?? null,
      governance_score: row.governance_score ?? null,
      resilience_score: row.resilience_score ?? null,
      verdict: row.verdict ?? null,
      governance_findings: this.ensureArray(row.governance_findings),
      governance_recommendations: this.ensureArray(row.governance_recommendations),
      compliance_gaps: this.ensureArray(row.compliance_gaps),
      challenger_findings: this.ensureArray(row.challenger_findings),
      challenger_recommendations: this.ensureArray(row.challenger_recommendations),
      logical_vulnerabilities: this.ensureArray(row.logical_vulnerabilities),
      challenged_assumptions: this.ensureArray(row.challenged_assumptions)
    }
  }

  private ensureArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  private templateContentToText(content: unknown): string {
    if (!content) return ''
    if (typeof content === 'string') return content
    if (typeof content === 'object') {
      const contentRecord = content as Record<string, unknown>
      const markdown = contentRecord.markdown
      const nestedContent = contentRecord.content
      if (typeof markdown === 'string') return markdown
      if (typeof nestedContent === 'string') return nestedContent
      return JSON.stringify(content, null, 2)
    }
    return String(content)
  }

  private normalizeTemplateContentForJsonb(content: unknown): unknown {
    if (typeof content === 'string') {
      try {
        return JSON.parse(content)
      } catch {
        return { content }
      }
    }
    return content ?? {}
  }

  private extractAuditIssues(audit: TemplateAuditResult) {
    const entries = [
      ...audit.compliance_gaps,
      ...audit.governance_recommendations,
      ...audit.challenger_recommendations,
      ...audit.logical_vulnerabilities
    ]

    return entries.slice(0, 10).map((entry) => ({
      dimension: 'template_audit',
      description: this.formatAuditEntry(entry),
      count: 1
    }))
  }

  private formatAuditEntry(entry: unknown): string {
    if (entry === null || entry === undefined) return ''
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      return String(entry)
    }

    if (typeof entry !== 'object') return String(entry)
    const record = entry as Record<string, unknown>
    const framework = this.readStringField(record, 'framework')
    const requirement = this.readStringField(record, 'requirement')
    const severity = this.readStringField(record, 'severity')
    const primaryText =
      this.readStringField(record, 'recommendation') ||
      this.readStringField(record, 'description') ||
      this.readStringField(record, 'gap_description') ||
      this.readStringField(record, 'suggested_fix') ||
      this.readStringField(record, 'counter_argument') ||
      this.readStringField(record, 'assumption')

    const context = [framework, requirement].filter(Boolean).join(': ')
    if (context && primaryText) {
      return `${context} - ${primaryText}${severity ? ` (${severity})` : ''}`
    }
    if (primaryText) return primaryText

    return Object.entries(record)
      .flatMap(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return [`${key}: ${String(value)}`]
        }
        return []
      })
      .join('; ')
  }

  private readStringField(value: Record<string, unknown>, key: string): string {
    const field = value[key]
    return typeof field === 'string' && field.trim().length > 0 ? field.trim() : ''
  }

  private buildAuditPromptSuggestionPrompt(template: TemplateVersion, audit: TemplateAuditResult): string {
    return `# Audit-Driven System Prompt Optimization

You are generating a replacement system prompt for a governance document template. Use the current content prompt/template and latest audit results to improve governance compliance, resilience, and document quality.

Only generate a new system prompt. Do not rewrite the template content.

## Template

Name: ${template.name}
Framework: ${template.framework}
Category: ${template.category}
Current prompt version: ${template.prompt_version}

## Current System Prompt

\`\`\`
${template.system_prompt || 'No system prompt defined'}
\`\`\`

## Current Content Prompt / Template

\`\`\`markdown
${this.templateContentToText(template.content)}
\`\`\`

## Latest Audit Results

Overall score: ${audit.overall_score ?? 'n/a'}
Governance score: ${audit.governance_score ?? 'n/a'}
Resilience score: ${audit.resilience_score ?? 'n/a'}
Verdict: ${audit.verdict ?? 'n/a'}

Governance findings:
${audit.governance_findings.map((item, idx) => `${idx + 1}. ${this.formatAuditEntry(item)}`).join('\n') || 'None'}

Governance recommendations:
${audit.governance_recommendations.map((item, idx) => `${idx + 1}. ${this.formatAuditEntry(item)}`).join('\n') || 'None'}

Compliance gaps:
${audit.compliance_gaps.map((item, idx) => `${idx + 1}. ${this.formatAuditEntry(item)}`).join('\n') || 'None'}

Challenger findings:
${audit.challenger_findings.map((item, idx) => `${idx + 1}. ${this.formatAuditEntry(item)}`).join('\n') || 'None'}

Challenger recommendations:
${audit.challenger_recommendations.map((item, idx) => `${idx + 1}. ${this.formatAuditEntry(item)}`).join('\n') || 'None'}

Logical vulnerabilities:
${audit.logical_vulnerabilities.map((item, idx) => `${idx + 1}. ${this.formatAuditEntry(item)}`).join('\n') || 'None'}

Challenged assumptions:
${audit.challenged_assumptions.map((item, idx) => `${idx + 1}. ${this.formatAuditEntry(item)}`).join('\n') || 'None'}

## Output Requirements

Respond with valid JSON only:

{
  "suggested_system_prompt": "A complete replacement system prompt that directly addresses the audit results...",
  "change_explanation": "Explain what changed and why it addresses the audit findings.",
  "expected_quality_gain": 12,
  "changes_summary": {
    "system_prompt_changes": ["Change 1", "Change 2"],
    "content_changes": [],
    "key_improvements": ["Improvement 1", "Improvement 2"]
  }
}

The suggested system prompt should preserve the template's purpose while adding specific, actionable guardrails for the audit gaps.`
  }

  /**
   * Save optimization suggestion for admin review
   */
  private async saveSuggestion(
    templateId: string,
    optimization: TemplateOptimizationSuggestion,
    scoreBefore: number,
    scoreAfter: number,
    originalTemplate?: { content: any; system_prompt: string | null }
  ): Promise<string> {
    const suggestionId = uuidv4()

    // Extract original content as string for storage
    let originalContentStr = ''
    if (originalTemplate?.content) {
      if (typeof originalTemplate.content === 'string') {
        originalContentStr = originalTemplate.content
      } else if (typeof originalTemplate.content === 'object') {
        originalContentStr = originalTemplate.content.markdown || originalTemplate.content.content || JSON.stringify(originalTemplate.content, null, 2)
      }
    }

    await pool.query(
      `INSERT INTO template_improvement_suggestions
       (id, template_id, status, priority, expected_quality_gain, current_avg_quality,
        analysis_period_start, analysis_period_end, documents_analyzed,
        common_issues, suggested_improvements, improvement_rationale,
        analyzer_ai_provider, analyzer_ai_model, analysis_tokens, analysis_cost,
        created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 day', NOW(), $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        suggestionId,
        templateId,
        'pending_review',
        optimization.expected_quality_gain > 10 ? 'high' : 'medium',
        optimization.expected_quality_gain,
        scoreAfter, // Current score after regression
        2, // Documents analyzed (before and after)
        JSON.stringify([{
          dimension: 'overall',
          description: `Quality regression detected: ${scoreBefore}% → ${scoreAfter}% (-${scoreBefore - scoreAfter}%)`,
          count: 1
        }]),
        JSON.stringify([{
          issue_addressed: 'Quality Regression',
          proposed_change: optimization.change_explanation,
          change_type: 'template_optimization',
          section: 'entire_template',
          system_prompt: optimization.suggested_system_prompt,
          template_content: optimization.suggested_content,
          changes_summary: optimization.changes_summary,
          // Embed metadata in the improvement object - STORE ORIGINAL CONTENT HERE
          metadata: {
            optimization_type: 'ai_generated',
            trigger: 'quality_regression',
            score_before: scoreBefore,
            score_after: scoreAfter,
            regression_amount: scoreBefore - scoreAfter,
            generated_at: new Date().toISOString(),
            // Store original template content for diff view (even after optimization is applied)
            original_system_prompt: originalTemplate?.system_prompt || null,
            original_content: originalContentStr
          }
        }]),
        `AI-generated optimization triggered by quality regression: ${scoreBefore}% → ${scoreAfter}% (-${scoreBefore - scoreAfter}%)`,
        optimization.analyzerProvider || 'unknown',
        optimization.analyzerModel || 'unknown',
        optimization.tokens || 0,
        optimization.cost || 0
      ]
    )

    return suggestionId
  }

  /**
   * Apply approved template optimization (MANUAL GATE)
   */
  async applyOptimization(
    suggestionId: string,
    adminId: string
  ): Promise<void> {
    try {
      // Get suggestion
      const sugResult = await pool.query(
        `SELECT tis.*, t.id as template_id, t.prompt_version, t.name as template_name
         FROM template_improvement_suggestions tis
         JOIN templates t ON tis.template_id = t.id
         WHERE tis.id = $1 AND tis.status = 'pending_review'`,
        [suggestionId]
      )

      if (sugResult.rows.length === 0) {
        throw new Error('Suggestion not found or already processed')
      }

      const suggestion = sugResult.rows[0]
      let suggestedImprovements = suggestion.suggested_improvements
      if (typeof suggestedImprovements === 'string') {
        try {
          suggestedImprovements = JSON.parse(suggestedImprovements)
        } catch {
          suggestedImprovements = []
        }
      }
      const improvement = Array.isArray(suggestedImprovements) ? suggestedImprovements[0] : null

      if (!improvement) {
        throw new Error('Suggestion does not contain an applicable improvement')
      }

      logger.info('[TEMPLATE-OPT] Applying optimization to template', {
        suggestionId,
        templateId: suggestion.template_id,
        templateName: suggestion.template_name,
        currentVersion: suggestion.prompt_version,
        adminId
      })

      // Update template with improved content and system prompt
      const newVersion = suggestion.prompt_version + 1

      await pool.query(
        `UPDATE templates
         SET 
           content = $1::jsonb,
           system_prompt = $2::text,
           prompt_version = $3::integer,
           updated_at = NOW()
         WHERE id = $4::uuid`,
        [
          JSON.stringify(improvement.template_content),
          improvement.system_prompt,
          newVersion,
          suggestion.template_id
        ]
      )

      // Mark suggestion as implemented
      await pool.query(
        `UPDATE template_improvement_suggestions
         SET status = 'implemented',
             implemented_by = $1,
             implemented_at = NOW()
         WHERE id = $2`,
        [adminId, suggestionId]
      )

      // Clear template cache so UI shows updated version immediately
      const { cache } = await Promise.resolve().then(() => require())
      await cache.del(`template:${suggestion.template_id}`)

      // 🔄 CONTINUOUS IMPROVEMENT CYCLE: Trigger quality audits on recent documents
      // This will create a new baseline and enable detection of further improvements/regressions
      try {
        logger.info('[TEMPLATE-OPT] Triggering continuous improvement cycle - auditing recent documents', {
          templateId: suggestion.template_id,
          newVersion
        })

        // Find recent documents using this template (last 7 days, limit 5)
        const recentDocsResult = await pool.query(
          `SELECT id, name, content, project_id
           FROM documents
           WHERE template_id = $1
           AND created_at > NOW() - INTERVAL '7 days'
           ORDER BY created_at DESC
           LIMIT 5`,
          [suggestion.template_id]
        )

        if (recentDocsResult.rows.length > 0) {
          const { getQueueService } = await Promise.resolve().then(() => require())
          const { v4: uuidv4 } = await import('uuid')

          // Get project context for each document
          for (const doc of recentDocsResult.rows) {
            const projectResult = await pool.query(
              'SELECT id, name, framework, description FROM projects WHERE id = $1',
              [doc.project_id]
            )
            const projectContext = projectResult.rows[0] || { id: doc.project_id, name: 'Project' }

            // Enqueue quality audit job (async, non-blocking)
            const auditJobId = uuidv4()
            getQueueService().addJob('quality-audit', {
              jobId: auditJobId,
              documentId: doc.id,
              documentContent: doc.content || '',
              documentType: suggestion.template_id,
              projectContext,
              userId: adminId
            }).catch((auditError: any) => {
              logger.warn('[TEMPLATE-OPT] Failed to enqueue quality audit for continuous improvement', {
                documentId: doc.id,
                error: auditError.message
              })
            })

            logger.debug('[TEMPLATE-OPT] Enqueued quality audit for continuous improvement', {
              documentId: doc.id,
              auditJobId
            })
          }

          logger.info('[TEMPLATE-OPT] Continuous improvement cycle initiated', {
            templateId: suggestion.template_id,
            documentsAudited: recentDocsResult.rows.length
          })
        } else {
          logger.info('[TEMPLATE-OPT] No recent documents found for continuous improvement cycle', {
            templateId: suggestion.template_id
          })
        }
      } catch (cycleError: any) {
        // Don't fail the optimization application if continuous improvement cycle fails
        logger.warn('[TEMPLATE-OPT] Failed to trigger continuous improvement cycle (non-blocking)', {
          templateId: suggestion.template_id,
          error: cycleError.message
        })
      }

      logger.info('[TEMPLATE-OPT] Template optimization applied successfully', {
        templateId: suggestion.template_id,
        previousVersion: suggestion.prompt_version,
        newVersion,
        expectedGain: suggestion.expected_quality_gain,
        cacheCleared: true
      })

    } catch (error: any) {
      logger.error('[TEMPLATE-OPT] Failed to apply optimization', {
        suggestionId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Get optimization suggestion with full details
   */
  async getOptimizationSuggestion(suggestionId: string): Promise<any> {
    const result = await pool.query(
      `SELECT 
        tis.*,
        t.name as template_name,
        t.framework,
        t.prompt_version as current_version,
        t.content as current_content,
        t.system_prompt as current_system_prompt
       FROM template_improvement_suggestions tis
       JOIN templates t ON tis.template_id = t.id
       WHERE tis.id = $1`,
      [suggestionId]
    )

    if (result.rows.length === 0) {
      return null
    }

    const sug = result.rows[0]
    
    // Parse JSONB fields if they're strings (PostgreSQL sometimes returns JSONB as strings)
    let suggestedImprovements = sug.suggested_improvements
    if (typeof suggestedImprovements === 'string') {
      try {
        suggestedImprovements = JSON.parse(suggestedImprovements)
      } catch (e) {
        logger.warn('[TEMPLATE-OPT] Failed to parse suggested_improvements JSONB:', e)
        suggestedImprovements = []
      }
    }
    
    // Parse current_content if it's a JSONB string
    let currentContent = sug.current_content
    if (typeof currentContent === 'string' && currentContent.startsWith('{')) {
      try {
        const parsed = JSON.parse(currentContent)
        // If it's a JSON object, try to extract the markdown content
        currentContent = parsed.content || parsed.markdown || currentContent
      } catch (e) {
        // If parsing fails, use as-is (it's probably already markdown)
      }
    }
    
    const improvement = Array.isArray(suggestedImprovements) && suggestedImprovements.length > 0 
      ? suggestedImprovements[0] 
      : null

    // Check if this is an AI optimization (has system_prompt and template_content) or a regular suggestion
    const isAIOptimization = improvement?.system_prompt && improvement?.template_content

    if (!improvement) {
      logger.warn('[TEMPLATE-OPT] No improvement found in suggested_improvements', {
        suggestionId,
        suggestedImprovementsType: typeof suggestedImprovements,
        suggestedImprovementsLength: Array.isArray(suggestedImprovements) ? suggestedImprovements.length : 'not array'
      })
      return {
        ...sug,
        optimization: {
          suggested_system_prompt: sug.current_system_prompt || '',
          suggested_content: currentContent || '',
          change_explanation: 'No optimization data available',
          changes_summary: { system_prompt_changes: [], content_changes: [], key_improvements: [] },
          current_system_prompt: sug.current_system_prompt || '',
          current_content: currentContent || '',
          current_version: sug.current_version
        }
      }
    }

    // For regular suggestions (not AI optimizations), generate a "suggested" version by applying proposed changes
    if (!isAIOptimization) {
      // Extract proposed changes from all improvements
      const proposedChanges = suggestedImprovements
        .map((imp: any) => imp.proposed_change || imp.description || '')
        .filter(Boolean)
        .join('\n\n')

      // Generate suggested system prompt by applying system_prompt improvements
      let suggestedSystemPrompt = sug.current_system_prompt || ''
      const systemPromptImprovements = suggestedImprovements
        .filter((imp: any) => imp.section === 'system_prompt' || imp.section?.toLowerCase().includes('system_prompt'))
      
      for (const imp of systemPromptImprovements) {
        const change = imp.proposed_change || imp.description || ''
        if (change) {
          // Extract actual content from proposed_change (may contain markdown code blocks or instructions)
          let actualChange = change
          // If change contains markdown code blocks, extract the content
          const codeBlockMatch = change.match(/```[\s\S]*?```/g)
          if (codeBlockMatch) {
            // Extract content from code blocks
            actualChange = codeBlockMatch.map(block => {
              const content = block.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
              return content
            }).join('\n\n')
          } else {
            // If it's an instruction, try to extract the actual content part
            // Look for patterns like "Add...: ``` content ```" or "Modify...: content"
            const instructionMatch = change.match(/:[\s]*([\s\S]+)$/)
            if (instructionMatch) {
              actualChange = instructionMatch[1].trim()
            }
          }
          
          // Append the extracted change to the system prompt
          if (actualChange && actualChange.length > 0) {
            suggestedSystemPrompt += (suggestedSystemPrompt ? '\n\n' : '') + actualChange
          }
        }
      }

      // Generate suggested content by applying template content improvements
      let suggestedContent = currentContent || ''
      const contentImprovements = suggestedImprovements
        .filter((imp: any) => imp.section !== 'system_prompt' && !imp.section?.toLowerCase().includes('system_prompt'))
      
      // Extract actual template content from proposed changes
      const contentAdditions: string[] = []
      for (const imp of contentImprovements) {
        const change = imp.proposed_change || imp.description || ''
        if (change) {
          // Look for markdown code blocks with template content (most common format)
          const codeBlockMatch = change.match(/```[\s\S]*?```/g)
          if (codeBlockMatch && codeBlockMatch.length > 0) {
            // Extract content from code blocks (this is the actual template content)
            codeBlockMatch.forEach(block => {
              // Remove code block markers (```markdown, ```, etc.)
              let content = block.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()
              if (content && content.length > 10) { // Only add substantial content
                contentAdditions.push(content)
              }
            })
          } else {
            // If no code block, try to extract content from the instruction
            // Pattern: "Add...: content" or "Modify...: content"
            const colonMatch = change.match(/:\s*([\s\S]+)$/)
            if (colonMatch) {
              let extracted = colonMatch[1].trim()
              // Remove common instruction prefixes
              extracted = extracted.replace(/^(Add|Modify|Enhance|Update|Change)\s+/i, '').trim()
              if (extracted.length > 20) { // Only if substantial content
                contentAdditions.push(extracted)
              }
            } else if (change.length > 100 && 
                      !change.toLowerCase().startsWith('add') && 
                      !change.toLowerCase().startsWith('modify') &&
                      !change.toLowerCase().startsWith('enhance') &&
                      !change.toLowerCase().startsWith('update')) {
              // If it's substantial content that's not just an instruction, include it
              contentAdditions.push(change)
            }
          }
        }
      }

      // Append extracted content additions to the template
      // Add a clear separator to show these are additions
      if (contentAdditions.length > 0) {
        suggestedContent += '\n\n<!-- PROPOSED ADDITIONS FROM IMPROVEMENTS -->\n\n' + contentAdditions.join('\n\n')
      }

      return {
        ...sug,
        optimization: {
          suggested_system_prompt: suggestedSystemPrompt,
          suggested_content: suggestedContent,
          change_explanation: proposedChanges || 'Individual improvements proposed (see Change Summary tab)',
          changes_summary: {
            system_prompt_changes: systemPromptImprovements
              .map((imp: any) => imp.proposed_change || imp.description || ''),
            content_changes: contentImprovements
              .map((imp: any) => imp.proposed_change || imp.description || ''),
            key_improvements: suggestedImprovements.map((imp: any) => 
              `${imp.issue_addressed || imp.title || 'Improvement'}: ${imp.proposed_change || imp.description || ''}`
            )
          },
          current_system_prompt: sug.current_system_prompt || '',
          current_content: currentContent || '',
          // For regular suggestions, show current vs suggested (with changes applied)
          suggested_system_prompt_for_diff: suggestedSystemPrompt,
          suggested_content_for_diff: suggestedContent,
          current_version: sug.current_version,
          is_regular_suggestion: true // Flag to indicate this is not a full template optimization
        }
      }
    }

    // Extract suggested content - handle both string and object formats (for AI optimizations)
    let suggestedContent = improvement.template_content
    if (typeof suggestedContent === 'object' && suggestedContent !== null) {
      suggestedContent = suggestedContent.content || suggestedContent.markdown || JSON.stringify(suggestedContent, null, 2)
    }

    // Get original content from metadata (stored when suggestion was created)
    // This is important because after optimization is applied, current template IS the optimized version
    const metadata = improvement.metadata || {}
    const originalSystemPrompt = metadata.original_system_prompt || sug.current_system_prompt || ''
    const originalContent = metadata.original_content || currentContent || ''

    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      logger.info('[TEMPLATE-OPT] Processing AI optimization', {
        suggestionId,
        status: sug.status,
        hasOriginalSystemPrompt: !!metadata.original_system_prompt,
        hasOriginalContent: !!metadata.original_content,
        originalSystemPromptLength: originalSystemPrompt.length,
        originalContentLength: originalContent.length,
        currentSystemPromptLength: (sug.current_system_prompt || '').length,
        currentContentLength: (currentContent || '').length,
        suggestedSystemPromptLength: (improvement.system_prompt || '').length,
        suggestedContentLength: (suggestedContent || '').length
      })
    }

    // Use original content for "current" side of diff (what it was before optimization)
    // Use suggested content for "new" side (what it should become)
    // If status is "implemented", current template IS the optimized version, so we show original vs current
    const isImplemented = sug.status === 'implemented'
    const diffCurrentSystemPrompt = isImplemented ? originalSystemPrompt : sug.current_system_prompt || ''
    const diffCurrentContent = isImplemented ? originalContent : currentContent || ''
    const diffNewSystemPrompt = isImplemented ? sug.current_system_prompt || '' : (improvement.system_prompt || sug.current_system_prompt || '')
    const diffNewContent = isImplemented ? currentContent || '' : (suggestedContent || currentContent || '')

    // Validate that we have meaningful differences (for pending suggestions)
    if (!isImplemented) {
      const hasSystemPromptDiff = diffCurrentSystemPrompt !== diffNewSystemPrompt
      const hasContentDiff = diffCurrentContent !== diffNewContent
      
      if (!hasSystemPromptDiff && !hasContentDiff) {
        logger.warn('[TEMPLATE-OPT] No meaningful differences detected in optimization', {
          suggestionId,
          status: sug.status,
          currentSystemPromptLength: diffCurrentSystemPrompt.length,
          suggestedSystemPromptLength: diffNewSystemPrompt.length,
          currentContentLength: diffCurrentContent.length,
          suggestedContentLength: diffNewContent.length
        })
      }
    }

    return {
      ...sug,
      optimization: {
        suggested_system_prompt: improvement.system_prompt || sug.current_system_prompt || '',
        suggested_content: suggestedContent || currentContent || '',
        change_explanation: improvement.proposed_change || improvement.change_explanation || 'No explanation provided',
        changes_summary: improvement.changes_summary || { system_prompt_changes: [], content_changes: [], key_improvements: [] },
        // For diff view: show original (before) vs current/suggested (after)
        current_system_prompt: diffCurrentSystemPrompt,
        current_content: diffCurrentContent,
        // New content is either the suggested (if pending) or current (if implemented)
        suggested_system_prompt_for_diff: diffNewSystemPrompt,
        suggested_content_for_diff: diffNewContent,
        current_version: sug.current_version
      }
    }
  }
}

export const templateOptimizationService = new TemplateOptimizationService()

