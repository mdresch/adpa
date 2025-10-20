/**
 * Baseline Service
 * CR-2026-001: Project Baseline & Drift Detection System
 * Phase 1: AI-powered baseline extraction from document corpus
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService } from './aiService'

interface DocumentForBaseline {
  id: string
  title: string
  content: string
  template_name?: string
  created_at: Date
  word_count?: number
}

interface BaselineExtractionResult {
  scope_baseline: any
  technical_baseline: any
  timeline_baseline: any
  cost_baseline: any
  resource_baseline: any
  success_criteria: any
  extraction_confidence: number
  completeness_score: number
  consistency_score: number
  clarity_score: number
  ai_processing_metadata: any
}

/**
 * Get all documents for a project to use as baseline corpus
 */
export async function getProjectDocumentCorpus(projectId: string): Promise<DocumentForBaseline[]> {
  try {
    const result = await pool.query(
      `SELECT 
        d.id,
        d.title,
        d.content,
        t.name as template_name,
        d.created_at,
        d.word_count
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1
        AND d.deleted_at IS NULL
        AND d.content IS NOT NULL
        AND d.content != ''
      ORDER BY d.created_at ASC`,
      [projectId]
    )

    return result.rows
  } catch (error) {
    logger.error('Error fetching project document corpus:', error)
    throw error
  }
}

/**
 * Extract baseline from document corpus using AI
 */
export async function extractBaselineFromCorpus(
  projectId: string,
  userId: string,
  options: {
    includeDocumentIds?: string[]
    aiProvider?: string
    aiModel?: string
  } = {}
): Promise<BaselineExtractionResult> {
  try {
    // Fetch document corpus
    let documents = await getProjectDocumentCorpus(projectId)

    // Filter to specific documents if requested
    if (options.includeDocumentIds && options.includeDocumentIds.length > 0) {
      documents = documents.filter(doc => options.includeDocumentIds!.includes(doc.id))
    }

    if (documents.length === 0) {
      throw new Error('No documents found for baseline extraction')
    }

    // Prepare document summaries for AI analysis
    const documentSummaries = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      template: doc.template_name || 'Unknown',
      content_preview: doc.content.substring(0, 2000), // First 2000 chars
      word_count: doc.word_count || 0,
      created_at: doc.created_at
    }))

    // Build AI prompt for baseline extraction
    const prompt = buildBaselineExtractionPrompt(documentSummaries, documents)

    // Call AI to extract baseline
    const startTime = Date.now()
    const aiResponse = await aiService.generateWithFallback({
      prompt: prompt + '\n\nSYSTEM INSTRUCTIONS:\n' + BASELINE_EXTRACTION_SYSTEM_PROMPT,
      provider: options.aiProvider || 'openai',
      model: options.aiModel || 'gpt-4-turbo-preview',
      temperature: 0.3,
      max_tokens: 4000,
      system_prompt: BASELINE_EXTRACTION_SYSTEM_PROMPT
    })
    const processingTime = Date.now() - startTime

    // Parse AI response
    const extractedBaseline = parseBaselineExtractionResponse(aiResponse.content)

    // Calculate quality scores
    const qualityScores = calculateBaselineQualityScores(extractedBaseline, documents.length)

    // Build result
    const result: BaselineExtractionResult = {
      scope_baseline: extractedBaseline.scope_baseline,
      technical_baseline: extractedBaseline.technical_baseline,
      timeline_baseline: extractedBaseline.timeline_baseline,
      cost_baseline: extractedBaseline.cost_baseline,
      resource_baseline: extractedBaseline.resource_baseline,
      success_criteria: extractedBaseline.success_criteria,
      extraction_confidence: extractedBaseline.confidence || 0.85,
      completeness_score: qualityScores.completeness,
      consistency_score: qualityScores.consistency,
      clarity_score: qualityScores.clarity,
      ai_processing_metadata: {
        provider: (aiResponse as any).provider || (aiResponse as any).providerUsed || options.aiProvider || 'openai',
        model: aiResponse.model || options.aiModel || 'gpt-4-turbo-preview',
        processing_time_ms: processingTime,
        input_tokens: aiResponse.usage?.prompt_tokens || 0,
        output_tokens: aiResponse.usage?.completion_tokens || 0,
        total_tokens: aiResponse.usage?.total_tokens || 0,
        documents_analyzed: documents.length,
        total_words_analyzed: documents.reduce((sum, doc) => sum + (doc.word_count || 0), 0)
      }
    }

    logger.info(`Baseline extracted for project ${projectId}:`, {
      documents_analyzed: documents.length,
      extraction_confidence: result.extraction_confidence,
      processing_time_ms: processingTime
    })

    return result
  } catch (error) {
    logger.error('Error extracting baseline from corpus:', error)
    throw error
  }
}

