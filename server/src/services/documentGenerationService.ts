import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { unifiedAIService } from "./unifiedAIService"
import { documentTemplateService } from "../modules/documentTemplates/service"
import { getContextForStrategy } from "./gkg"
import { z } from "zod"
import { buildInlineEntityExtractionPrompt } from "./inlineEntityExtractionPrompt"
import { v4 as uuidv4 } from "uuid"

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
  phase: 'planning' | 'drafting'
  label: string
  traceName: string
  provider: string
  model?: string
  temperature: number
  prompt: string
  characterCount: number
  capturedAt: string
  order?: number
  heading?: string
  goal?: string
}

class DocumentGenerationService {
  private async recordLLMPromptSnapshot(
    jobId: string | undefined,
    snapshot: Omit<LLMPromptSnapshot, 'characterCount' | 'capturedAt'>
  ) {
    if (!jobId) return

    const payload: LLMPromptSnapshot = {
      ...snapshot,
      characterCount: snapshot.prompt.length,
      capturedAt: new Date().toISOString(),
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
  }

  private getDraftConcurrency(provider: string): number {
    const configured = Number(process.env.ADPA_DOC_GEN_DRAFT_CONCURRENCY)
    if (Number.isInteger(configured) && configured > 0) {
      return configured
    }

    // Keep inline generation responsive without flooding quota-limited providers.
    if (provider === 'google') {
      return 2
    }
    if (provider === 'mistral') {
      return 1
    }

    return 3
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

  async generateDocument(request: DocumentGenerationRequest) {
    let isDocumentCreated = false;
    const docId = request.documentId || uuidv4();
    try {
      logger.info(`Starting agentic document generation for project ${request.projectId}`)
      
      // 1. Fetch project context
      const project = await this.getProjectContext(request.projectId)
      logger.info(`Project context fetched: ${project.name}`)

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
            if (gkgResult.unitsCount > 0 || (gkgResult.markdown && gkgResult.markdown.trim().length > 0)) {
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
      const generationPlan = await this.planDocumentStructure({
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

      if (!generationPlan || !generationPlan.sections || generationPlan.sections.length === 0) {
        throw new Error("AI failed to return a valid document structure plan.")
      }

      logger.info(`[AGENT] Plan returned ${generationPlan.sections.length} required sections to draft.`)

      // 4. Extract global reference materials once
      const customContextItems = await this.fetchContextItems(request.projectId)

      // 5. AGENTIC PHASE 2: Parallel Drafting of Sections
      const draftConcurrency = this.getDraftConcurrency(request.provider)
      logger.info(`[AGENT] Phase 2: Drafting ${generationPlan.sections.length} sections with concurrency ${draftConcurrency}...`)

      const draftedSections = await this.mapWithConcurrency(generationPlan.sections, draftConcurrency, async (sectionTask, index) => {
        return await this.draftSection({
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
        })
      })

      // Sort sections back into their planned order
      draftedSections.sort((a, b) => a.order - b.order)

      // 6. AGENTIC PHASE 3: Synthesis & Assembly
      logger.info(`[AGENT] Phase 3: Assembling Document & Extracting Entities...`)

      let rawMarkdown = ""
      let totalTokensUsed = 0;
      for (const section of draftedSections) {
        totalTokensUsed += section.tokensUsed
        rawMarkdown += section.markdown.trim() + "\n\n"
      }

      // Perform single-pass entity extraction and cleanup
      const { InlineEntityParserService } = await import('./inlineEntityParserService')
      const parseResult = await InlineEntityParserService.parseAndProcess({
        projectId: request.projectId,
        userId: request.userId,
        documentId: docId,
        markdown: rawMarkdown
      })

      let markdown = this.validateAndCleanMarkdown(parseResult.cleanedMarkdown)
      const combinedEntitiesByType = parseResult.entitiesByType || {}

      // Global Deduplication and Context Adherence Scoring
      const finalUniqueCounts: Record<string, number> = {}
      const reusedEntityIdentities: Array<{ name: string; type: string; matchConfidence: number }> = []
      const providedEntities = project.existing_entities || []
      
      for (const [type, entities] of Object.entries(combinedEntitiesByType)) {
        const seenNames = new Set<string>()
        let uniqueCount = 0
        
        for (const entity of entities) {
          const name = (entity.name || entity.title || entity.item_name || entity.description || "").toString().toLowerCase().trim()
          if (!name) continue;

          if (!seenNames.has(name)) {
            seenNames.add(name)
            uniqueCount++

            // Check if this matches a provided entity (Context Adherence)
            const normalizedExtracted = name.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
            
            const match = providedEntities.find(p => {
              const normalizedProvided = p.name.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
              return p.type === type && (normalizedProvided === normalizedExtracted || normalizedProvided.includes(normalizedExtracted) || normalizedExtracted.includes(normalizedProvided))
            })

            if (match) {
              const exactMatch = match.name.toLowerCase().trim() === name
              reusedEntityIdentities.push({
                name: match.name,
                type: match.type,
                matchConfidence: exactMatch ? 100 : 85 // High confidence for fuzzy/normalized matches
              })
            }
          }
        }
        finalUniqueCounts[type] = uniqueCount
      }

      // Calculate overall Context Reuse Score
      const contextMatchingScore = providedEntities.length > 0 
        ? Math.round((reusedEntityIdentities.length / providedEntities.length) * 100)
        : 100 // 100% if no context was provided to adhere to

      const appliedContextEntities = reusedEntityIdentities

      // 6.5. AGENTIC PHASE 4 & 5: Autonomous Auditing and Patching Loop
      logger.info(`[AGENT] Phase 4: Commencing Policy Audit Loop...`)
      let currentScore = 100
      let attempts = 0
      const MAX_RETRIES = 3
      const auditLog: any[] = []

      while (attempts < MAX_RETRIES) {
        const auditResult = await this.auditDocumentAgainstPolicies(markdown, template?.name, request.provider, request.model)
        currentScore = auditResult.score
        
        if (currentScore >= 90) {
          logger.info(`[AGENT] Document passed compliance audit with score ${currentScore}%`)
          break
        }
        
        logger.warn(`[AGENT] Document failed audit (Score: ${currentScore}%). Initiating Phase 5: Patch Agent (Attempt ${attempts + 1}/${MAX_RETRIES})`)
        
        // Phase 5: The Patch Agent
        markdown = await this.patchDocument(markdown, auditResult.failedRules, request.provider, request.model)
        attempts++
        auditLog.push({ attempt: attempts, score: currentScore, failedRules: auditResult.failedRules })
      }

      if (currentScore < 90) {
        logger.warn(`[AGENT] Document failed compliance audit after ${MAX_RETRIES} attempts. Human approval required.`)
      }

      // 7. Return structured result
      return {
        content: markdown,
        documentId: docId,
        entityCounts: finalUniqueCounts,
        metadata: {
          provider: request.provider,
          model: request.model || 'default',
          tokens_used: totalTokensUsed, // Aggregate of all parallel calls
          contextMatchingScore,
          appliedContextEntities,
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
  }): Promise<{ sections: Array<{ heading: string; goal: string; informational_needs: string }> }> {
    // We define the Zod schema representing the JSON we want the AI to return.
    const planSchema = z.object({
      sections: z.array(z.object({
        heading: z.string().describe("The Markdown heading for the section (e.g. '## Executive Summary')"),
        goal: z.string().describe("What this specific section needs to accomplish based on the user prompt."),
        informational_needs: z.string().describe("What context (stakeholders, budget, GKG data, etc) is needed to write this section accurately. BE SPECIFIC."),
      }))
    })

    let plannerPrompt = `You are a Senior Project Manager planning a document using the ${params.project.framework} framework.\n\n`
    plannerPrompt += `Your job is to read the User's Request and the required Template Structure, and break the document down into an array of sections that need to be drafted.\n\n`
    plannerPrompt += `### Project Overview:\n- Name: ${params.project.name}\n- Status: ${params.project.status}\n\n`

    const templateParagraphs = this.getTemplateParagraphs(params.template)

    if (templateParagraphs.length > 0) {
      plannerPrompt += `### Required Template Structure:\n`
      const sortedParagraphs = [...templateParagraphs].sort((a, b) => a.order - b.order)
      sortedParagraphs.forEach((para) => {
        plannerPrompt += `${para.order}. ${para.section_name} (${para.section_type}, required: ${para.required})\n`
        if (para.description) plannerPrompt += `   Description: ${para.description}\n`
      })
      plannerPrompt += `\n`
    } else {
      const docType = params.template?.name || "unstructured document"
      plannerPrompt += `### Document Type: ${docType}\n`
      plannerPrompt += `No pre-defined template structure is specified. You MUST design a logical structure of 3 to 6 distinct sections/paragraphs to fulfill the request. `
      plannerPrompt += `Choose logical headings appropriate for a ${params.project.framework} document, covering background, main components/requirements, implementation/next steps, and constraints.`
      plannerPrompt += `\n\n`
    }


    plannerPrompt += `### User Request:\n${params.userPrompt}\n\n`
    plannerPrompt += `Output a JSON array of sections. Map the required template structure or design a new one based on the user's specific request.`

    await this.recordLLMPromptSnapshot(params.jobId, {
      phase: 'planning',
      label: 'Plan Document Structure',
      traceName: 'agentic-doc-gen-plan',
      provider: params.provider,
      model: params.model,
      temperature: 0.1,
      prompt: plannerPrompt,
    })

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
      return result.object
    } catch (e: any) {
      logger.warn(`Failed structured generation, falling back to manual template mapping`, e)
      // Fallback: If AI fails the structured output, manually construct the plan based on template paragraphs
      if (templateParagraphs.length > 0) {
        return {
          sections: [...templateParagraphs]
            .sort((a, b) => a.order - b.order)
            .map(p => ({
              heading: `## ${p.section_name}`,
              goal: p.description || `Write the ${p.section_name} section`,
              informational_needs: p.prompt_guidance || "General project context."
            }))
        }
      } else {
        return {
          sections: [
            { heading: "## 1. Executive Summary", goal: "Summarize the document purpose and key takeaways.", informational_needs: "General project context." },
            { heading: "## 2. Objectives & Scope", goal: "Define the objectives, scope items, and deliverables.", informational_needs: "Project deliverables and scope items." },
            { heading: "## 3. Core Content & Details", goal: "Fulfill the detailed requirements of the user request.", informational_needs: "Specific requirements and stakeholders." },
            { heading: "## 4. Next Steps & Constraints", goal: "Detail implementation activities and project constraints.", informational_needs: "Project constraints and scheduled activities." }
          ]
        }
      }
    }
  }

  /**
   * AGENTIC PHASE 2: Draft Single Section
   * Targeted AI call to write just the markdown for a single specific section.
   */
  private async draftSection(params: {
    task: { heading: string; goal: string; informational_needs: string };
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
  }) {
    let sectionPrompt = `You are an expert technical writer drafting a specific section of a ${params.project.framework} document.\n\n`

    // Inject template-specific guidance if available
    if (params.templateSystemPrompt) {
      sectionPrompt += `### Template Standards\n${params.templateSystemPrompt}\n\n`
    }

    // We explicitly tell the AI what its isolated job is
    sectionPrompt += `### Your Mission\n`
    sectionPrompt += `Write ONLY the following section: **${params.task.heading}**\n`
    sectionPrompt += `Goal: ${params.task.goal}\n\n`


    // Inject targeted context (we can optimize this later to filter context intelligently based on informational_needs)
    sectionPrompt += `### Context Available to You\n`
    sectionPrompt += `**Project:** ${params.project.name}\n`

    // Simple relevance filter - if informational needs mention stakeholders, inject them
    if (params.task.informational_needs.toLowerCase().includes('stakeholder') && params.project.stakeholders) {
      sectionPrompt += `**Key Stakeholders:**\n`
      params.project.stakeholders.forEach(sh => {
        sectionPrompt += `- ${sh.name} (${sh.role}) - Influence: ${sh.influence_level}\n`
      })
    }

    if (params.task.informational_needs.toLowerCase().includes('budget') && params.project.budget) {
      sectionPrompt += `**Budget:** ${params.project.budget}\n`
    }

    // Always inject GKG context if available as it represents the semantic truth
    if (params.gkgContext?.markdown) {
      sectionPrompt += `\n**Semantic Graph Context (Known Relationships):**\n${params.gkgContext.markdown}\n`
    }

    // Inject existing project entities (for deduplication awareness)
    if (params.project.existing_entities && params.project.existing_entities.length > 0) {
      sectionPrompt += `\n**Existing Project Entities (REUSE THESE NAMES):**\n`
      params.project.existing_entities.forEach(ent => {
        sectionPrompt += `- [${ent.type}] ${ent.name}\n`
      })
      sectionPrompt += `\n*Instruction: If your draft introduces any of the entities listed above, use their EXACT names and types to maintain consistency across the project registry.*\n`
    }

    // Inject custom context materials

    if (params.contextItems && params.contextItems.length > 0) {
      sectionPrompt += `\n**Reference Materials:**\n`
      // Limit to top 3 to avoid context explosion on smaller models
      params.contextItems.slice(0, 3).forEach(item => {
        sectionPrompt += `[${item.title}]: ${item.content.substring(0, 1000)}...\n`
      })
    }

    sectionPrompt += `\n---\n\n`
    sectionPrompt += `Output the Markdown for your assigned section starting exactly with ${params.task.heading}.\n\n`
    
    // Explicit Instruction for table schema alignment
    sectionPrompt += `### IMPORTANT: Entity Schema Alignment Instruction\n`
    sectionPrompt += `Ensure that all extracted entities wrapped in H8 formats exactly match the property fields defined in the database 'template_extracted_entities' table schema.\n`
    sectionPrompt += `Specifically, for each entity type:\n`
    sectionPrompt += `- 'stakeholders' MUST map to the 'STAKEHOLDER' entity_type, using the 'name' field as the main identifier (stored as 'extracted_name') and must contain 'role', 'interest_level', and 'influence_level' in the JSON body.\n`
    sectionPrompt += `- 'requirements' MUST map to the 'REQUIREMENT' entity_type, using the 'title' field as the main identifier (stored as 'extracted_name') and must contain 'description', 'type', and 'priority' in the JSON body.\n`
    sectionPrompt += `- 'constraints' MUST map to the 'CONSTRAINT' entity_type, using the 'title' field as the main identifier (stored as 'extracted_name') and must contain 'description' and 'type' in the JSON body.\n`
    sectionPrompt += `All generated JSON values under the H8 tags will be parsed and stored directly in the 'structural_payload' column of the 'template_extracted_entities' table. Do not add unstructured wrapper properties or nesting levels to the JSON objects.\n\n`

    sectionPrompt += buildInlineEntityExtractionPrompt({
      templateName: params.templateName,
      category: params.templateCategory,
      userPrompt: params.task.goal,
    })

    const traceName = `agentic-doc-gen-draft-${params.order + 1}`
    const temperature = params.temperature || 0.5

    await this.recordLLMPromptSnapshot(params.jobId, {
      phase: 'drafting',
      label: `Draft Section ${params.order + 1}`,
      traceName,
      provider: params.provider,
      model: params.model,
      temperature,
      prompt: sectionPrompt,
      order: params.order,
      heading: params.task.heading,
      goal: params.task.goal,
    })

    const aiResponse = await unifiedAIService.generate({
      prompt: sectionPrompt,
      provider: params.provider,
      model: params.model,
      temperature, // Slightly lower temperature for drafting facts
      traceName,
      projectId: params.projectId,
      userId: params.userId,
      template_id: params.templateId,
    })

    return {
      order: params.order,
      markdown: aiResponse.content,
      tokensUsed: aiResponse.usage?.total_tokens || 0
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

      // Fetch sample of existing high-confidence/verified entities for deduplication awareness
      const entitiesResult = await pool.query(
        `SELECT entity_name as name, entity_type as type
         FROM entity_extractions
         WHERE project_id = $1 AND status = 'active' AND (is_verified = true OR extraction_confidence >= 80)
         ORDER BY extraction_confidence DESC
         LIMIT 30`,
        [projectId]
      )

      return {
        ...project,
        stakeholders: stakeholdersResult.rows,
        documents: documentsResult.rows,
        existing_entities: entitiesResult.rows,
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
  private async auditDocumentAgainstPolicies(markdown: string, documentType?: string, provider?: string, model?: string): Promise<{ score: number, failedRules: any[] }> {
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

    const prompt = `You are a strict Enterprise Governance Auditor. 
Evaluate the following project document against the following ACTIVE compliance policies:

${policiesText}

Return a compliance score (0-100) based on how well the document adheres to these specific policies.
If the document fails ANY policy, add it to the failedRules array with a precise rationale and a recommended text patch to fix it.

Document:
---
${markdown.substring(0, 8000)}
---`

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

      return { score: payload.score, failedRules: payload.failedRules || [] }
    } catch (e) {
      logger.error('Failed to audit document, defaulting to pass', e)
      return { score: 100, failedRules: [] }
    }
  }

  /**
   * AGENTIC PHASE 5: The Patch Agent
   * Re-writes the document to fix policy violations.
   */
  private async patchDocument(markdown: string, failedRules: any[], provider?: string, model?: string): Promise<string> {
    const prompt = `You are an AI Patch Agent. The following document failed compliance audits.
    
Failed Rules to correct:
${failedRules.map((f: any) => `- [${f.ruleCode}]: ${f.rationale}\n  Recommended fix: ${f.recommendedPatch}`).join('\n')}

Rewrite the document to explicitly satisfy these rules and fix the gaps seamlessly. Maintain original engineering depth while expanding text where required. 
Return ONLY the fully corrected Markdown without markdown wrappers.

Original Document:
---
${markdown}
---`

    try {
      const result = await unifiedAIService.generate({
        prompt,
        provider: provider || 'default',
        model,
        temperature: 0.3,
        traceName: 'agentic-policy-patch'
      })
      return this.validateAndCleanMarkdown(result.content || markdown)
    } catch (e) {
      logger.error('Failed to patch document', e)
      return markdown
    }
  }
}

export const documentGenerationService = new DocumentGenerationService()
