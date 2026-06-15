import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { unifiedAIService } from "./unifiedAIService"
import { documentTemplateService } from "../modules/documentTemplates/service"
import { getContextForStrategy } from "./gkg"
import { z } from "zod"
import { buildInlineEntityExtractionPrompt } from "./inlineEntityExtractionPrompt"
import { v4 as uuidv4 } from "uuid"
import { updateJobStatus, updateJobLlmProgress, type LlmProgressStep } from "./queueService"
import { CompactorService } from "./compactorService"
import { contextRetrieval } from "./searchService"

export interface DocumentGenerationRequest {
  jobId?: string
  projectId: string
  templateId?: string
  userPrompt: string
  provider: string
  model?: string
  temperature?: number
  userId: string
  documentId?: string
  name?: string
  /** Source documents whose chunks and extracted entities supply section context */
  sourceDocumentIds?: string[]
}

import { ProjectContext } from '@root-types/adpa'

export interface TemplateContext {
  id: string
  name: string
  framework: string
  category?: string
  system_prompt?: string
  template_paragraphs?: Array<{
    section_name: string
    section_type: string
    description: string
    required: boolean
    order: number
    prompt_guidance?: string
  }>
}

interface LLMPromptSnapshot {
  phase: 'planning' | 'drafting' | 'auditing' | 'patching' | 'compacting'
  label: string
  traceName: string
  provider: string
  model?: string
  temperature: number
  prompt: string
  response?: string
  characterCount: number
  capturedAt: string
  order?: number
  heading?: string
  goal?: string
  /** Metrics about the context injection for this specific snapshot */
  context_metrics?: {
    rag_query?: string
    rag_chunks_found?: number
    rag_strategy?: string
    entities_injected?: number
    baseline_entities_injected?: number
  }
}

class DocumentGenerationService {
  public async recordLLMPromptSnapshot(
    jobId: string | undefined,
    snapshot: Omit<LLMPromptSnapshot, 'characterCount' | 'capturedAt'>
  ): Promise<LLMPromptSnapshot | undefined> {
    if (!jobId) return

    const storeBlobs = process.env.LLM_INSIGHTS_STORE_BLOBS === "true"

    const payload: LLMPromptSnapshot = {
      ...snapshot,
      characterCount: snapshot.prompt?.length || 0,
      capturedAt: new Date().toISOString(),
    }

    if (!storeBlobs) {
      delete (payload as any).prompt
      delete (payload as any).response
    }

    try {
      await pool.query(
        `
        UPDATE jobs
        SET data = jsonb_set(
          jsonb_set(
            COALESCE(data, '{}'::jsonb),
            '{llm_insights}',
            COALESCE(data->'llm_insights', '{}'::jsonb),
            true
          ),
          '{llm_insights,requests}',
          COALESCE(data #> '{llm_insights,requests}', '[]'::jsonb) || jsonb_build_array($1::jsonb),
          true
        )
        WHERE id = $2
        `,
        [JSON.stringify(payload), jobId]
      )
    } catch (error) {
      logger.warn('Failed to record LLM prompt snapshot for job monitor', {
        jobId,
        phase: snapshot.phase,
        label: snapshot.label,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return payload
  }

  private getDraftConcurrency(provider: string): number {
    const configured = Number(process.env.ADPA_DOC_GEN_DRAFT_CONCURRENCY)
    if (Number.isInteger(configured) && configured > 0) {
      return configured
    }

    // Keep inline generation responsive without flooding quota-limited providers.
    // Google free-tier: 20 RPM → serial drafting prevents 429 cascades.
    if (provider === 'google') {
      return 1
    }
    if (provider === 'mistral') {
      return 1
    }

    return 3
  }

  /**
   * Retry wrapper for rate-limited (429) AI calls.
   * On a 429, waits the time the error message advertises (or a default backoff)
   * before retrying. Non-quota errors are re-thrown immediately.
   */
  private async retryOnRateLimit<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    label = 'AI call'
  ): Promise<T> {
    let lastError: unknown
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err)
        // Detect quota / rate-limit signals
        const is429 = /429|quota|rate.?limit|resource.*exhausted|please retry/i.test(msg)
        if (!is429 || attempt === maxRetries) throw err
        lastError = err

        // Parse "retry in Xs" from the error message if present
        const retryMatch = msg.match(/retry in (\d+\.?\d*)s/i)
        const waitMs = retryMatch
          ? Math.ceil(parseFloat(retryMatch[1]) * 1000)
          : Math.min(15000 * attempt, 60000) // 15 s, 30 s, 60 s

        logger.warn(`[RATE-LIMIT] ${label} hit quota (attempt ${attempt}/${maxRetries}). Waiting ${Math.round(waitMs / 1000)}s before retry.`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
      }
    }
    throw lastError
  }

  /**
   * Maps a section heading + informational_needs to a filtered list of GKG entity types.
   * Used to avoid injecting an entire GKG blob into every section — each section only
   * receives the semantic units that are actually relevant to its topic.
   */
  private resolveGkgEntityTypesForSection(heading: string, informationalNeeds: string): string[] {
    const text = (heading + ' ' + informationalNeeds).toLowerCase()

    const SECTION_GKG_MAP: Array<[RegExp, string[]]> = [
      [/stakeholder|sponsor|commit|communicat|engagement|relation/i, ['Stakeholder']],
      [/risk|threat|issue|assumpt|uncertaint|impediment|barrier/i, ['Risk', 'Constraint']],
      [/scope|deliverable|requirement|wbs|feature|accept|inclus|exclus/i, ['Requirement', 'Deliverable', 'Constraint']],
      [/schedule|milestone|timeline|deadline|date|phase|gantt|duration/i, ['Milestone', 'Deliverable']],
      [/budget|cost|financ|spend|fund|estimate|procure|capex|opex/i, ['Risk', 'Constraint']],
      [/quality|standard|metric|kpi|performance|benchmark/i, ['Requirement', 'Constraint']],
      [/charter|overview|execut|summary|background|purpose|vision|objective/i,
        ['Stakeholder', 'Risk', 'Milestone', 'Requirement']],
      [/close|lesson|review|retrospect|audit|handover/i, ['Risk', 'Milestone', 'Deliverable']],
      [/integrat|plan|manag|govern|control/i,
        ['Requirement', 'Risk', 'Stakeholder', 'Milestone', 'Constraint', 'Deliverable']],
    ]

    const matched = new Set<string>()
    for (const [pattern, types] of SECTION_GKG_MAP) {
      if (pattern.test(text)) types.forEach(t => matched.add(t))
    }

    // Fall back to all entity types if the section doesn't match anything specific
    return matched.size > 0
      ? Array.from(matched)
      : ['Requirement', 'Risk', 'Stakeholder', 'Milestone', 'Constraint', 'Deliverable']
  }

  private getRelevantEntitiesForSection(
    existingEntities: Array<{ name: string; type: string; data?: any }>,
    heading: string,
    informationalNeeds: string,
    sectionChunks: Array<{ content: string }>,
    signals: { budget: boolean; schedule: boolean; team: boolean; stakeholders: boolean; risks: boolean; scope: boolean }
  ): Array<{ name: string; type: string; data?: any }> {
    const textToMatch = `${heading} ${informationalNeeds}`.toLowerCase()
    
    const relevantTypes = new Set<string>()
    if (signals.stakeholders || signals.team) {
      relevantTypes.add('stakeholders')
      relevantTypes.add('roles_and_responsibilities')
      relevantTypes.add('team_availability')
    }
    if (signals.risks) {
      relevantTypes.add('risks')
      relevantTypes.add('risk_responses')
      relevantTypes.add('risk_assessments')
      relevantTypes.add('issue_log')
    }
    if (signals.schedule) {
      relevantTypes.add('milestones')
      relevantTypes.add('schedule_activities')
      relevantTypes.add('phases')
    }
    if (signals.scope) {
      relevantTypes.add('requirements')
      relevantTypes.add('scope_items')
      relevantTypes.add('deliverables')
      relevantTypes.add('wbs_nodes')
      relevantTypes.add('scope_baseline')
    }
    if (signals.budget) {
      relevantTypes.add('budget_baseline')
      relevantTypes.add('cost_estimates')
      relevantTypes.add('cost_actuals')
      relevantTypes.add('funding_tranches')
    }

    const matchedEntities = new Map<string, { name: string; type: string; data?: any }>()

    for (const ent of existingEntities) {
      if (!ent.name) continue
      
      const normalizedName = ent.name.toLowerCase().trim()
      if (!normalizedName) continue

      let isRelevant = false

      // 1. Direct type match via signals
      if (ent.type && relevantTypes.has(ent.type.toLowerCase())) {
        isRelevant = true
      }
      
      // 2. Mentioned in heading or informational needs
      if (!isRelevant && textToMatch.includes(normalizedName)) {
        isRelevant = true
      }

      // 3. Mentioned in any retrieved RAG chunks
      if (!isRelevant && sectionChunks && sectionChunks.length > 0) {
        for (const chunk of sectionChunks) {
          if (chunk.content && chunk.content.toLowerCase().includes(normalizedName)) {
            isRelevant = true
            break
          }
        }
      }

      if (isRelevant) {
        matchedEntities.set(`${ent.type}:${normalizedName}`, ent)
      }
    }

    return Array.from(matchedEntities.values())
  }

  /** Resolve source document IDs for RAG + entity context (project-scoped). */
  private async resolveSourceDocumentIds(
    projectId: string,
    explicitIds: string[] | undefined,
    excludeDocumentId?: string
  ): Promise<string[]> {
    const unique = [...new Set((explicitIds ?? []).filter(Boolean))]
    if (unique.length > 0) {
      const validated = await pool.query(
        `SELECT id FROM documents
         WHERE project_id = $1 AND id = ANY($2::uuid[])
           AND content IS NOT NULL AND length(trim(content)) > 0`,
        [projectId, unique]
      )
      return validated.rows.map((r: { id: string }) => r.id)
    }

    const fallback = await pool.query(
      `SELECT id FROM documents
       WHERE project_id = $1
         AND content IS NOT NULL AND length(trim(content)) > 0
         AND ($2::uuid IS NULL OR id != $2)
       ORDER BY updated_at DESC
       LIMIT 5`,
      [projectId, excludeDocumentId ?? null]
    )
    return fallback.rows.map((r: { id: string }) => r.id)
  }