/**
 * Create a new baseline for a project
 */
export async function createBaseline(
  projectId: string,
  userId: string,
  baselineData: BaselineExtractionResult,
  documentIds: string[]
): Promise<any> {
  try {
    const result = await pool.query(
      `INSERT INTO project_baselines (
        project_id,
        version,
        status,
        created_by,
        document_corpus,
        scope_baseline,
        technical_baseline,
        timeline_baseline,
        cost_baseline,
        resource_baseline,
        success_criteria,
        ai_processing_metadata,
        extraction_confidence,
        completeness_score,
        consistency_score,
        clarity_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        projectId,
        '1.0', // First version
        'draft', // Initial status
        userId,
        JSON.stringify(documentIds),
        JSON.stringify(baselineData.scope_baseline),
        JSON.stringify(baselineData.technical_baseline),
        JSON.stringify(baselineData.timeline_baseline),
        JSON.stringify(baselineData.cost_baseline),
        JSON.stringify(baselineData.resource_baseline),
        JSON.stringify(baselineData.success_criteria),
        JSON.stringify(baselineData.ai_processing_metadata),
        baselineData.extraction_confidence,
        baselineData.completeness_score,
        baselineData.consistency_score,
        baselineData.clarity_score
      ]
    )

    // Log version creation
    await pool.query(
      `INSERT INTO baseline_versions (
        baseline_id,
        version_number,
        change_type,
        change_description,
        changed_by
      ) VALUES ($1, $2, $3, $4, $5)`,
      [result.rows[0].id, '1.0', 'created', 'Initial baseline created from document corpus', userId]
    )

    logger.info(`Baseline created for project ${projectId}: ${result.rows[0].id}`)
    return result.rows[0]
  } catch (error) {
    logger.error('Error creating baseline:', error)
    throw error
  }
}

/**
 * Validate document against project baseline and detect drift
 */
export async function validateDocumentAgainstBaseline(
  projectId: string,
  documentId: string,
  documentContent: string,
  documentTitle: string
): Promise<any[]> {
  try {
    // Get active baseline for project
    const baselineResult = await pool.query(
      `SELECT * FROM project_baselines
       WHERE project_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId]
    )

    if (baselineResult.rows.length === 0) {
      logger.info(`No active baseline found for project ${projectId} - skipping validation`)
      return []
    }

    const baseline = baselineResult.rows[0]

    // Build AI prompt for drift detection
    const prompt = buildDriftDetectionPrompt(baseline, documentContent, documentTitle)

    // Call AI to detect drift
    const aiResponse = await aiService.generateWithFallback({
      prompt: prompt + '\n\nSYSTEM INSTRUCTIONS:\n' + DRIFT_DETECTION_SYSTEM_PROMPT,
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.2,
      max_tokens: 2000,
      system_prompt: DRIFT_DETECTION_SYSTEM_PROMPT
    })

    // Parse drift detection response
    const detectedDrifts = parseDriftDetectionResponse(aiResponse.content)

    // Store detected drifts in database
    const driftRecords = []
    for (const drift of detectedDrifts) {
      const driftResult = await pool.query(
        `INSERT INTO baseline_drift_detection (
          baseline_id,
          project_id,
          source_document_id,
          detection_type,
          drift_severity,
          drift_description,
          drift_impact,
          detected_by,
          ai_confidence,
          ai_processing_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          baseline.id,
          projectId,
          documentId,
          drift.type,
          drift.severity,
          drift.description,
          drift.impact,
          'ai',
          drift.confidence,
          JSON.stringify(aiResponse.usage)
        ]
      )
      driftRecords.push(driftResult.rows[0])
    }

    if (driftRecords.length > 0) {
      logger.warn(`Detected ${driftRecords.length} baseline drift(s) for document ${documentId}`)
    } else {
      logger.info(`No baseline drift detected for document ${documentId}`)
    }

    return driftRecords
  } catch (error) {
    logger.error('Error validating document against baseline:', error)
    throw error
  }
}

/**
 * Get active baseline for a project
 */
export async function getActiveBaseline(projectId: string): Promise<any> {
  try {
    const result = await pool.query(
      `SELECT * FROM project_baselines
       WHERE project_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId]
    )

    return result.rows[0] || null
  } catch (error) {
    logger.error('Error fetching active baseline:', error)
    throw error
  }
}

