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
  content: string
  system_prompt?: string
  prompt_version: number
  framework: string
  category: string
}

interface QualityAudit {
  overall_score: number
  overall_grade: string
  completeness_score: number
  structure_score: number
  formatting_score: number
  content_depth_score: number
  accuracy_score: number
  consistency_score: number
  context_relevance_score: number
  professional_quality_score: number
  standards_compliance_score: number
  issues: any[]
  recommendations: any[]
}

interface TemplateOptimizationSuggestion {
  suggested_system_prompt: string
  suggested_content: string
  change_explanation: string
  expected_quality_gain: number
  changes_summary: {
    system_prompt_changes: string[]
    content_changes: string[]
    key_improvements: string[]
  }
}

export class TemplateOptimizationService {
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

      // Save suggestion to database
      const suggestionId = await this.saveSuggestion(
        templateId,
        optimization,
        auditBefore.overall_score,
        auditAfter.overall_score
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

    const result = await aiService.generate({
      provider: 'google',
      model: 'gemini-2.0-flash-exp', // Use experimental for advanced reasoning
      prompt: metaPrompt,
      system_prompt: `You are an expert template optimization AI specializing in PMBOK, BABOK, and DMBOK documentation standards.
Your role is to analyze template performance data and generate improved templates that produce higher-quality documents.
Always respond with valid JSON only.`,
      temperature: 0.3, // Lower temperature for consistent, analytical responses
      max_tokens: 8000
    })

    // Parse AI response
    let cleaned = result.content.trim()
    if (cleaned.startsWith('```json')) cleaned = cleaned.substring(7)
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(3)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3)

    const parsed = JSON.parse(cleaned.trim())

    return {
      suggested_system_prompt: parsed.suggested_system_prompt,
      suggested_content: parsed.suggested_content,
      change_explanation: parsed.change_explanation,
      expected_quality_gain: parsed.expected_quality_gain || 10,
      changes_summary: parsed.changes_summary
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
      { name: 'Structure', before: auditBefore.structure_score, after: auditAfter.structure_score },
      { name: 'Formatting & Style', before: auditBefore.formatting_score, after: auditAfter.formatting_score },
      { name: 'Content Depth', before: auditBefore.content_depth_score, after: auditAfter.content_depth_score },
      { name: 'Accuracy', before: auditBefore.accuracy_score, after: auditAfter.accuracy_score },
      { name: 'Consistency', before: auditBefore.consistency_score, after: auditAfter.consistency_score },
      { name: 'Context Relevance', before: auditBefore.context_relevance_score, after: auditAfter.context_relevance_score },
      { name: 'Professional Quality', before: auditBefore.professional_quality_score, after: auditAfter.professional_quality_score },
      { name: 'Standards Compliance', before: auditBefore.standards_compliance_score, after: auditAfter.standards_compliance_score }
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

  /**
   * Save optimization suggestion for admin review
   */
  private async saveSuggestion(
    templateId: string,
    optimization: TemplateOptimizationSuggestion,
    scoreBefore: number,
    scoreAfter: number
  ): Promise<string> {
    const suggestionId = uuidv4()

    await pool.query(
      `INSERT INTO template_improvement_suggestions
       (id, template_id, status, priority, expected_quality_gain, current_avg_quality,
        analysis_period_start, analysis_period_end, documents_analyzed,
        common_issues, suggested_improvements, improvement_rationale, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '1 day', NOW(), $7, $8, $9, $10, NOW())`,
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
          // Embed metadata in the improvement object
          metadata: {
            optimization_type: 'ai_generated',
            trigger: 'quality_regression',
            score_before: scoreBefore,
            score_after: scoreAfter,
            regression_amount: scoreBefore - scoreAfter,
            generated_at: new Date().toISOString()
          }
        }]),
        `AI-generated optimization triggered by quality regression: ${scoreBefore}% → ${scoreAfter}% (-${scoreBefore - scoreAfter}%)`
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
      const improvement = suggestion.suggested_improvements[0]

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
           content = $1,
           system_prompt = $2,
           prompt_version = $3,
           updated_at = NOW(),
           updated_by = $4,
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{optimization_history}',
             COALESCE(metadata->'optimization_history', '[]'::jsonb) || 
             jsonb_build_array(jsonb_build_object(
               'suggestion_id', $5::text,
               'applied_at', NOW(),
               'applied_by', $4::text,
               'previous_version', $3::integer - 1,
               'new_version', $3::integer,
               'quality_improvement', $6::numeric,
               'changes_summary', $7::jsonb
             ))
           )
         WHERE id = $8`,
        [
          improvement.template_content,
          improvement.system_prompt,
          newVersion,
          adminId,
          suggestionId,
          suggestion.expected_quality_gain,
          JSON.stringify(improvement.changes_summary),
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

      logger.info('[TEMPLATE-OPT] Template optimization applied successfully', {
        templateId: suggestion.template_id,
        previousVersion: suggestion.prompt_version,
        newVersion,
        expectedGain: suggestion.expected_quality_gain
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
    const improvement = sug.suggested_improvements[0]

    return {
      ...sug,
      optimization: {
        suggested_system_prompt: improvement.system_prompt,
        suggested_content: improvement.template_content,
        change_explanation: improvement.proposed_change,
        changes_summary: improvement.changes_summary,
        current_system_prompt: sug.current_system_prompt,
        current_content: sug.current_content,
        current_version: sug.current_version
      }
    }
  }
}

export const templateOptimizationService = new TemplateOptimizationService()

