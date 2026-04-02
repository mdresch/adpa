/**
 * DRACO Strategic Value Assessor
 * Validates that quality objectives align with business strategic outcomes.
 * Identifies when a document technically "passes" quality thresholds but fails
 * to deliver actual strategic value.
 */

import { aiService } from './aiService'
import { logger } from '../utils/logger'
import type { DracoThresholds, StrategicValueAssessmentResult } from '../types/draco'
import { getDatabasePoolSafe } from '../database/connection'

// ─── Provider Selection ───────────────────────────────────────────────────────

async function getStrategicAssessorProvider(): Promise<{ provider: string; model?: string }> {
  try {
    const pool = getDatabasePoolSafe()
    if (!pool) return { provider: 'google' }

    // Use a different rotation cursor (offset 3) to avoid collision with board members
    const result = await pool.query<{ provider_type: string; configuration: any }>(
      `SELECT provider_type, configuration 
       FROM ai_providers 
       WHERE is_active = true 
       ORDER BY priority ASC, name ASC
       LIMIT 5`
    )

    if (!result.rows.length) return { provider: 'google' }

    // Use index 3 (4th provider) to be offset from board members (0,1,2)
    const idx = result.rows.length > 3 ? 3 : 0
    const row = result.rows[idx % result.rows.length]
    return {
      provider: row.provider_type,
      model: row.configuration?.default_model || undefined,
    }
  } catch {
    return { provider: 'google' }
  }
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildStrategicValuePrompt(
  content: string,
  documentType: string,
  projectContext: Record<string, unknown>
): string {
  return `You are the Strategic Value Assessor for the DRACO Quality Control System.

Your role: Assess whether this ${documentType} document actually delivers strategic value aligned with the project's business objectives. A document may be technically complete and compliant, yet still fail to serve its actual strategic purpose.

Ask yourself: Would a senior executive reading this document get actionable, strategically meaningful content? Or is it verbose, generic, or misaligned with what the project actually needs?

## Project Strategic Context:
- Project Name: ${projectContext.name || 'N/A'}
- Framework: ${projectContext.framework || 'N/A'}
- Project Objective: ${projectContext.description || 'N/A'}
- Status: ${projectContext.status || 'N/A'}

## Document Type: ${documentType}

## Document Content:
\`\`\`
${content.substring(0, 40000)}${content.length > 40000 ? '\n... [truncated]' : ''}
\`\`\`

## Your Strategic Assessment Task:
1. **Score (0-100)**: Strategic value alignment score. 100 = perfectly serves strategic objectives.
2. **Document Purpose Alignment**: strong/adequate/weak/misaligned
3. **Strategic Objectives Covered**: Which of the project's strategic goals are well-served by this document?
4. **Strategic Objectives Missing**: What strategic needs does this document fail to address?
5. **Alignment Gaps**: Specific mismatches between document content and strategic objectives
6. **Business Value Assessment**: Plain English assessment of the document's strategic utility
7. **Template Prompt Suggestions**: How can the template prompt be improved to produce more strategically aligned content?

Respond ONLY with valid JSON:
\`\`\`json
{
  "score": <0-100>,
  "document_purpose_alignment": "strong|adequate|weak|misaligned",
  "strategic_objectives_covered": ["<objective 1>"],
  "strategic_objectives_missing": ["<missing objective>"],
  "alignment_gaps": [
    {
      "objective": "<strategic objective>",
      "gap_description": "<what gap exists>",
      "impact": "low|medium|high",
      "recommendation": "<how to close the gap>"
    }
  ],
  "business_value_assessment": "<plain language assessment>",
  "template_prompt_suggestions": ["<prompt improvement 1>"]
}
\`\`\`
CRITICAL: Respond ONLY with the JSON block.`
}

// ─── JSON Parsing ─────────────────────────────────────────────────────────────

function parseAIJson(raw: string): Record<string, unknown> {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const sanitized = cleaned
      .replace(/[\u0000-\u001F]+/g, ' ')
      .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    return JSON.parse(sanitized)
  }
}

function safeNum(val: unknown, fallback = 70): number {
  const n = Number(val)
  return isNaN(n) || n < 0 || n > 100 ? fallback : n
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runStrategicValueAssessment(
  content: string,
  documentType: string,
  projectContext: Record<string, unknown>,
  thresholds: DracoThresholds
): Promise<StrategicValueAssessmentResult> {
  const start = Date.now()
  const { provider, model } = await getStrategicAssessorProvider()

  logger.info('[DRACO-STRATEGIC] Running strategic value assessment', { provider, documentType })

  try {
    const prompt = buildStrategicValuePrompt(content, documentType, projectContext)
    const result = await aiService.generateWithFallback({
      provider,
      model,
      prompt,
      temperature: 0.3,
      max_tokens: 2500,
      aiCallType: 'draco_strategic_assessment',
    })

    const data = parseAIJson(result.content)
    const score = safeNum(data.score, 70)

    const alignmentValues = ['strong', 'adequate', 'weak', 'misaligned']
    const purposeAlignment = alignmentValues.includes(String(data.document_purpose_alignment))
      ? (data.document_purpose_alignment as 'strong' | 'adequate' | 'weak' | 'misaligned')
      : 'adequate'

    const processingTime = Date.now() - start

    logger.info('[DRACO-STRATEGIC] Assessment complete', { score, provider: result.providerUsed })

    return {
      score,
      passed: score >= thresholds.strategic_alignment,
      alignment_gaps: Array.isArray(data.alignment_gaps) ? data.alignment_gaps : [],
      strategic_objectives_covered: Array.isArray(data.strategic_objectives_covered) ? data.strategic_objectives_covered : [],
      strategic_objectives_missing: Array.isArray(data.strategic_objectives_missing) ? data.strategic_objectives_missing : [],
      document_purpose_alignment: purposeAlignment,
      business_value_assessment: String(data.business_value_assessment ?? 'No assessment available.'),
      template_prompt_suggestions: Array.isArray(data.template_prompt_suggestions) ? data.template_prompt_suggestions : [],
      provider_used: result.providerUsed ?? provider,
      model_used: result.model ?? model ?? 'default',
      processing_time_ms: processingTime,
    }
  } catch (err) {
    logger.error('[DRACO-STRATEGIC] Assessment failed', { provider, error: String(err) })
    const processingTime = Date.now() - start
    return {
      score: 65,
      passed: false,
      alignment_gaps: [],
      strategic_objectives_covered: [],
      strategic_objectives_missing: ['Strategic assessment could not be completed'],
      document_purpose_alignment: 'adequate',
      business_value_assessment: 'Strategic assessment failed due to AI provider error. Manual review recommended.',
      template_prompt_suggestions: [],
      provider_used: provider,
      model_used: model ?? 'default',
      processing_time_ms: processingTime,
    }
  }
}
