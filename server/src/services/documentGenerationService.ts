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
      })
      
      logger.info(`Enriched prompt built (${enrichedPrompt.length} chars)`)
      
      // 4. Generate via AI Gateway
      const aiResponse = await aiService.generate({
        prompt: enrichedPrompt,
        provider: request.provider,
        model: request.model,
        temperature: request.temperature || 0.7,
        template_id: request.templateId,
      })
      
      logger.info(`AI generation successful. Tokens: ${aiResponse.usage?.total_tokens}`)
      
      // 5. Validate and clean Markdown
      const markdown = this.validateAndCleanMarkdown(aiResponse.content)
      
      // 6. Return structured result
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
  }): Promise<string> {
    const { userPrompt, project, template } = params

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

