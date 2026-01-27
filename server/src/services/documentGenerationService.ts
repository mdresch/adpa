import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { aiService } from "./aiService"

export interface DocumentGenerationRequest {
  projectId: string
  templateId?: string
  userPrompt: string
  provider: string
  model?: string
  temperature?: number
  userId: string
}

export interface ProjectContext {
  id: string
  name: string
  framework: string
  description?: string
  budget?: number
  start_date?: string
  end_date?: string
  status: string
  stakeholders?: Array<{
    name: string
    role: string
    interest_level: string
    influence_level: string
  }>
  documents?: Array<{
    name: string
    status: string
  }>
  team_members?: any
}

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
      logger.info(`Starting document generation for project ${request.projectId}`)
      
      // 1. Fetch project context
      const project = await this.getProjectContext(request.projectId)
      logger.info(`Project context fetched: ${project.name}`)
      
      // 2. Fetch template (if provided)
      const template = request.templateId 
        ? await this.getTemplate(request.templateId)
        : null
      logger.info(`Template: ${template?.name || 'None'}`)
      
      // 3. Build enriched prompt
      const enrichedPrompt = await this.buildEnrichedPrompt({
        userPrompt: request.userPrompt,
        project,
        template,
        projectId: request.projectId,
        userId: request.userId,
      })
      
      logger.info(`Enriched prompt built (${enrichedPrompt.length} chars)`)
      
      // 4. Generate via AI Gateway with fallback
      const aiResponse = await aiService.generateWithFallback({
        prompt: enrichedPrompt,
        provider: request.provider,
        model: request.model,
        temperature: request.temperature || 0.7,
        template_id: request.templateId,
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])
      
      logger.info(`AI generation successful. Tokens: ${aiResponse.usage?.total_tokens}`)
      
      // 5. Validate and clean Markdown
      const markdown = this.validateAndCleanMarkdown(aiResponse.content)
      
      // 6. Optionally publish to Confluence if project mapping exists
      try {
        const { getByProjectId } = await import('../database/projectIntegrations')
        const mapping = await getByProjectId(request.projectId)
        if (mapping?.confluence_space_key) {
          const { queueService } = await import('./queueService')
          const title = `${project.name} - ${template?.name || 'Generated Document'}`
          // Attempt to get a documentId if saved downstream; if available upstream, include it
          // Note: Confluence publishing is now handled by direct auto-integration
          // in the document creation/update endpoints (documents.ts and projects.ts)
          // This ensures immediate publishing without requiring a separate job queue
          logger.debug('[PUBLISH-CONFLUENCE] Skipping queue-based publish - using direct auto-integration instead')
        }
      } catch (e) {
        logger.warn('[PUBLISH-CONFLUENCE] Integration check failed', e)
      }

      // 7. Return structured result
      return {
        content: markdown,
        metadata: {
          provider: aiResponse.provider,
          model: aiResponse.model,
          tokensUsed: aiResponse.usage?.total_tokens || 0,
          context: {
            projectName: project.name,
            framework: project.framework,
            templateUsed: template?.name,
            stakeholdersIncluded: (project.stakeholders?.length || 0) > 0,
            documentsReferenced: (project.documents?.length || 0),
          }
        }
      }
    } catch (error) {
      logger.error('Document generation failed:', error)
      throw error
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

  private async buildEnrichedPrompt(params: {
    userPrompt: string
    project: ProjectContext
    template: TemplateContext | null
    projectId: string
    userId: string
  }): Promise<string> {
    const { userPrompt, project, template, projectId, userId } = params

    let prompt = ""

    // 1. System instructions for framework compliance
    prompt += `You are an expert business analyst and technical writer specializing in ${project.framework} framework.\n\n`
    prompt += `Generate a professional, well-structured document in Markdown format.\n\n`

    // 2. Project context
    prompt += `## Project Context\n\n`
    prompt += `**Project Name:** ${project.name}\n`
    prompt += `**Framework:** ${project.framework}\n`
    if (project.description) {
      prompt += `**Description:** ${project.description}\n`
    }
    if (project.status) {
      prompt += `**Status:** ${project.status}\n`
    }
    prompt += `\n`

    // 3. Stakeholders context (if available)
    if (project.stakeholders && project.stakeholders.length > 0) {
      prompt += `## Key Stakeholders\n\n`
      project.stakeholders.forEach(sh => {
        prompt += `- **${sh.name}** (${sh.role}) - Interest: ${sh.interest_level}, Influence: ${sh.influence_level}\n`
      })
      prompt += `\n`
    }

    // 4. Additional Project Context (Reference Materials)
    try {
      const contextItemsResult = await pool.query(
        `SELECT id, type, title, content, source_url, integration_type, integration_page_id
         FROM project_context_items
         WHERE project_id = $1 AND is_active = true
         ORDER BY priority DESC, created_at ASC`,
        [projectId]
      )

      if (contextItemsResult.rows.length > 0) {
        prompt += `## Additional Project Context (Reference Materials)\n\n`
        prompt += `The following reference materials provide additional context for this project:\n\n`

        // Group by type
        const itemsByType: Record<string, typeof contextItemsResult.rows> = {}
        contextItemsResult.rows.forEach((item) => {
          if (!itemsByType[item.type]) {
            itemsByType[item.type] = []
          }
          itemsByType[item.type].push(item)
        })

        // Custom text (highest priority)
        if (itemsByType['custom_text']) {
          prompt += `### Custom Context\n\n`
          itemsByType['custom_text'].forEach((item) => {
            prompt += `**${item.title}:**\n${item.content}\n\n`
          })
        }

        // Integration pages
        if (itemsByType['jira_page'] || itemsByType['confluence_page']) {
          prompt += `### Integration Sources\n\n`
          ;[...(itemsByType['jira_page'] || []), ...(itemsByType['confluence_page'] || [])].forEach((item) => {
            const source = item.integration_type === 'jira' ? 'Jira' : 'Confluence'
            prompt += `**${source} - ${item.title}:**\n${item.content.substring(0, 2000)}${item.content.length > 2000 ? '...' : ''}\n\n`
          })
        }

        // URLs
        if (itemsByType['url']) {
          prompt += `### External Sources\n\n`
          itemsByType['url'].forEach((item) => {
            prompt += `**URL: ${item.source_url}**\n${item.content.substring(0, 2000)}${item.content.length > 2000 ? '...' : ''}\n\n`
          })
        }

        // Reference documents
        if (itemsByType['reference_document']) {
          prompt += `### Reference Documents\n\n`
          itemsByType['reference_document'].forEach((item) => {
            prompt += `**Reference: ${item.title}**\n${item.content.substring(0, 2000)}${item.content.length > 2000 ? '...' : ''}\n\n`
          })
        }

        prompt += `\n`

        // Log usage for all context items used
        const contextItemIds = contextItemsResult.rows.map((r) => r.id)
        for (const itemId of contextItemIds) {
          try {
            await pool.query(
              `INSERT INTO project_context_usage_log (
                project_id, context_item_id, usage_type, usage_timestamp, metadata
              ) VALUES ($1, $2, $3, NOW(), $4)`,
              [
                projectId,
                itemId,
                'document_generation',
                JSON.stringify({ logged_by: userId }),
              ]
            )
          } catch (logError: any) {
            // Don't fail document generation if logging fails
            logger.warn('Failed to log context item usage', {
              itemId,
              error: logError.message,
            })
          }
        }
      }
    } catch (error: any) {
      // Don't fail document generation if context items can't be fetched
      logger.warn('Failed to fetch project context items', {
        projectId,
        error: error.message,
      })
    }

    // 4. Template structure guidance (if provided)
    if (template) {
      prompt += `## Template: ${template.name}\n\n`
      
      if (template.system_prompt) {
        prompt += `${template.system_prompt}\n\n`
      }

      if (template.template_paragraphs && Array.isArray(template.template_paragraphs)) {
        prompt += `### Required Sections:\n\n`
        const sortedParagraphs = template.template_paragraphs.sort((a, b) => a.order - b.order)
        sortedParagraphs.forEach((para) => {
          prompt += `${para.order}. **${para.section_name}** (${para.section_type}${para.required ? ', required' : ', optional'})\n`
          if (para.description) {
            prompt += `   ${para.description}\n`
          }
          if (para.prompt_guidance) {
            prompt += `   Guidance: ${para.prompt_guidance}\n`
          }
        })
        prompt += `\n`
      }
    }

    // 5. Output format requirements
    prompt += `## Output Requirements\n\n`
    prompt += `- Format: Markdown only\n`
    prompt += `- Use proper headings (# ## ###)\n`
    prompt += `- Include tables where appropriate\n`
    prompt += `- Use bullet points and numbered lists\n`
    prompt += `- Include code blocks if relevant\n`
    prompt += `- Be professional and concise\n\n`

    // 6. User's specific instructions
    prompt += `## User Request\n\n`
    prompt += userPrompt
    prompt += `\n\n---\n\n`
    prompt += `Generate the document now. Output only the Markdown content, no explanations.`

    return prompt
  }

  private validateAndCleanMarkdown(content: string): string {
    if (!content || typeof content !== 'string') {
      logger.warn('Invalid content provided to validateAndCleanMarkdown')
      return "# Error\n\nDocument content could not be generated."
    }

    // Basic cleanup
    let cleaned = content.trim()

    // Remove any non-Markdown wrapper text if AI added explanations
    const mdStart = cleaned.indexOf('#')
    if (mdStart > 50) {
      // If there's a lot of text before the first heading, try to remove it
      cleaned = cleaned.substring(mdStart)
    }

    // Ensure it starts with a heading
    if (!cleaned.startsWith('#')) {
      cleaned = `# Document\n\n${cleaned}`
    }

    return cleaned
  }
}

export const documentGenerationService = new DocumentGenerationService()

