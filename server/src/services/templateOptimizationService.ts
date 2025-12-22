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
  suggested_content: string
  change_explanation: string
  expected_quality_gain: number
  changes_summary: {
    system_prompt_changes: string[]
    content_changes: string[]
    key_improvements: string[]
  }
  tokens?: number
  cost?: number
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

    const result = await aiService.generateWithFallback({
      provider: preferredProvider,
      model: defaultModel,
      prompt: metaPrompt,
      system_prompt: `You are an expert template optimization AI specializing in PMBOK, BABOK, and DMBOK documentation standards.
Your role is to analyze template performance data and generate improved templates that produce higher-quality documents.
Always respond with valid JSON only.`,
      temperature: 0.3, // Lower temperature for consistent, analytical responses
      max_tokens: 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    const usage = result.usage || {}

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
        changes_summary: parsed.changes_summary || { system_prompt_changes: [], content_changes: [], key_improvements: [] },
        tokens: totalTokens,
        cost: estimatedCost
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
        'google',
        'gemini-2.0-flash-exp',
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
      const { cache } = await import('../utils/redis')
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
          const { getQueueService } = await import('./queueService')
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

    // Use original content for "current" side of diff (what it was before optimization)
    // Use suggested content for "new" side (what it should become)
    // If status is "implemented", current template IS the optimized version, so we show original vs current
    const isImplemented = sug.status === 'implemented'
    const diffCurrentSystemPrompt = isImplemented ? originalSystemPrompt : sug.current_system_prompt || ''
    const diffCurrentContent = isImplemented ? originalContent : currentContent || ''
    const diffNewSystemPrompt = isImplemented ? sug.current_system_prompt || '' : (improvement.system_prompt || sug.current_system_prompt || '')
    const diffNewContent = isImplemented ? currentContent || '' : (suggestedContent || currentContent || '')

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