/**
 * Approve a baseline (change status from draft to approved/active)
 */
export async function approveBaseline(baselineId: string, userId: string): Promise<any> {
  try {
    const result = await pool.query(
      `UPDATE project_baselines
       SET status = 'active', approved_by = $2, approved_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [baselineId, userId]
    )

    // Log approval
    await pool.query(
      `INSERT INTO baseline_versions (
        baseline_id,
        version_number,
        change_type,
        change_description,
        changed_by
      ) VALUES ($1, $2, $3, $4, $5)`,
      [baselineId, result.rows[0].version, 'approved', 'Baseline approved and activated', userId]
    )

    logger.info(`Baseline ${baselineId} approved by user ${userId}`)
    return result.rows[0]
  } catch (error) {
    logger.error('Error approving baseline:', error)
    throw error
  }
}

// ==================== PROMPT TEMPLATES ====================

const BASELINE_EXTRACTION_SYSTEM_PROMPT = `You are an expert project analyst specializing in extracting structured project baselines from documents.

Your task is to analyze a collection of project documents and extract:
1. Scope Baseline: Project objectives, deliverables, boundaries, assumptions, constraints
2. Technical Baseline: Technology stack, architecture, technical requirements, constraints
3. Timeline Baseline: Milestones, phases, dependencies, critical path
4. Cost Baseline: Budget, resource costs, cost breakdown
5. Resource Baseline: Team composition, skills, capacity, roles
6. Success Criteria: KPIs, acceptance criteria, quality metrics

Return your analysis as a JSON object with these exact keys. Be thorough, specific, and extract only factual information from the documents.`

const DRIFT_DETECTION_SYSTEM_PROMPT = `You are an expert project analyst specializing in detecting deviations from established project baselines.

Your task is to compare a new document against an approved project baseline and identify any drift:
- Scope drift: New features, changed deliverables, altered boundaries
- Technical drift: Different technologies, changed architecture, new constraints
- Timeline drift: Delayed milestones, changed dependencies, schedule changes
- Cost drift: Budget increases, new resource requirements
- Resource drift: Team changes, skill gaps, capacity issues
- Success criteria drift: Changed KPIs, altered acceptance criteria

For each drift detected, provide:
1. Type (scope_drift, technical_drift, timeline_drift, cost_drift, resource_drift, success_criteria_drift)
2. Severity (low, medium, high, critical)
3. Description (specific change detected)
4. Impact (potential consequences)
5. Confidence (0.0-1.0)

Return your analysis as a JSON array of drift objects. Only report actual drift, not minor variations.`

function buildBaselineExtractionPrompt(documentSummaries: any[], fullDocuments: DocumentForBaseline[]): string {
  return `Analyze the following ${fullDocuments.length} project documents and extract a comprehensive project baseline.

DOCUMENT CORPUS OVERVIEW:
${documentSummaries.map((doc, idx) => `
${idx + 1}. "${doc.title}" (${doc.template})
   - Created: ${doc.created_at}
   - Words: ${doc.word_count}
   - Preview: ${doc.content_preview.substring(0, 300)}...
`).join('\n')}

FULL DOCUMENT CONTENT:
${fullDocuments.map((doc, idx) => `
=== DOCUMENT ${idx + 1}: ${doc.title} ===
${doc.content}
`).join('\n\n')}

Extract and return a JSON object with this exact structure:
{
  "scope_baseline": {
    "project_objectives": ["list of objectives"],
    "key_deliverables": ["list of deliverables"],
    "scope_boundaries": ["what's in scope", "what's out of scope"],
    "assumptions": ["project assumptions"],
    "constraints": ["project constraints"]
  },
  "technical_baseline": {
    "technology_stack": ["technologies used"],
    "architecture": "description of architecture",
    "technical_requirements": ["list of requirements"],
    "technical_constraints": ["technical limitations"]
  },
  "timeline_baseline": {
    "project_duration": "estimated duration",
    "key_milestones": [{"name": "milestone", "target_date": "date or relative time"}],
    "phases": [{"name": "phase", "duration": "duration", "deliverables": []}],
    "critical_dependencies": ["dependencies"]
  },
  "cost_baseline": {
    "total_budget": "budget amount or 'not specified'",
    "cost_breakdown": {"category": "amount"},
    "resource_costs": ["cost items"]
  },
  "resource_baseline": {
    "team_composition": ["roles and team members"],
    "required_skills": ["skills needed"],
    "capacity_allocation": "team capacity info"
  },
  "success_criteria": {
    "kpis": ["key performance indicators"],
    "acceptance_criteria": ["criteria for success"],
    "quality_metrics": ["quality measures"]
  },
  "confidence": 0.85
}

Be thorough and extract ALL relevant information from the documents.`
}

function buildDriftDetectionPrompt(baseline: any, documentContent: string, documentTitle: string): string {
  return `Compare this new document against the established project baseline and detect any drift.

ESTABLISHED BASELINE:
Scope: ${JSON.stringify(baseline.scope_baseline, null, 2)}
Technical: ${JSON.stringify(baseline.technical_baseline, null, 2)}
Timeline: ${JSON.stringify(baseline.timeline_baseline, null, 2)}
Cost: ${JSON.stringify(baseline.cost_baseline, null, 2)}
Resources: ${JSON.stringify(baseline.resource_baseline, null, 2)}
Success Criteria: ${JSON.stringify(baseline.success_criteria, null, 2)}

NEW DOCUMENT: "${documentTitle}"
${documentContent}

Detect any drift from the baseline. Return a JSON array:
[
  {
    "type": "scope_drift|technical_drift|timeline_drift|cost_drift|resource_drift|success_criteria_drift",
    "severity": "low|medium|high|critical",
    "description": "specific change detected",
    "impact": "potential consequences",
    "confidence": 0.0-1.0
  }
]

Return an empty array [] if no drift detected.`
}

function parseBaselineExtractionResponse(aiResponse: string): any {
  try {
    // Try to find JSON in response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('No JSON found in AI response')
  } catch (error) {
    logger.error('Error parsing baseline extraction response:', error)
    throw new Error('Failed to parse AI baseline extraction response')
  }
}

function parseDriftDetectionResponse(aiResponse: string): any[] {
  try {
    // Try to find JSON array in response
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    // If no array found, assume no drift
    return []
  } catch (error) {
    logger.error('Error parsing drift detection response:', error)
    return []
  }
}

function calculateBaselineQualityScores(baseline: any, documentCount: number): any {
  // Calculate completeness: how many baseline components are populated
  const components = [
    baseline.scope_baseline,
    baseline.technical_baseline,
    baseline.timeline_baseline,
    baseline.cost_baseline,
    baseline.resource_baseline,
    baseline.success_criteria
  ]
  const populatedComponents = components.filter(c => c && Object.keys(c).length > 0).length
  const completeness = populatedComponents / components.length

  // Calculate consistency: higher score for more documents analyzed
  const consistency = Math.min(0.5 + (documentCount / 20), 1.0) // Max at 20 documents

  // Calculate clarity: based on baseline content depth
  let totalFields = 0
  let populatedFields = 0
  components.forEach(component => {
    if (component) {
      const fields = Object.keys(component)
      totalFields += fields.length
      populatedFields += fields.filter(f => component[f] && (Array.isArray(component[f]) ? component[f].length > 0 : component[f] !== '')).length
    }
  })
  const clarity = totalFields > 0 ? populatedFields / totalFields : 0

  return {
    completeness: Math.round(completeness * 100) / 100,
    consistency: Math.round(consistency * 100) / 100,
    clarity: Math.round(clarity * 100) / 100
  }
}

export const baselineService = {
  getProjectDocumentCorpus,
  extractBaselineFromCorpus,
  createBaseline,
  validateDocumentAgainstBaseline,
  getActiveBaseline,
  approveBaseline
}