  /** Entities extracted from specific source documents within a project. */
  private async getEntitiesForSourceDocuments(
    projectId: string,
    documentIds: string[]
  ): Promise<Array<{ name: string; type: string; data?: unknown; document_id?: string }>> {
    if (documentIds.length === 0) return []

    const entitiesResult = await pool.query(
      `SELECT entity_name as name, entity_type as type, entity_data as data, document_id
       FROM entity_extractions
       WHERE project_id = $1
         AND document_id = ANY($2::uuid[])
         AND status = 'active'
         AND (is_verified = true OR extraction_confidence >= 80)
       ORDER BY extraction_confidence DESC
       LIMIT 50`,
      [projectId, documentIds]
    )
    return entitiesResult.rows
  }

  /** Ensure source documents are chunked for per-section RAG (non-fatal if ingest fails). */
  private async ensureSourceDocumentsIngested(documentIds: string[]): Promise<void> {
    if (!documentIds.length || !process.env.VOYAGE_API_KEY) return

    const { ragService } = await Promise.resolve().then(() => require('./ragService'))
    for (const documentId of documentIds) {
      try {
        const result = await ragService.ingestDocument(documentId)
        logger.info(`[DOC-GEN] RAG ingest for source document ${documentId}: ${result.chunks} chunks`)
      } catch (err) {
        logger.warn(`[DOC-GEN] RAG ingest failed for source document ${documentId} (non-fatal)`, {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let nextIndex = 0

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex
        nextIndex += 1
        results[currentIndex] = await mapper(items[currentIndex], currentIndex)
      }
    })

    await Promise.all(workers)
    return results
  }

  private getTemplateParagraphs(template: TemplateContext | null) {
    const paragraphs = template?.template_paragraphs
    if (!Array.isArray(paragraphs)) {
      if (paragraphs !== undefined && paragraphs !== null) {
        logger.warn('Ignoring non-array template_paragraphs during document generation', {
          templateId: template?.id,
          templateName: template?.name,
          valueType: typeof paragraphs,
        })
      }
      return []
    }

    return paragraphs
  }

  private closeUnclosedBlocks(sectionMarkdown: string): string {
    let sanitized = sectionMarkdown.trim()

    // Track triple-backtick occurrences
    const codeBlockCount = (sanitized.match(/```/g) || []).length
    if (codeBlockCount % 2 !== 0) {
      sanitized += '\n```' // Close unclosed code injection blocks safely
      logger.warn(`[DOC-GEN] Detected and closed malformed code block in section draft.`)
    }

    // Ensure trailing whitespace doesn't obscure unparsed H8 text lines
    return sanitized + '\n'
  }

  async generateDocument(request: DocumentGenerationRequest) {
    let isDocumentCreated = false;
    const docId = request.documentId || uuidv4();
    try {
      logger.info(`Starting agentic document generation for project ${request.projectId}`)
      
      // 1. Fetch project context
      const project = await this.getProjectContext(request.projectId)
      logger.info(`Project context fetched: ${project.name}`)

      const sourceDocumentIds = await this.resolveSourceDocumentIds(
        request.projectId,
        request.sourceDocumentIds,
        request.documentId
      )
      const sourceEntities = await this.getEntitiesForSourceDocuments(
        request.projectId,
        sourceDocumentIds
      )
      
      // Merge project-wide entities with source-document entities, deduplicating by type:name
      const entityMap = new Map<string, any>()
      if (project.existing_entities) {
        project.existing_entities.forEach(e => entityMap.set(`${e.type}:${e.name.toLowerCase().trim()}`, e))
      }
      sourceEntities.forEach(e => entityMap.set(`${e.type}:${e.name.toLowerCase().trim()}`, e))
      project.existing_entities = Array.from(entityMap.values())

      logger.info(`[DOC-GEN] Context scoped to ${sourceDocumentIds.length} source document(s), ${project.existing_entities.length} total entities available`)

      await this.ensureSourceDocumentsIngested(sourceDocumentIds)

      // 2. Fetch template (if provided)
      const template = request.templateId
        ? await this.getTemplate(request.templateId)
        : null
      logger.info(`Template: ${template?.name || 'None'}`)

      // 2.3. Pre-insert a minimal/draft document row to satisfy foreign key constraints for entity extraction during parallel drafting
      const docName = request.name || (template?.name ? `Generated: ${template.name}` : 'Generated Document')
      await pool.query(
        `INSERT INTO documents (id, project_id, name, content, template_id, status, created_by, version, semantic_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          docId,
          request.projectId,
          docName,
          '',
          request.templateId || null,
          'draft',
          request.userId || null,
          1,
          '1.0.0'
        ]
      )
      isDocumentCreated = true;

      // Load existing job data to check if this is a retry or has existing progress
      let existingRequests: any[] = []
      if (request.jobId) {
        try {
          const jobResult = await pool.query(
            `SELECT data FROM jobs WHERE id = $1`,
            [request.jobId]
          )
          if (jobResult.rows.length > 0) {
            const jobData = jobResult.rows[0].data || {}
            existingRequests = jobData.llm_insights?.requests || []
            
            // If the current job has no snapshots but is a retry of a previous job,
            // load the previous job's snapshots instead
            const retryOf = jobData.retryOf
            if (existingRequests.length === 0 && retryOf) {
              const prevJobResult = await pool.query(
                `SELECT data FROM jobs WHERE id = $1`,
                [retryOf]
              )
              if (prevJobResult.rows.length > 0) {
                const prevJobData = prevJobResult.rows[0].data || {}
                const prevRequests = prevJobData.llm_insights?.requests || []
                if (prevRequests.length > 0) {
                  logger.info(`[DOC-GEN] Loading progress from previous failed/stuck job ${retryOf} for retry job ${request.jobId}`)
                  existingRequests = prevRequests
                  
                  // Pre-populate the current retry job's requests with the previous successful requests
                  await pool.query(
                    `UPDATE jobs
                     SET data = jsonb_set(
                       COALESCE(data, '{}'::jsonb),
                       '{llm_insights}',
                       jsonb_build_object('requests', $1::jsonb),
                       true
                     )
                     WHERE id = $2`,
                    [JSON.stringify(prevRequests), request.jobId]
                  )
                }
              }
            }
          }
        } catch (err) {
          logger.warn(`Failed to check existing job progress for jobId ${request.jobId}`, err)
        }
      }

      // 2.2. The Strict Hard Enforcement Barrier Check
      const documentType = template?.name || 'Unknown Document Type';
      const policyQuery = `
        SELECT rule_code, title, control_effectiveness_status, target_document_types 
        FROM policy_library 
        WHERE status = 'ACTIVE';
      `;
      const policyResult = await pool.query(policyQuery);
      const activePolicies = policyResult.rows;

      const degradedControls = activePolicies.filter(
        p => p.control_effectiveness_status === 'INEFFECTIVE' && 
             (!p.target_document_types || p.target_document_types.length === 0 || p.target_document_types.includes(documentType))
      );

      if (degradedControls.length > 0) {
        const failingCodes = degradedControls.map(c => c.rule_code).join(', ');
        
        logger.error(`🚨 HARD LOCKOUT TRIPPED: Generation aborted for documentType '${documentType}'. Controls [${failingCodes}] are currently marked as INEFFECTIVE due to high bypass/remediation failure thresholds.`);
        
        // Fast-abort with structured error metadata for the frontend to digest
        throw new Error(JSON.stringify({
          error: "GOVERNANCE_LOCKOUT",
          message: `Generation blocked by ADPA Runtime Compiler. Targeted control frameworks (${failingCodes}) have degraded operational health. Human-in-the-loop audit review required to recalibrate prompt limits.`,
          affectedControls: degradedControls.map(c => ({ code: c.rule_code, title: c.title }))
        }));
      }

      // 2.5. Fetch GKG context when template has gkg_context_strategy
      let gkg_context_snapshot: { markdown: string; unitsCount: number; documentsCount: number; entityTypes: string[] } | undefined
      if (request.templateId && request.projectId) {
        try {
          const strategy = await documentTemplateService.getTemplateGkgStrategy(request.templateId)
          if (strategy) {
            const gkgResult = await getContextForStrategy(request.projectId, strategy, {
              userId: request.userId,
            })
            if (gkgResult.unitsCount > 0 || (gkgResult.markdown && String(gkgResult.markdown).trim().length > 0)) {
              gkg_context_snapshot = {
                markdown: gkgResult.markdown,
                unitsCount: gkgResult.unitsCount,
                documentsCount: gkgResult.documentsCount,
                entityTypes: gkgResult.entityTypes ?? [],
              }
              logger.info(`GKG context injected for generation`, {
                templateId: request.templateId,
                unitsCount: gkgResult.unitsCount,
              })
            }
          }
        } catch (gkgErr) {
          logger.warn('GKG context fetch failed (non-fatal)', {
            templateId: request.templateId,
            error: gkgErr instanceof Error ? gkgErr.message : String(gkgErr),
          })
        }
      }

      // 3. AGENTIC PHASE 1: Plan Document Structure (Research Plan)
      logger.info(`[AGENT] Phase 1: Planning Document Structure...`)
      let generationPlan: any = null
      
      const existingPlanReq = existingRequests.find(
        (r: any) => r.phase === 'planning' && r.response && !r.response.startsWith('Error')
      )
      
      if (existingPlanReq) {
        try {
          const parsed = JSON.parse(existingPlanReq.response)
          if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            logger.info(`[DOC-GEN] Resuming from existing planning snapshot for job ${request.jobId}`)
            generationPlan = parsed
          }
        } catch (e) {
          logger.warn(`[DOC-GEN] Failed to parse existing planning snapshot, re-planning`, e)
        }
      }
      
      if (!generationPlan) {
        if (request.jobId) {
          await updateJobLlmProgress(request.jobId, {
            userId: request.userId,
            currentStep: `Planning document structure (${request.provider}${request.model ? ` / ${request.model}` : ''})…`,
            progress: 15,
            llmProgressSteps: [{
              id: 'planning',
              phase: 'planning',
              label: 'Plan document structure',
              status: 'running',
              provider: request.provider,
              model: request.model,
              startedAt: new Date().toISOString(),
            }],
          })
        }
        generationPlan = await this.planDocumentStructure({
          jobId: request.jobId,
          userPrompt: request.userPrompt,
          project,
          template,
          provider: request.provider,
          model: request.model,
          projectId: request.projectId,
          userId: request.userId,
          templateId: request.templateId,
        })
      }

      if (!generationPlan || !generationPlan.sections || generationPlan.sections.length === 0) {
        throw new Error("AI failed to return a valid document structure plan.")
      }

      logger.info(`[AGENT] Plan returned ${generationPlan.sections.length} required sections to draft.`)

      if (request.jobId) {
        const draftSteps: LlmProgressStep[] = generationPlan.sections.map((section, index) => {
          const isDrafted = existingRequests.some(
            (r: any) => r.phase === 'drafting' && r.order === index && r.response && !r.response.startsWith('Error')
          )
          return {
            id: `draft-${index}`,
            phase: 'drafting',
            label: `Draft section ${index + 1}`,
            heading: section.heading,
            status: isDrafted ? 'completed' : 'pending',
            provider: request.provider,
            model: request.model,
            ...(isDrafted ? { completedAt: new Date().toISOString() } : {})
          }
        })
        
        const isResuming = existingRequests.some((r: any) => r.phase === 'drafting' && r.response && !r.response.startsWith('Error'))
        
        await updateJobLlmProgress(request.jobId, {
          userId: request.userId,
          currentStep: isResuming 
            ? `Resuming document generation — drafting remaining sections…` 
            : `Planned ${generationPlan.sections.length} sections — drafting…`,
          progress: 55,
          llmProgressSteps: [
            {
              id: 'planning',
              phase: 'planning',
              label: 'Plan document structure',
              status: 'completed',
              provider: request.provider,
              model: request.model,
              completedAt: new Date().toISOString(),
            },
            ...draftSteps,
          ],
        })
      }

      // 4. Extract global reference materials once
      const customContextItems = await this.fetchContextItems(request.projectId)

      // 5. AGENTIC PHASE 2: Parallel Drafting of Sections
      const draftConcurrency = this.getDraftConcurrency(request.provider)
      logger.info(`[AGENT] Phase 2: Drafting ${generationPlan.sections.length} sections with concurrency ${draftConcurrency}...`)
      if (request.jobId) await updateJobStatus(request.jobId, "processing", 60)

      // Build a shared map of all planned sections so each drafter can avoid duplicating
      // content that belongs to a sibling section (Improvement D — anti-duplication).
      const allPlannedSections = generationPlan.sections.map(s => ({ heading: s.heading, goal: s.goal }))

      const draftedSections = await this.mapWithConcurrency(generationPlan.sections, draftConcurrency, async (sectionTask: any, index) => {
        // Check if this section is already successfully drafted
        const existingDraft = existingRequests.find(
          (r: any) => r.phase === 'drafting' && r.order === index && r.response && !r.response.startsWith('Error')
        )
        
        if (existingDraft) {
          logger.info(`[DOC-GEN] Reusing drafted section ${index + 1} (${sectionTask.heading}) from snapshot`)
          return {
            order: index,
            markdown: existingDraft.response,
            tokensUsed: existingDraft.tokensUsed || Math.ceil(existingDraft.response.length / 4)
          }
        }

        const sectionResult = await this.draftSection({
          task: sectionTask,
          order: index,
          project,
          gkgContext: gkg_context_snapshot,
          contextItems: customContextItems,
          jobId: request.jobId,
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          projectId: request.projectId,
          userId: request.userId,
          templateId: request.templateId,
          templateName: template?.name,
          templateCategory: template?.category,
          templateSystemPrompt: template?.system_prompt,
          allPlannedSections,
          sourceDocumentIds,
        })
        
        // Incremental progress during drafting
        if (request.jobId) {
          const draftProgress = 60 + Math.floor(((index + 1) / generationPlan.sections.length) * 15)
          await updateJobStatus(request.jobId, "processing", Math.min(draftProgress, 75))
        }
        
        return sectionResult
      })

      // Sort sections back into their planned order
      draftedSections.sort((a, b) => a.order - b.order)

      // ─── Phase 2.5: Draft Integrity Check ───────────────────────────────
      // Mission Draco Mandate: Ensure every planned section successfully drafted.
      // Hard-abort only if ALL sections failed. Partial failures (e.g. rate-limit
      // survivors that exhausted retries) produce a degraded document with a
      // diagnostic banner so the user can review and re-trigger failed sections.
      const failedSections = draftedSections.filter(s => 
        !s.markdown || 
        s.markdown.startsWith('Error generating section:') || 
        s.markdown.trim().length < 50
      )

      if (failedSections.length === draftedSections.length) {
        // Total failure — nothing to assemble
        const errorDetail = failedSections.map(s => draftedSections.indexOf(s) + 1).join(', ')
        throw new Error(`DRAFT_INTEGRITY_FAILURE: ALL sections [${errorDetail}] failed to generate. Assembly aborted.`)
      }

      if (failedSections.length > 0) {
        // Partial failure — log warning, inject diagnostic placeholder for failed sections
        const errorDetail = failedSections.map(s => draftedSections.indexOf(s) + 1).join(', ')
        logger.warn(`[AGENT] Phase 2.5: Partial draft failure — Section(s) [${errorDetail}] failed (likely rate-limit). Proceeding with ${draftedSections.length - failedSections.length}/${draftedSections.length} successful sections.`)
        for (const failed of failedSections) {
          const idx = draftedSections.indexOf(failed)
          const heading = generationPlan.sections[idx]?.heading || `## Section ${idx + 1}`
          draftedSections[idx] = {
            order: failed.order,
            tokensUsed: 0,
            markdown: `${heading}\n\n> ⚠️ **This section could not be generated** (provider rate limit or timeout). Re-trigger generation to complete this section.\n`,
          }
        }
      }

      // 6. AGENTIC PHASE 3: Synthesis & Assembly
      logger.info(`[AGENT] Phase 3: Assembling Document...`)
      if (request.jobId) await updateJobStatus(request.jobId, "processing", 76)

      let markdown = ""
      let totalTokensUsed = 0;
      for (const section of draftedSections) {
        totalTokensUsed += section.tokensUsed
        markdown += this.closeUnclosedBlocks(section.markdown || "")
      }

      // Initial cleanup of the assembled markdown
      markdown = this.validateAndCleanMarkdown(markdown)

      // 6.5. AGENTIC PHASE 4 & 5: Autonomous Auditing and Patching Loop
      logger.info(`[AGENT] Phase 4: Commencing Policy Audit Loop...`)
      if (request.jobId) {
        await updateJobStatus(request.jobId, "processing", 80)
        await updateJobLlmProgress(request.jobId, {
          userId: request.userId,
          currentStep: 'Commencing Policy Audit Loop…',
          patchStep: {
            id: 'audit-loop-start',
            patch: {
              phase: 'auditing',
              label: 'Policy Audit',
              status: 'running',
              provider: request.provider,
              model: request.model,
              startedAt: new Date().toISOString()
            }
          }
        })
      }
      
      let currentScore = 100
      let attempts = 0
      const MAX_RETRIES = 3
      const auditLog: any[] = []

      while (attempts < MAX_RETRIES) {
        const auditId = `audit-attempt-${attempts + 1}`
        if (request.jobId && attempts > 0) {
          await updateJobLlmProgress(request.jobId, {
            userId: request.userId,
            currentStep: `Re-auditing document (Attempt ${attempts + 1})…`,
            progress: 80 + (attempts * 2),
            patchStep: {
              id: auditId,
              patch: {
                phase: 'auditing',
                label: `Re-audit (Attempt ${attempts + 1})`,
                status: 'running',
                provider: request.provider,
                model: request.model,
                startedAt: new Date().toISOString()
              }
            }
          })
        }

        const auditResult = await this.auditDocumentAgainstPolicies(markdown, template?.name, request.provider, request.model, request.jobId)
        currentScore = auditResult.score
        
        if (request.jobId && attempts > 0) {
          await updateJobLlmProgress(request.jobId, {
            patchStep: {
              id: auditId,
              patch: {
                status: 'completed',
                completedAt: new Date().toISOString()
              }
            }
          })
        }

        if (currentScore >= 90) {
          logger.info(`[AGENT] Document passed compliance audit with score ${currentScore}%`)
          if (request.jobId && attempts === 0) {
            await updateJobLlmProgress(request.jobId, {
              patchStep: {
                id: 'audit-loop-start',
                patch: { status: 'completed', completedAt: new Date().toISOString() }
              }
            })
          }
          break
        }
        
        logger.warn(`[AGENT] Document failed audit (Score: ${currentScore}%). Initiating Phase 5: Patch Agent (Attempt ${attempts + 1}/${MAX_RETRIES})`)
        const patchId = `patch-agent-${attempts + 1}`
        if (request.jobId) {
          await updateJobStatus(request.jobId, "processing", 80 + (attempts * 2))
          await updateJobLlmProgress(request.jobId, {
            userId: request.userId,
            currentStep: `Patching document to fix ${auditResult.failedRules.length} rule(s) (Attempt ${attempts + 1})…`,
            progress: 81 + (attempts * 2),
            patchStep: {
              id: patchId,
              patch: {
                phase: 'patching',
                label: `Patch Agent — Fixing ${auditResult.failedRules.length} rule(s)`,
                status: 'running',
                provider: request.provider,
                model: request.model,
                startedAt: new Date().toISOString()
              }
            }
          })
          if (attempts === 0) {
            // Mark the initial audit as completed since we're moving to patch
            await updateJobLlmProgress(request.jobId, {
              patchStep: {
                id: 'audit-loop-start',
                patch: { status: 'completed', completedAt: new Date().toISOString() }
              }
            })
          }
        }

        // Phase 5: The Patch Agent
        markdown = await this.patchDocument(markdown, auditResult.failedRules, request.provider, request.model, request.jobId)
        
        if (request.jobId) {
          await updateJobLlmProgress(request.jobId, {
            patchStep: {
              id: patchId,
              patch: { status: 'completed', completedAt: new Date().toISOString() }
            }
          })
        }

        attempts++
        auditLog.push({ attempt: attempts, score: currentScore, failedRules: auditResult.failedRules })
      }

      if (currentScore < 90) {
        logger.warn(`[AGENT] Document failed compliance audit after ${MAX_RETRIES} attempts. Human approval required.`)
      }

      // 6.7. FINAL PHASE: Entity Extraction & Synchronization (Post-Patching)
      // We run this AFTER the audit loop to ensure the final document contains the tags 
      // and the database reflects the final state of the document.
      logger.info(`[AGENT] Final Phase: Parsing H8 entities and queueing save-inline-entities job...`)
      if (request.jobId) await updateJobStatus(request.jobId, "processing", 85)

      const { InlineEntityParserService } = await Promise.resolve().then(() => require('./inlineEntityParserService'))
      const parseResult = await InlineEntityParserService.parseAndProcess({
        projectId: request.projectId,
        userId: request.userId,
        documentId: docId,
        markdown: markdown,
        providedEntities: project.existing_entities || [],
        templateName: template?.name || documentType,
        templateCategory: template?.category || project.framework,
        wordCount: markdown.split(/\s+/).filter(Boolean).length,
        persist: false,
      })

      // Entity persistence is enqueued after the document row is saved (AIGenerationJobService.createDocument)
      // so extract-project-data reads final content from the DB. Parsing here is for CUR / quality metrics only.
      if (parseResult.extractedCount === 0) {
        logger.info(`[AGENT] No parseable H8 entities in draft — post-save enqueue will route to inline save or LLM extract`, {
          documentId: docId,
          hasRawH8Tags: markdown.split(/\r?\n/).some((l) => /^#{8}\s+/.test(l)),
        })
      }

      // The final markdown must retain the H8 tags for Mission Draco traceability
      const finalMarkdown = parseResult.cleanedMarkdown
      const combinedEntitiesByType = parseResult.entitiesByType || {}

      // 6.7.5. POST-PROCESSING: Multi-Scale Context Compaction (Asynchronous)
      // Recursive compression into 80/60/40/20 density tiers while preserving H8 entities.
      setImmediate(() => {
        CompactorService.generateMultiScaleSummaries(finalMarkdown, request.projectId, docId)
          .catch(err => logger.error(`[AGENT] Post-processing compactor failed for ${docId}:`, err))
      })

      // 6.8. AGENTIC PHASE 6: Unified Final Compilation & Multi-Scale Compression
      // Generate clean, narrative-focused summaries at 20/40/60/80% levels
      // and the final polished 100% document in a single call.
      logger.info(`[AGENT] Phase 6: Final Compilation & Context Compaction...`)
      if (request.jobId) await updateJobStatus(request.jobId, "processing", 88)
      
      let finalSnapshots: Record<string, any> = {}
      try {
        const finalizationSchema = z.object({
          summary80: z.string().describe("A compressed version containing exactly ~80% of the density, preserving all core metrics."),
          summary60: z.string().describe("A tighter compression containing exactly ~60% of the density, preserving critical entities."),
          summary40: z.string().describe("A dense context snapshot containing exactly ~40% of the density, focusing on structural boundaries."),
          summary20: z.string().describe("A high-density core capsule containing exactly ~20% of the text length, optimized for token-starved injections.")
        })

        // Improved scrubbing: Remove H8 tags including multi-line JSON blobs to prevent summarizer confusion.
        const scrubbedMarkdown = markdown
          .replace(/^#{8}\s+[a-zA-Z0-9_-]+:[\s\S]*?(?=\n#{8}|\n#|\n$)/gm, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim()

        // Sample the scrubbed document if it's too large for efficient summarization
        const MAX_SUMMARY_INPUT_CHARS = 100000
        const summarySample = scrubbedMarkdown.length > MAX_SUMMARY_INPUT_CHARS
          ? scrubbedMarkdown.substring(0, MAX_SUMMARY_INPUT_CHARS / 2) + 
            "\n\n[... content omitted for summarization efficiency ...]\n\n" + 
            scrubbedMarkdown.substring(scrubbedMarkdown.length - (MAX_SUMMARY_INPUT_CHARS / 2))
          : scrubbedMarkdown

        const prompt = `You are the Final Compilation & Governance Agent for Mission Draco.
Your task is to take the provided draft and generate four recursive context compression tiers.

### CORE MANDATES:
1. **Recursive Summaries (80/60/40/20)**: 
   - ELIMINATE narrative fluff and structural filler.
   - PRESERVE H8 Entity Framework terminology (but omit the ######## tags in these summaries).
   - FOCUS on strategic logic, technical milestones, and engineering definitions.
   - INCREASE information density: every word must carry semantic weight.

### INPUT DRAFT${scrubbedMarkdown.length > MAX_SUMMARY_INPUT_CHARS ? ` (sampled - full doc is ${scrubbedMarkdown.length} chars)` : ""}:
---
${summarySample}
---`

        const compilationResult = await unifiedAIService.generateStructuredObject({
          prompt,
          provider: request.provider,
          model: request.model,
          temperature: 0.2,
          schema: finalizationSchema,
          max_tokens: 16000, // Large budget for summaries
          traceName: 'agentic-doc-finalization-compaction'
        })

        const payload = compilationResult.object

        // Record the compaction result in the job monitor
        await this.recordLLMPromptSnapshot(request.jobId, {
          phase: 'compacting',
          label: 'Final Compilation & Multi-Scale Compression',
          traceName: 'agentic-doc-finalization-compaction',
          provider: request.provider,
          model: request.model,
          temperature: 0.2,
          prompt,
          response: JSON.stringify(payload, null, 2)
        })

        finalSnapshots = {
          p20: { summary: payload.summary20, timestamp: new Date().toISOString() },
          p40: { summary: payload.summary40, timestamp: new Date().toISOString() },
          p60: { summary: payload.summary60, timestamp: new Date().toISOString() },
          p80: { summary: payload.summary80, timestamp: new Date().toISOString() }
        }
      } catch (sumErr) {
        logger.error(`[AGENT] Unified compilation failed, falling back to original markdown:`, sumErr)
      }

      // Global Deduplication and Context Adherence Scoring
      const finalUniqueCounts: Record<string, number> = {}
      const reusedEntityIdentities: Array<{ name: string; type: string; matchConfidence: number }> = []
      const providedEntities = project.existing_entities || []
      
      for (const [type, entities] of Object.entries(combinedEntitiesByType)) {
        const seenNames = new Set<string>()
        let uniqueCount = 0
        
        for (const entity of entities) {
          if (!entity) continue;
          const name = String(entity.name || entity.title || entity.item_name || entity.description || "").toLowerCase().trim()
          if (!name) continue;

          if (!seenNames.has(name)) {
            seenNames.add(name)
            uniqueCount++

            // Check if this matches a provided entity (Context Adherence)
            const normalizedExtracted = name.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
            
            const match = providedEntities.find(p => {
              if (!p) return false;
              const pName = String(p.name || "").trim();
              if (!pName) return false;
              
              const normalizedProvided = pName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
              return String(p.type || "").toLowerCase() === type.toLowerCase() && 
                     (normalizedProvided === normalizedExtracted || 
                      normalizedProvided.includes(normalizedExtracted) || 
                      normalizedExtracted.includes(normalizedProvided))
            })

            if (match && match.name) {
              const exactMatch = String(match.name).toLowerCase().trim() === name
              reusedEntityIdentities.push({
                name: String(match.name),
                type: String(match.type || type),
                matchConfidence: exactMatch ? 100 : 85 
              })
            }
          }
        }
        finalUniqueCounts[type] = uniqueCount
      }

      // ─── Phase 3: Weighted Scoring Engine (CUR) ───────────────────────────
      // Calculate Context Utilization Rate (CUR) using strict weighting matrix
      // and Hallucination Penalty (Decision: Keep entities but degrade score)
      
      const weights: Record<string, number> = {
        'STAKEHOLDER': 0.30,
        'TECHNOLOGY': 0.25,
        'DELIVERABLE': 0.25,
        'CONSTRAINT': 0.25,
        'REQUIREMENT': 0.25,
        'ACTIVITY': 0.20,
        'WORK_ITEM': 0.20,
      }

      // Helper to map extraction types to scoring categories
      const getScoringCategory = (type: string): string => {
        const t = type.toUpperCase()
        if (t.includes('STAKEHOLDER')) return 'STAKEHOLDER'
        if (t.includes('TECH')) return 'TECHNOLOGY'
        if (t.includes('DELIVERABLE') || t.includes('MILESTONE')) return 'DELIVERABLE'
        if (t.includes('CONSTRAINT')) return 'CONSTRAINT'
        if (t.includes('REQUIREMENT')) return 'REQUIREMENT'
        if (t.includes('ACTIVITY')) return 'ACTIVITY'
        if (t.includes('WORK_ITEM')) return 'WORK_ITEM'
        return 'OTHER'
      }

      // Group provided context by category
      const contextByCategory: Record<string, Set<string>> = {}
      providedEntities.forEach(p => {
        const cat = getScoringCategory(p.type || "")
        if (!contextByCategory[cat]) contextByCategory[cat] = new Set()
        const name = (p.name || "").toLowerCase().trim()
        if (name) contextByCategory[cat].add(name)
      })

      // Group reused and hallucinated entities by category
      const reuseByCategory: Record<string, number> = {}
      const hallucinationPenaltyByCategory: Record<string, number> = {}
      
      for (const [type, entities] of Object.entries(combinedEntitiesByType)) {
        const cat = getScoringCategory(type)
        if (!reuseByCategory[cat]) reuseByCategory[cat] = 0
        if (!hallucinationPenaltyByCategory[cat]) hallucinationPenaltyByCategory[cat] = 0

        const seenInThisRun = new Set<string>()
        for (const entity of entities) {
          if (!entity) continue;
          const name = String(entity.name || entity.title || entity.item_name || "").toLowerCase().trim()
          if (!name || seenInThisRun.has(name)) continue
          seenInThisRun.add(name)

          const isReused = contextByCategory[cat]?.has(name)
          if (isReused) {
            reuseByCategory[cat]++
          } else if (cat !== 'OTHER') {
            // Hallucination Penalty: Deduct 5% from this category's score layer
            hallucinationPenaltyByCategory[cat] += 0.05
            logger.warn(`[MISSION-DRACO] Hallucination detected in ${cat}: "${name}". Applying penalty.`)
          }
        }
      }

      let weightedCUR = 0
      let totalWeight = 0

      for (const [cat, weight] of Object.entries(weights)) {
        const totalInContext = contextByCategory[cat]?.size || 0
        if (totalInContext === 0) continue // Skip weight if no context provided for this category

        const utilization = Math.min(reuseByCategory[cat] / totalInContext, 1.0)
        const penalty = hallucinationPenaltyByCategory[cat] || 0
        const categoryScore = Math.max(utilization - penalty, 0)

        weightedCUR += categoryScore * weight
        totalWeight += weight
      }

      // Normalize if some categories were missing context
      const finalCUR = totalWeight > 0 
        ? Math.round((weightedCUR / totalWeight) * 100)
        : 100

      const contextConsistencyStats = parseResult.contextConsistencyStats
      const entityExtractionQuality = parseResult.entityExtractionQuality
      const contextMatchingScore = finalCUR
      const occurrenceConsistencyScore = contextConsistencyStats.occurrenceConsistencyScore

      // 7. Return structured result
      logger.info(
        `[MISSION-DRACO] Generation Complete. Document: ${docId}, CUR: ${finalCUR}%, ` +
        `Consistency Wins: ${contextConsistencyStats.consistencyWins}/${contextConsistencyStats.totalOccurrences} tags, ` +
        `Extraction Fit: ${entityExtractionQuality.overallFitScore}% (type ${entityExtractionQuality.typeFitScore}%, grounded ${entityExtractionQuality.contextGroundedScore}%), ` +
        `Chars: ${finalMarkdown.length}`
      )
      
      return {
        content: finalMarkdown,
        documentId: docId,
        entityCounts: finalUniqueCounts,
        summaries: finalSnapshots,
        metadata: {
          provider: request.provider,
          model: request.model || 'default',
          tokens_used: totalTokensUsed, 
          contextMatchingScore,
          occurrenceConsistencyScore,
          contextConsistencyStats,
          entityExtractionQuality,
          appliedContextEntities: reusedEntityIdentities,
          context: {
            projectName: project.name,
            framework: project.framework,
            templateUsed: template?.name,
            stakeholdersIncluded: (project.stakeholders?.length || 0) > 0,
            documentsReferenced: (project.documents?.length || 0),
            agenticSectionsPlanned: generationPlan.sections.length
          }
        },
        ...(gkg_context_snapshot && { gkg_context_snapshot }),
        audit_log: auditLog,
        compliance_status: currentScore >= 90 ? 'COMPLIANT' : 'PENDING_HUMAN_APPROVAL',
        compliance_score: currentScore
      }



    } catch (error) {
      logger.error('Agentic document generation failed:', error)
      
      if (isDocumentCreated) {
        try {
          let errorMessage = error instanceof Error ? error.message : String(error);
          
          // Try parsing JSON error (e.g. GOVERNANCE_LOCKOUT error)
          try {
            const parsed = JSON.parse(errorMessage);
            if (parsed.message) {
              errorMessage = parsed.message;
            }
          } catch (_) {}

          const errorMarkdown = `# ❌ Document Generation Failed

The ADPA AI Document Generation engine encountered an error while attempting to generate this document.

## 🔍 Diagnostics & Rationale

* **Error Message**: ${errorMessage}
* **Timestamp**: ${new Date().toLocaleString()}
* **Document ID**: ${docId}

## 🛠️ Recommended Resolution Steps

Based on the type of error encountered, please follow these steps to resolve the issue:

1. **Governance Lockout**:
   If the error indicates a \`GOVERNANCE_LOCKOUT\`, one or more control frameworks targeted by this template are currently marked as \`INEFFECTIVE\` (e.g., due to telemetry degradation).
   * **Action**: Go to the [Governance Dashboard](/governance) to review the pending AI prompts/patches. A council member must review and adjudicate (approve or override) the active tribunal candidates to restore control effectiveness to \`EFFECTIVE\`.

2. **API Provider Rate Limits / Timeout**:
   If the error is related to the AI provider (e.g., Groq, OpenAI, Mistral, Gemini), the request may have timed out or hit rate/token limits.
   * **Action**: Wait a few moments and try generating the document again. If it persists, verify your API keys and model availability in the settings under [AI Models](/settings/ai-models).

3. **System / Dependency Failures**:
   If this is a system database or queue error:
   * **Action**: Check if Postgres, Redis, or RabbitMQ are running and reachable by checking the server logs.

---
*Note: This failure document has been retained in the library for diagnostic tracing. Once you have resolved the underlying issue, you can safely delete this document and re-trigger a clean generation.*
`;

          await pool.query(
            `UPDATE documents 
             SET content = $1, 
                 status = 'failed', 
                 word_count = $2, 
                 character_count = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [
              errorMarkdown,
              errorMarkdown.split(/\s+/).filter(w => w.length > 0).length,
              errorMarkdown.length,
              docId
            ]
          );
          
          logger.info(`[DOC-GEN] Updated document ${docId} with failure diagnostics.`);
        } catch (dbErr) {
          logger.error(`[DOC-GEN] Failed to write error diagnostics to document ${docId}:`, dbErr);
        }
      }
      
      throw error
    }
  }

  /**
   * AGENTIC PHASE 1: Plan Document Structure
   * Asks the AI to analyze the prompt/template and output an array of precise "Research Tasks".
   */
  private async planDocumentStructure(params: {
    jobId?: string;
    userPrompt: string;
    project: ProjectContext;
    template: TemplateContext | null;
    provider: string;
    model?: string;
    projectId: string;
    userId: string;
    templateId?: string;
  }): Promise<{ sections: Array<{ heading: string; goal: string; informational_needs: string; section_guidance?: string }> }> {
    // We define the Zod schema representing the JSON we want the AI to return.
    const planSchema = z.object({
      sections: z.array(z.object({
        heading: z.string().describe("The Markdown heading for the section (e.g. '## Executive Summary')"),
        goal: z.string().describe("What this specific section needs to accomplish based on the user prompt."),
        informational_needs: z.string().describe("What context (stakeholders, budget, GKG data, etc) is needed to write this section accurately. BE SPECIFIC."),
        section_guidance: z.string().optional().describe("Verbatim copy of the template's prompt_guidance for this section, if one exists. Leave empty if there is no specific writing guidance for this section."),
      }))
    })

    const planProj = params.project as any
    let plannerPrompt = `You are a Senior Project Manager planning a document using the ${params.project.framework} framework.\n\n`
    plannerPrompt += `Your job is to read the User's Request and the required Template Structure, and break the document down into an array of sections that need to be drafted.\n\n`

    // ─── Rich Project Context for the Planner ────────────────────────────────
    // The planner must know all available project data so it can produce specific,
    // accurate informational_needs for each section rather than generic placeholders.
    plannerPrompt += `### Project Context:\n`
    plannerPrompt += `- **Name:** ${params.project.name}\n`
    if (params.project.description) {
      plannerPrompt += `- **Description:** ${params.project.description}\n`
    }
    plannerPrompt += `- **Framework:** ${params.project.framework}\n`
    plannerPrompt += `- **Status:** ${params.project.status || 'Active'}\n`
    if (planProj.budget) plannerPrompt += `- **Budget:** ${planProj.budget}\n`
    if (planProj.start_date) plannerPrompt += `- **Start Date:** ${planProj.start_date}\n`
    if (planProj.end_date)   plannerPrompt += `- **End Date:** ${planProj.end_date}\n`
    if (planProj.team_members) {
      const teamSummary = Array.isArray(planProj.team_members)
        ? planProj.team_members.map((m: any) => typeof m === 'string' ? m : (m.name || m.role || '')).filter(Boolean).join(', ')
        : String(planProj.team_members)
      if (teamSummary) plannerPrompt += `- **Team:** ${teamSummary}\n`
    }
    if (params.project.stakeholders?.length) {
      const stakeholderList = params.project.stakeholders
        .slice(0, 8)
        .map(s => `${s.name} (${s.role})`)
        .join(', ')
      plannerPrompt += `- **Key Stakeholders:** ${stakeholderList}\n`
    }
    // Surface already-documented entity counts so the planner targets gaps rather than duplicates
    if (planProj.entityCountsByType && Object.keys(planProj.entityCountsByType).length > 0) {
      const countStr = Object.entries(planProj.entityCountsByType as Record<string, number>)
        .map(([t, c]) => `${c} ${t}`).join(', ')
      plannerPrompt += `- **Already Documented Entities:** ${countStr}\n`
    } else if (params.project.existing_entities?.length) {
      const byType: Record<string, number> = {}
      params.project.existing_entities.forEach(e => { byType[e.type] = (byType[e.type] || 0) + 1 })
      const countStr = Object.entries(byType).map(([t, c]) => `${c} ${t}`).join(', ')
      if (countStr) plannerPrompt += `- **Already Documented Entities:** ${countStr}\n`
    }
    plannerPrompt += `\n`

    if (params.template?.system_prompt) {
      plannerPrompt += `### Template Guidance:\n${params.template.system_prompt}\n\n`
    }

    const templateParagraphs = this.getTemplateParagraphs(params.template)

    if (templateParagraphs.length > 0) {
      plannerPrompt += `### Required Template Structure:\n`
      plannerPrompt += `For each section below, copy the "Writing Guidance" verbatim into the section_guidance field of your output.\n\n`
      const sortedParagraphs = [...templateParagraphs].sort((a, b) => a.order - b.order)
      sortedParagraphs.forEach((para) => {
        plannerPrompt += `${para.order}. **${para.section_name}** (${para.section_type}, required: ${para.required})\n`
        if (para.description)     plannerPrompt += `   Description: ${para.description}\n`
        if (para.prompt_guidance) plannerPrompt += `   Writing Guidance: ${para.prompt_guidance}\n`
      })
      plannerPrompt += `\n`
    } else {
      const docType = params.template?.name || "unstructured document"
      plannerPrompt += `### Document Type: ${docType}\n`
      plannerPrompt += `No pre-defined template structure is specified. Design a comprehensive, logical structure with as many sections as the document type and user request require. `
      plannerPrompt += `For a Project Charter, Business Case, or similar governance document, aim for 10–18 sections covering all standard components. `
      plannerPrompt += `Choose logical headings appropriate for a ${params.project.framework} document, covering background, objectives, scope, stakeholders, risks, budget, timeline, governance, and any other relevant areas.`
      plannerPrompt += `\n\n`
    }


    plannerPrompt += `### User Request:\n${params.userPrompt}\n\n`
    plannerPrompt += `Output a JSON array of sections. Map the required template structure or design a new one based on the user's specific request.`

    let resultObject: any = null;
    let responseText: string = "";

    try {
      const result = await unifiedAIService.generateStructuredObject({
        prompt: plannerPrompt,
        provider: params.provider,
        model: params.model,
        temperature: 0.1, // Low temperature for deterministic planning
        schema: planSchema,
        traceName: 'agentic-doc-gen-plan',
        projectId: params.projectId,
        userId: params.userId,
        template_id: params.templateId,
      })
      resultObject = result.object
      responseText = JSON.stringify(result.object, null, 2);
    } catch (e: any) {
      logger.warn(`Failed structured generation, falling back to manual template mapping`, e)
      responseText = e instanceof Error ? e.message : String(e);
      // Fallback: If AI fails the structured output, manually construct the plan based on template paragraphs
      if (templateParagraphs.length > 0) {
        resultObject = {
          sections: [...templateParagraphs]
            .sort((a, b) => a.order - b.order)
            .map(p => ({
              heading: `## ${p.section_name}`,
              goal: p.description || `Write the ${p.section_name} section`,
              informational_needs: p.prompt_guidance || "General project context.",
              section_guidance: p.prompt_guidance || undefined,
            }))
        }
      } else {
        resultObject = {
          sections: [
            { heading: "## 1. Executive Summary", goal: "Summarize the document purpose and key takeaways.", informational_needs: "General project context." },
            { heading: "## 2. Objectives & Scope", goal: "Define the objectives, scope items, and deliverables.", informational_needs: "Project deliverables and scope items." },
            { heading: "## 3. Core Content & Details", goal: "Fulfill the detailed requirements of the user request.", informational_needs: "Specific requirements and stakeholders." },
            { heading: "## 4. Next Steps & Constraints", goal: "Detail implementation activities and project constraints.", informational_needs: "Project constraints and scheduled activities." }
          ]
        }
      }
    }

    await this.recordLLMPromptSnapshot(params.jobId, {
      phase: 'planning',
      label: 'Plan Document Structure',
      traceName: 'agentic-doc-gen-plan',
      provider: params.provider,
      model: params.model,
      temperature: 0.1,
      prompt: plannerPrompt,
      response: responseText
    })

    return resultObject;
  }

  /**
   * AGENTIC PHASE 2: Draft Single Section
   * Targeted AI call to write just the markdown for a single specific section.
   */
  private async draftSection(params: {
    task: { heading: string; goal: string; informational_needs: string; section_guidance?: string };
    order: number;
    project: ProjectContext;
    gkgContext?: { markdown: string };
    contextItems: Array<any>;
    jobId?: string;
    provider: string;
    model?: string;
    temperature?: number;
    projectId: string;
    userId: string;
    templateId?: string;
    templateName?: string;
    templateCategory?: string;
    templateSystemPrompt?: string;
    /** Full list of all planned sections — used to prevent cross-section content duplication */
    allPlannedSections?: Array<{ heading: string; goal: string }>;
    /** Source documents whose chunks and extracted entities supply section context */
    sourceDocumentIds?: string[];
  }) {
    const draftProj = params.project as any

    // ─── Section-Specific RAG Retrieval (with Fallback) ──────────────────────
    let sectionChunks: any[] = []
    let ragStrategy = 'scoped'
    const ragQuery = `${params.task.heading} ${params.task.informational_needs}`
    
    try {
      // 1. Primary: Scoped to source documents
      sectionChunks = await contextRetrieval.searchChunks({
        projectId: params.projectId,
        documentIds: params.sourceDocumentIds,
        query: ragQuery,
        topK: 5,
        templateId: (params.sourceDocumentIds?.length ?? 0) === 0 ? (params.templateId || undefined) : undefined,
      })

      // 2. Fallback: Project-wide (if scoped returns nothing and source docs were provided)
      if (sectionChunks.length === 0 && (params.sourceDocumentIds?.length ?? 0) > 0) {
        logger.info(`[DOC-GEN] Scoped RAG returned 0 chunks for ${params.task.heading}, falling back to project-wide search.`)
        sectionChunks = await contextRetrieval.searchChunks({
          projectId: params.projectId,
          query: ragQuery,
          topK: 5,
          documentIds: undefined,
        })
        ragStrategy = 'project-fallback'
      } else {
        logger.info(`[DOC-GEN] Retrieved ${sectionChunks.length} RAG chunks for section: ${params.task.heading}`)
      }
    } catch (ragErr) {
      logger.warn(`[DOC-GEN] Failed to fetch RAG chunks for section: ${params.task.heading}`, ragErr)
      ragStrategy = 'error'
    }

    // ─── Role & Mission ───────────────────────────────────────────────────────
    let sectionPrompt = `You are an expert technical writer drafting a specific section of a ${params.project.framework} governance document.\n\n`

    if (params.templateSystemPrompt) {
      sectionPrompt += `### Template Standards\n${params.templateSystemPrompt}\n\n`
    }

    sectionPrompt += `### Your Mission\n`
    sectionPrompt += `Write ONLY the following section: **${params.task.heading}**\n`
    sectionPrompt += `Goal: ${params.task.goal}\n`
    sectionPrompt += `Informational needs: ${params.task.informational_needs}\n`

    // ─── Per-Section Template Writing Guidance ────────────────────────────────
    if (params.task.section_guidance) {
      sectionPrompt += `\n### Section Writing Guidance (MUST FOLLOW)\n`
      sectionPrompt += `${params.task.section_guidance}\n`
    }
    sectionPrompt += `\n`

    // ─── Document Structure Awareness (Anti-Duplication) ─────────────────────
    if (params.allPlannedSections && params.allPlannedSections.length > 1) {
      const otherSections = params.allPlannedSections.filter(s => s.heading !== params.task.heading)
      sectionPrompt += `### Document Structure — Sections Covered Elsewhere (Do NOT Duplicate)\n`
      otherSections.forEach(s => {
        sectionPrompt += `- ${s.heading}: ${s.goal}\n`
      })
      sectionPrompt += `\n*Write ONLY your assigned section. Do not repeat content that belongs to the sections listed above — the reader will read the full document.*\n\n`
    }

    // ─── Core Project Context (always injected) ───────────────────────────────
    sectionPrompt += `### Project Context\n`
    sectionPrompt += `**Name:** ${params.project.name}\n`
    if (params.project.description) {
      sectionPrompt += `**Description:** ${params.project.description}\n`
    }
    sectionPrompt += `**Framework:** ${params.project.framework}\n`
    if (params.project.status) {
      sectionPrompt += `**Status:** ${params.project.status}\n`
    }

    // ─── Signal-Based Context Injection ──────────────────────────────────────
    const needsText = (params.task.informational_needs + ' ' + params.task.heading).toLowerCase()

    const signals = {
      budget:       /budget|cost|financ|spend|fund|estimate|procure|capex|opex/i.test(needsText),
      schedule:     /schedule|timeline|date|milestone|deadline|duration|phase|gantt/i.test(needsText),
      team:         /resource|team|staff|personnel|role|responsib|capacity|allocat/i.test(needsText),
      stakeholders: /stakeholder|sponsor|commit|engagement|communic|influence|interest/i.test(needsText),
      risks:        /risk|issue|threat|constraint|assumpt|uncertaint|impediment/i.test(needsText),
      scope:        /scope|deliverable|requirement|wbs|feature|accept|inclus|exclus/i.test(needsText),
    }

    if (signals.budget && (draftProj.budget || params.project.budget)) {
      sectionPrompt += `**Budget:** ${draftProj.budget || params.project.budget}\n`
    }

    if (signals.schedule) {
      if (draftProj.start_date) sectionPrompt += `**Project Start:** ${draftProj.start_date}\n`
      if (draftProj.end_date)   sectionPrompt += `**Project End:** ${draftProj.end_date}\n`
    }

    if (signals.team && draftProj.team_members) {
      const teamSummary = Array.isArray(draftProj.team_members)
        ? draftProj.team_members
            .map((m: any) => typeof m === 'string' ? m : (m.name || m.role || '')).filter(Boolean).join(', ')
        : String(draftProj.team_members)
      if (teamSummary) sectionPrompt += `**Team Members:** ${teamSummary}\n`
    }

    if (params.project.stakeholders?.length) {
      if (signals.stakeholders) {
        sectionPrompt += `\n**Key Stakeholders:**\n`
        params.project.stakeholders.forEach(sh => {
          sectionPrompt += `- ${sh.name} (${sh.role}) — Influence: ${sh.influence_level}, Interest: ${sh.interest_level}\n`
        })
      } else {
        const topNames = params.project.stakeholders.slice(0, 4).map(s => `${s.name} (${s.role})`).join(', ')
        sectionPrompt += `\n**Primary Stakeholders (naming reference):** ${topNames}\n`
      }
    }

    // ─── GKG Context (Section-Scoped) ────────────────────────────────────────
    if (params.gkgContext?.markdown) {
      const relevantGkgTypes = this.resolveGkgEntityTypesForSection(params.task.heading, params.task.informational_needs)
      const gkgLines = params.gkgContext.markdown.split('\n')

      const filteredGkgLines = gkgLines.filter(line => {
        if (!line.startsWith('- **')) return true
        return relevantGkgTypes.some(type => line.startsWith(`- **${type}**`))
      })

      if (filteredGkgLines.some(l => l.startsWith('- **'))) {
        sectionPrompt += `\n**Semantic Knowledge Graph (Verified Project Data):**\n${filteredGkgLines.join('\n')}\n`
      }
    }

    // ─── Existing Entity Registry (Deduplication) ─────────────────────────────
    const relevantEntities = this.getRelevantEntitiesForSection(
      params.project.existing_entities || [],
      params.task.heading,
      params.task.informational_needs,
      sectionChunks || [],
      signals
    )

    // Always include a baseline of verified project entities (e.g. top 10) to ensure LLM has a consistent vocabulary
    const baselineEntities = (params.project.existing_entities || [])
      .filter(e => !relevantEntities.some(re => re.name === e.name && re.type === e.type))
      .slice(0, 10)

    if (relevantEntities.length > 0 || baselineEntities.length > 0) {
      sectionPrompt += `\n**Existing Project Entities (REUSE THESE NAMES EXACTLY):**\n`
      
      if (relevantEntities.length > 0) {
        sectionPrompt += `#### Specifically Relevant for this Section:\n`
        relevantEntities.forEach(ent => {
          const details = ent.data ? ` — Details: ${JSON.stringify(ent.data)}` : ''
          sectionPrompt += `- [${ent.type}] ${ent.name}${details}\n`
        })
      }
      
      if (baselineEntities.length > 0) {
        sectionPrompt += `\n#### Global Project Registry (Naming Reference):\n`
        baselineEntities.forEach(ent => {
          const details = ent.data ? ` — Details: ${JSON.stringify(ent.data)}` : ''
          sectionPrompt += `- [${ent.type}] ${ent.name}${details}\n`
        })
      }
      
      sectionPrompt += `\n*Instruction: When referencing any entity above, use the EXACT name shown. Do not create synonyms or alternate spellings.*\n`
    }

    // ─── Reference Materials (Relevance-Scored) ───────────────────────────────
    if (params.contextItems && params.contextItems.length > 0) {
      const needsWords = params.task.informational_needs.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3)

      const scored = params.contextItems
        .map((item: any) => {
          const titleWords = (item.title || '').toLowerCase().split(/\W+/)
          const contentSnippet = (item.content || '').toLowerCase().substring(0, 600)
          const titleScore  = titleWords.filter((w: string) => needsWords.includes(w)).length * 3
          const contentScore = needsWords.filter((w: string) => contentSnippet.includes(w)).length
          return { ...item, _score: titleScore + contentScore + (item.priority || 0) }
        })
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, 5)

      if (scored.length > 0) {
        sectionPrompt += `\n**Reference Materials:**\n`
        scored.forEach((item: any) => {
          const charLimit = item._score >= 3 ? 2000 : 800
          const content = (item.content || '').substring(0, charLimit)
          const ellipsis = (item.content?.length || 0) > charLimit ? '...' : ''
          sectionPrompt += `[${item.title}]: ${content}${ellipsis}\n`
        })
      }
    }

    // ─── Section-Specific RAG Chunks ──────────────────────────────────────────
    if (sectionChunks && sectionChunks.length > 0) {
      sectionPrompt += `\n**Section-Specific Reference Materials (Retrieved via RAG):**\n`
      sectionChunks.forEach((chunk: any) => {
        const title = chunk.title || `Document Chunk (${chunk.document_id})`
        sectionPrompt += `[${title}]: ${chunk.content}\n`
      })
    }

    sectionPrompt += `\n---\n\n`
    sectionPrompt += `Output the Markdown for your assigned section starting exactly with ${params.task.heading}.\n\n`
    sectionPrompt += `### IMPORTANT: CONCISENESS & COMPLETION MANDATE\n`
    sectionPrompt += `1. **Density over Volume**: This section MUST be high-signal technical content. Avoid repetitive explanations.\n`
    sectionPrompt += `2. **Strict Limit**: Aim for under 4,000 words.\n`
    sectionPrompt += `3. **No Truncation**: Do NOT stop mid-sentence or mid-JSON-block. Your response MUST be a complete, finished Markdown block.\n\n`

    sectionPrompt += buildInlineEntityExtractionPrompt({
      templateName: params.templateName,
      category: params.templateCategory,
      userPrompt: params.task.goal,
    })

    const traceName = `agentic-doc-gen-draft-${params.order + 1}`
    const temperature = params.temperature || 0.5
    const stepId = `draft-${params.order}`

    if (params.jobId) {
      await updateJobLlmProgress(params.jobId, {
        userId: params.userId,
        currentStep: `Drafting: ${params.task.heading} (${params.provider}${params.model ? ` / ${params.model}` : ''})…`,
        patchStep: {
          id: stepId,
          patch: {
            phase: 'drafting',
            label: `Draft section ${params.order + 1}`,
            heading: params.task.heading,
            status: 'running',
            provider: params.provider,
            model: params.model,
            startedAt: new Date().toISOString(),
          },
        },
      })
    }

    let responseMarkdown: string = "";
    let tokensUsed: number = 0;
    let draftFailed = false;
    
    try {
      const aiResponse = await this.retryOnRateLimit(
        () => unifiedAIService.generate({
          prompt: sectionPrompt,
          provider: params.provider,
          model: params.model,
          temperature,
          max_tokens: 32000,
          traceName,
          projectId: params.projectId,
          userId: params.userId,
          template_id: params.templateId,
        }),
        3,
        `Draft Section ${params.order + 1} (${params.task.heading})`
      )
      responseMarkdown = aiResponse.content;
      tokensUsed = aiResponse.usage?.total_tokens || 0;
    } catch (e: any) {
      draftFailed = true
      logger.error(`Failed to draft section ${params.task.heading} after retries`, e);
      responseMarkdown = `Error generating section: ${e instanceof Error ? e.message : String(e)}`;
    }

    await this.recordLLMPromptSnapshot(params.jobId, {
      phase: 'drafting',
      label: `Draft Section ${params.order + 1}`,
      traceName,
      provider: params.provider,
      model: params.model,
      temperature,
      prompt: sectionPrompt,
      response: responseMarkdown,
      order: params.order,
      heading: params.task.heading,
      goal: params.task.goal,
      context_metrics: {
        rag_query: ragQuery,
        rag_chunks_found: sectionChunks.length,
        rag_strategy: ragStrategy,
        entities_injected: relevantEntities.length,
        baseline_entities_injected: baselineEntities.length,
      }
    })

    if (params.jobId) {
      await updateJobLlmProgress(params.jobId, {
        userId: params.userId,
        patchStep: {
          id: stepId,
          patch: {
            status: draftFailed ? 'failed' : 'completed',
            completedAt: new Date().toISOString(),
            ...(draftFailed ? { error: responseMarkdown } : {}),
          },
        },
      })
    }

    return {
      order: params.order,
      markdown: responseMarkdown,
      tokensUsed: tokensUsed
    }
  }

  private async fetchContextItems(projectId: string) {
    try {
      const contextItemsResult = await pool.query(
        `SELECT id, type, title, content, source_url, integration_type, integration_page_id
         FROM project_context_items
         WHERE project_id = $1 AND is_active = true
         ORDER BY priority DESC, created_at ASC`,
        [projectId]
      )
      return contextItemsResult.rows
    } catch (e) {
      return []
    }
  }

  private async getProjectContext(projectId: string): Promise<ProjectContext> {
    try {
      // Fetch project details
      const projectResult = await pool.query(
        `SELECT id, name, framework, description, budget, start_date, end_date, status, team_members
         FROM projects 
         WHERE id = $1`,
        [projectId]
      )

      if (projectResult.rows.length === 0) {
        throw new Error(`Project not found: ${projectId}`)
      }

      const project = projectResult.rows[0]

      // Fetch stakeholders
      const stakeholdersResult = await pool.query(
        `SELECT name, role, interest_level, influence_level
         FROM stakeholders 
         WHERE project_id = $1
         ORDER BY influence_level DESC, interest_level DESC
         LIMIT 10`,
        [projectId]
      )

      // Fetch related documents (just names and status for context)
      const documentsResult = await pool.query(
        `SELECT name, status
         FROM documents
         WHERE project_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [projectId]
      )

      // Fetch existing high-confidence/verified entities for deduplication awareness
      // Increased limit from 30 → 50 so the LLM has a richer deduplication registry
      const entitiesResult = await pool.query(
        `SELECT entity_name as name, entity_type as type, entity_data as data
         FROM entity_extractions
         WHERE project_id = $1 AND status = 'active' AND (is_verified = true OR extraction_confidence >= 80)
         ORDER BY extraction_confidence DESC
         LIMIT 50`,
        [projectId]
      )

      // Fetch entity counts by type — used by the planner to understand what is
      // already documented and where the gaps are, so it targets missing sections.
      let entityCountsByType: Record<string, number> = {}
      try {
        const entityCountsResult = await pool.query(
          `SELECT entity_type as type, COUNT(*) as count
           FROM entity_extractions
           WHERE project_id = $1 AND status = 'active'
           GROUP BY entity_type
           ORDER BY count DESC`,
          [projectId]
        )
        entityCountsResult.rows.forEach((row: any) => {
          entityCountsByType[row.type] = parseInt(row.count, 10)
        })
      } catch (countErr) {
        logger.warn('Failed to fetch entity counts by type (non-fatal)', {
          projectId,
          error: countErr instanceof Error ? countErr.message : String(countErr),
        })
      }

      return {
        ...project,
        stakeholders: stakeholdersResult.rows,
        documents: documentsResult.rows,
        existing_entities: entitiesResult.rows,
        entityCountsByType,
      } as any

    } catch (error) {
      logger.error(`Failed to fetch project context for ${projectId}:`, error)
      throw error
    }
  }

  private async getTemplate(templateId: string): Promise<TemplateContext | null> {
    try {
      const result = await pool.query(
        `SELECT id, name, framework, category, system_prompt, template_paragraphs
         FROM templates
         WHERE id = $1 AND deleted_at IS NULL`,
        [templateId]
      )

      if (result.rows.length === 0) {
        logger.warn(`Template not found: ${templateId}`)
        return null
      }

      return result.rows[0]
    } catch (error) {
      logger.error(`Failed to fetch template ${templateId}:`, error)
      return null
    }
  }


  private validateAndCleanMarkdown(content: string): string {
    if (!content || typeof content !== 'string') {
      logger.warn('Invalid content provided to validateAndCleanMarkdown')
      return "# Error\n\nDocument content could not be generated."
    }

    // Basic cleanup
    let cleaned = content.trim()

    // Remove common code block wrappers added by AI (e.g., ```markdown ... ```)
    const codeBlockRegex = /^```(?:markdown|md)?\n([\s\S]*?)\n```$/i;
    const match = cleaned.match(codeBlockRegex);
    if (match) {
      cleaned = match[1].trim();
    }

    // Remove any non-Markdown wrapper text if AI added explanations at the start
    const mdStart = cleaned.indexOf('#')
    if (mdStart > 0 && mdStart < 100) { // If heading starts soon but not at 0
      // Check if there's only whitespace/noise before it
      const lead = cleaned.substring(0, mdStart).trim();
      if (lead.length < 50) {
        cleaned = cleaned.substring(mdStart);
      }
    }

    // Ensure it starts with a heading
    if (!cleaned.startsWith('#') && cleaned.length > 0) {
      cleaned = `# Document\n\n${cleaned}`
    }

    return cleaned
  }

  /**
   * AGENTIC PHASE 4: Policy Auditing
   * Evaluates the document against the Active policy library.
   */
  private async auditDocumentAgainstPolicies(markdown: string, documentType?: string, provider?: string, model?: string, jobId?: string): Promise<{ score: number, failedRules: any[] }> {
    const queryParams: any[] = ['ACTIVE']
    let query = `
      SELECT rule_code, title, description, execution_schema
      FROM policy_library
      WHERE status = $1
    `
    
    if (documentType) {
      query += ` AND (target_document_types IS NULL OR target_document_types = '{}' OR $2 = ANY(target_document_types))`
      queryParams.push(documentType)
    } else {
      query += ` AND (target_document_types IS NULL OR target_document_types = '{}')`
    }

    let activePolicies = []
    try {
      const result = await pool.query(query, queryParams)
      activePolicies = result.rows
    } catch (e) {
      logger.error('Failed to fetch active policies', e)
    }

    if (activePolicies.length === 0) {
      logger.info(`[AGENT] No active policies found for document type: ${documentType || 'Any'}`)
      return { score: 100, failedRules: [] }
    }

    logger.info(`[AGENT] Auditing against ${activePolicies.length} policies for type [${documentType || 'Any'}]`)

    const auditSchema = z.object({
      score: z.number().min(0).max(100),
      failedRules: z.array(z.object({
        ruleCode: z.string(),
        severity: z.string(),
        rationale: z.string(),
        recommendedPatch: z.string().describe("Context-aware text snippet to inject into the document to resolve the failure.")
      }))
    })

    let policiesText = activePolicies.map(p => 
      `- Rule [${p.rule_code}]: ${p.title}\n  Description: ${p.description}\n  Execution Schema: ${JSON.stringify(p.execution_schema)}`
    ).join('\n\n')

    // Sample the document intelligently: take from the beginning, middle, and end
    // so the auditor sees the full document structure even for very large outputs.
    const MAX_AUDIT_CHARS = 40000
    let auditSample = markdown
    if (markdown.length > MAX_AUDIT_CHARS) {
      const third = Math.floor(MAX_AUDIT_CHARS / 3)
      const midStart = Math.floor(markdown.length / 2) - Math.floor(third / 2)
      const endStart = markdown.length - third
      auditSample =
        markdown.substring(0, third) +
        `\n\n[... middle section of document — ${markdown.length - MAX_AUDIT_CHARS} chars omitted for brevity ...]\n\n` +
        markdown.substring(midStart, midStart + third) +
        `\n\n[... final section sample ...]\n\n` +
        markdown.substring(endStart)
    }

    const prompt = `You are a strict Enterprise Governance Auditor for Mission Draco. 
Evaluate the following project document against the following ACTIVE compliance policies:

${policiesText}

### MANDATORY REQUIREMENT: H8 Traceability Markers
The document contains H8 Entity Tags (e.g., ######## entity_type: {...}). 
1. These tags are MANDATORY high-integrity tokens for system traceability. 
2. DO NOT mark their presence as a failure or noise.
3. DO NOT recommend their removal.
4. Ensure the Patch Agent preserves them verbatim.

Return a compliance score (0-100) based on how well the document adheres to these specific policies.
If the document fails ANY policy, add it to the failedRules array with a precise rationale and a recommended text patch to fix it.

Document${markdown.length > MAX_AUDIT_CHARS ? ` (sampled — full document is ${markdown.length} characters)` : ''}:
---
${auditSample}
---`

    // Record audit prompt in the job monitor before calling the LLM
    await this.recordLLMPromptSnapshot(jobId, {
      phase: 'auditing',
      label: `Audit Document (${documentType || 'Any'}) — ${activePolicies.length} policies`,
      traceName: 'agentic-policy-audit',
      provider: provider || 'default',
      model,
      temperature: 0.1,
      prompt,
      heading: `Document sampled: ${markdown.length > MAX_AUDIT_CHARS ? `${MAX_AUDIT_CHARS} of ${markdown.length} chars` : `${markdown.length} chars (full)`}`,
    })

    try {
      const result = await unifiedAIService.generateStructuredObject({
        prompt,
        provider: provider || 'default',
        model,
        temperature: 0.1,
        schema: auditSchema,
        traceName: 'agentic-policy-audit'
      })
      
      const payload = result.object
      
      // We log telemetry for each failed rule in the background (fire and forget)
      if (payload.failedRules && payload.failedRules.length > 0) {
        for (const failure of payload.failedRules) {
          pool.query(`
            UPDATE policy_library
            SET telemetry_metrics = jsonb_set(
              COALESCE(telemetry_metrics, '{}'::jsonb),
              '{totalRuns}',
              ((COALESCE(telemetry_metrics->>'totalRuns', '0')::int) + 1)::text::jsonb
            )
            WHERE rule_code = $1
          `, [failure.ruleCode]).catch(err => logger.error(`Failed to update telemetry for ${failure.ruleCode}`, err))
        }
      }

      // Update the snapshot with the response (score + failed rules summary)
      await this.recordLLMPromptSnapshot(jobId, {
        phase: 'auditing',
        label: `Audit Result — Score: ${payload.score}% | ${payload.failedRules?.length || 0} failed rule(s)`,
        traceName: 'agentic-policy-audit-result',
        provider: provider || 'default',
        model,
        temperature: 0.1,
        prompt: `Audit Score: ${payload.score}/100\n\nFailed Rules:\n${(payload.failedRules || []).map((r: any) => `- [${r.ruleCode}] ${r.severity}: ${r.rationale}`).join('\n') || 'None — document passed all policies.'}`,
        response: JSON.stringify({ score: payload.score, failedRules: payload.failedRules }, null, 2)
      })

      return { score: payload.score, failedRules: payload.failedRules || [] }
    } catch (e) {
      logger.error('Failed to audit document, defaulting to pass', e)
      return { score: 100, failedRules: [] }
    }
  }

  /**
   * Replace `search` in `text` allowing flexible whitespace between tokens.
   * Avoids dynamic RegExp (ReDoS-safe) while matching the old \s+ fallback behavior.
   */
  private replaceWithFlexibleWhitespace(text: string, search: string, replacement: string): string | null {
    const parts = search.trim().split(/\s+/).filter((part) => part.length > 0)
    if (parts.length === 0) return null

    let result = text
    let replacedAny = false

    while (true) {
      const span = this.findFlexibleWhitespaceSpan(result, parts)
      if (!span) break
      const matchedText = result.slice(span.start, span.end)
      if (matchedText === replacement) break
      result = result.slice(0, span.start) + replacement + result.slice(span.end)
      replacedAny = true
    }

    return replacedAny ? result : null
  }

  private findFlexibleWhitespaceSpan(
    text: string,
    parts: string[]
  ): { start: number; end: number } | null {
    const [firstPart, ...rest] = parts
    let searchFrom = 0

    while (searchFrom <= text.length - firstPart.length) {
      const firstIdx = text.indexOf(firstPart, searchFrom)
      if (firstIdx === -1) return null

      let cursor = firstIdx + firstPart.length
      let matched = true

      for (const part of rest) {
        while (cursor < text.length && /\s/.test(text[cursor])) cursor++
        if (!text.startsWith(part, cursor)) {
          matched = false
          break
        }
        cursor += part.length
      }

      if (matched) return { start: firstIdx, end: cursor }
      searchFrom = firstIdx + 1
    }

    return null
  }

  /**
   * AGENTIC PHASE 5: The Patch Agent
   * Re-writes the document to fix policy violations.
   */
  private async patchDocument(markdown: string, failedRules: any[], provider?: string, model?: string, jobId?: string): Promise<string> {
    const patchSchema = z.object({
      patches: z.array(z.object({
        search: z.string().describe("The exact text block from the original document that needs to be replaced. Must match the original document text, including whitespace and formatting, exactly."),
        replace: z.string().describe("The corrected/compliant text block to replace the search block with.")
      })).describe("List of search-and-replace blocks to apply to the document. Keep the search blocks unique and as small as possible to cover the changes.")
    })

    // Sample the document intelligently (start, middle, end) to give the Patch Agent
    // visibility across the entire document structure while staying within context limits.
    const MAX_PATCH_EMBED_CHARS = 100000
    let patchDocSample = markdown
    if (markdown.length > MAX_PATCH_EMBED_CHARS) {
      const third = Math.floor(MAX_PATCH_EMBED_CHARS / 3)
      const midStart = Math.floor(markdown.length / 2) - Math.floor(third / 2)
      const endStart = markdown.length - third
      patchDocSample =
        markdown.substring(0, third) +
        `\n\n[... middle section omitted — ${markdown.length - MAX_PATCH_EMBED_CHARS} total chars hidden ...]\n\n` +
        markdown.substring(midStart, midStart + third) +
        `\n\n[... final section sample ...]\n\n` +
        markdown.substring(endStart)
    }

    const prompt = `You are a Senior AI Patch Agent for Mission Draco.
The following document failed specific governance compliance rules and requires high-integrity remediation.

### TASK
Instead of rewriting the entire document, you must specify precise search-and-replace patches to resolve the compliance issues.

For each failed rule, identify the section or metadata block that needs modification, and output a search block (the original text) and a replace block (the corrected text).

### RULES FOR PATCHING:
1. The 'search' block MUST match the original text EXACTLY, including all indentation, newlines, and spacing.
2. The 'replace' block must integrate the correction seamlessly.
3. Keep each search block unique and as concise as possible.
4. Ensure all H8 Entity Tags (######## entity_type: {...}) are preserved and not altered unless they are specifically related to the failed rule.
5. IMPORTANT: Only generate patches for content you can see in the sample provided below. If a fix is needed in an omitted section, provide the fix but mark it clearly.

Failed Rules to correct:
${failedRules.map((f: any) => `- [${f.ruleCode}]: ${f.rationale}\n  Recommended fix: ${f.recommendedPatch}`).join('\n')}

Original Document${markdown.length > MAX_PATCH_EMBED_CHARS ? ` (smart sample — full document is ${markdown.length} chars)` : ''} (DO NOT REWRITE ENTIRELY, ONLY GENERATE THE SEARCH/REPLACE JSON):
---
${patchDocSample}
---`

    // Record patch prompt in the job monitor
    await this.recordLLMPromptSnapshot(jobId, {
      phase: 'patching',
      label: `Patch Agent — Fixing ${failedRules.length} rule(s)`,
      traceName: 'agentic-policy-patch',
      provider: provider || 'default',
      model,
      temperature: 0.1,
      prompt,
      heading: `Document: ${markdown.length > MAX_PATCH_EMBED_CHARS ? `${MAX_PATCH_EMBED_CHARS} of ${markdown.length} chars (sampled)` : `${markdown.length} chars (full)`}`,
    })

    try {
      const result = await unifiedAIService.generateStructuredObject({
        prompt,
        provider: provider || 'default',
        model,
        temperature: 0.1,
        schema: patchSchema,
        max_tokens: 16000, // Large budget for patches
        traceName: 'agentic-policy-patch'
      })

      const payload = result.object
      let patched = markdown
      
      if (payload?.patches && Array.isArray(payload.patches)) {
        for (const patch of payload.patches) {
          if (!patch.search) continue;

          // Per-patch safety guard: skip patches where the replacement content is suspiciously
          // short compared to the search block — this is a sign the LLM truncated the output
          // and would silently delete significant document content.
          const replaceLen = (patch.replace || '').length
          const searchLen = patch.search.length
          if (searchLen > 200 && replaceLen < searchLen * 0.3) {
            logger.warn(`[PATCH-AGENT] Skipping potentially destructive patch — search(${searchLen} chars) >> replace(${replaceLen} chars). Likely LLM truncation: ${patch.search.substring(0, 80)}...`)
            continue
          }
          
          if (patched.includes(patch.search)) {
            patched = patched.replace(patch.search, patch.replace || '')
            logger.info(`[PATCH-AGENT] Applied patch successfully for search block: ${patch.search.substring(0, 50)}...`)
          } else {
            logger.warn(`[PATCH-AGENT] Search block not found in document: ${JSON.stringify(patch.search)}`)
            // Fallback: Try regex-based whitespace-insensitive match
            const normalizedSearch = patch.search.replace(/\s+/g, ' ').trim()
            if (normalizedSearch) {
              logger.warn(`[PATCH-AGENT] Exact match failed, trying whitespace-flexible match...`)
              const flexReplaced = this.replaceWithFlexibleWhitespace(
                patched,
                patch.search,
                patch.replace || ''
              )
              if (flexReplaced !== null) {
                patched = flexReplaced
                logger.info(`[PATCH-AGENT] Applied patch successfully using whitespace-flexible fallback.`)
              }
            }
          }
        }
      }

      // Content-integrity guard: if patching caused the document to shrink by more than 20%,
      // the patches were destructive (LLM generated bad search/replace from a truncated view).
      // Discard ALL patches and return the original document unchanged.
      if (patched.length < markdown.length * 0.8) {
        logger.error(`[PATCH-AGENT] 🚨 Content integrity violation — patched doc (${patched.length} chars) is <80% of original (${markdown.length} chars). Discarding all patches to preserve full document.`)
        return markdown
      }
      
      return this.validateAndCleanMarkdown(patched)
    } catch (e) {
      logger.error('Failed to patch document', e)
      return markdown
    }
  }
}

export const documentGenerationService = new DocumentGenerationService()
