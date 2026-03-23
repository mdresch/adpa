import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { aiService } from "./aiService"
import { unifiedAIService } from "./unifiedAIService"
import { documentTemplateService } from "../modules/documentTemplates/service"
import { getContextForStrategy } from "./gkg"
import { z } from "zod"

export interface DocumentGenerationRequest {
  projectId: string
  templateId?: string
  userPrompt: string
  provider: string
  model?: string
  temperature?: number
  userId: string
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

class DocumentGenerationService {

  async generateDocument(request: DocumentGenerationRequest) {
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
      logger.info(`[AGENT] Phase 2: Drafting ${generationPlan.sections.length} sections in parallel...`)

      // We draft each section in parallel to save time, providing targeted context for each.
      const sectionPromises = generationPlan.sections.map((sectionTask, index) => {
        return this.draftSection({
          task: sectionTask,
          order: index,
          project,
          gkgContext: gkg_context_snapshot,
          contextItems: customContextItems,
          provider: request.provider,
          model: request.model,
          temperature: request.temperature,
          projectId: request.projectId,
          userId: request.userId,
          templateId: request.templateId,
        })
      })

      const draftedSections = await Promise.all(sectionPromises)

      // Sort sections back into their planned order (Promise.all preserves array order, but it's safe to sort)
      draftedSections.sort((a, b) => a.order - b.order)

      let totalTokensUsed = 0;

      // 6. AGENTIC PHASE 3: Synthesis & Assembly
      logger.info(`[AGENT] Phase 3: Assembling Document...`)

      let finalMarkdown = ""
      for (const section of draftedSections) {
        totalTokensUsed += section.tokensUsed
        // Ensure each section is separated cleanly
        finalMarkdown += section.markdown.trim() + "\n\n"
      }

      const markdown = this.validateAndCleanMarkdown(finalMarkdown)

      // 7. Return structured result
      return {
        content: markdown,
        metadata: {
          provider: request.provider,
          model: request.model || 'default',
          tokens_used: totalTokensUsed, // Aggregate of all parallel calls
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
      }
    } catch (error) {
      logger.error('Agentic document generation failed:', error)
      throw error
    }
  }

  /**
   * AGENTIC PHASE 1: Plan Document Structure
   * Asks the AI to analyze the prompt/template and output an array of precise "Research Tasks".
   */
  private async planDocumentStructure(params: {
    userPrompt: string;
    project: ProjectContext;
    template: TemplateContext | null;
    provider: string;
    model?: string;
    projectId: string;
    userId: string;
    templateId?: string;
  }) {
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

    if (params.template?.template_paragraphs) {
      plannerPrompt += `### Required Template Structure:\n`
      const sortedParagraphs = params.template.template_paragraphs.sort((a, b) => a.order - b.order)
      sortedParagraphs.forEach((para) => {
        plannerPrompt += `${para.order}. ${para.section_name} (${para.section_type}, required: ${para.required})\n`
        if (para.description) plannerPrompt += `   Description: ${para.description}\n`
      })
      plannerPrompt += `\n`
    }

    plannerPrompt += `### User Request:\n${params.userPrompt}\n\n`
    plannerPrompt += `Output a JSON array of sections. Map the required template structure to the user's specific request.`

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
      if (params.template?.template_paragraphs) {
        return {
          sections: params.template.template_paragraphs
            .sort((a, b) => a.order - b.order)
            .map(p => ({
              heading: `## ${p.section_name}`,
              goal: p.description || `Write the ${p.section_name} section`,
              informational_needs: p.prompt_guidance || "General project context."
            }))
        }
      } else {
        return {
          sections: [{ heading: "## Document Generation", goal: "Fulfill user request", informational_needs: "All available project context" }]
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
    provider: string;
    model?: string;
    temperature?: number;
    projectId: string;
    userId: string;
    templateId?: string;
  }) {
    let sectionPrompt = `You are an expert technical writer drafting a specific section of a ${params.project.framework} document.\n\n`

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
      sectionPrompt += `\n**Semantic Graph Context:**\n${params.gkgContext.markdown}\n`
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
    sectionPrompt += `Output ONLY the Markdown for your assigned section. Start your output exactly with: ${params.task.heading}`

    const aiResponse = await aiService.generateWithFallback({
      prompt: sectionPrompt,
      provider: params.provider,
      model: params.model,
      temperature: params.temperature || 0.5, // Slightly lower temperature for drafting facts
      traceName: `agentic-doc-gen-draft-${params.order + 1}`,
      projectId: params.projectId,
      userId: params.userId,
      template_id: params.templateId,
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

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

      return {
        ...project,
        stakeholders: stakeholdersResult.rows,
        documents: documentsResult.rows,
      }
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
}

export const documentGenerationService = new DocumentGenerationService()

