/**
 * OpenUI Chat Service
 * Handles chat logic with intelligent component selection
 */

import type { AuthenticatedUser } from "@/lib/auth-utils"
import { selectComponentType, type ComponentSelectionContext } from "@/lib/openui/componentSelector"
import type { ComponentPayload, OpenUIChatJson } from "@/lib/openui/library"

import { pool } from "../../database/connection"
import { NotFoundError, ValidationError } from "../../middleware/errorHandler"
import aiSearchRAGService from "../../services/aiSearchRAGService"
import { logger } from "../../utils/logger"

import {
  OpenUIChatRepository,
  type OpenUIChatThread,
  type OpenUIChatThreadSummary,
} from "./OpenUIChatRepository"

export type OpenUIChatRequestMessage = {
  role: string
  content: OpenUIChatJson
}

export type OpenUIChatUserMessage = OpenUIChatRequestMessage & {
  role: "user"
}

export type StreamReplyInput = {
  user: AuthenticatedUser
  projectId: string
  threadId?: string
  message: OpenUIChatUserMessage
}

type ProjectContextFallback = {
  name: string
  description: string | null
  framework: string | null
}

/**
 * OpenUIChat Service
 * Manages conversation threads and intelligent component selection
 */
export class OpenUIChatService {
  constructor(
    private readonly repository: OpenUIChatRepository = new OpenUIChatRepository(),
    private readonly loadProjectContextFallback: (projectId: string) => Promise<ProjectContextFallback | null> =
      defaultProjectContextFallbackLoader
  ) {}

  /**
   * List all threads for a user in a project
   */
  async listThreads(userId: string, projectId: string): Promise<OpenUIChatThreadSummary[]> {
    return this.repository.listThreads(userId, projectId)
  }

  /**
   * Get a specific thread
   */
  async getThread(userId: string, projectId: string, threadId: string): Promise<OpenUIChatThread | null> {
    const thread = await this.repository.getThread(threadId, userId, projectId)
    return thread || null
  }

  /**
   * Stream a reply with intelligent component selection
   */
  async streamReply(input: StreamReplyInput): Promise<Response> {
    const latestText = extractMessageText(input.message.content)
    if (!latestText) {
      throw new ValidationError("message content is required")
    }

    const title = buildThreadTitle(latestText)

    // Validate existing thread access
    if (input.threadId) {
      const existingThread = await this.repository.getThread(input.threadId, input.user.id, input.projectId)
      if (!existingThread) {
        throw new NotFoundError("OpenUI chat thread")
      }
    }

    // Persist user message
    const userEntry = await this.repository.appendMessage({
      threadId: input.threadId,
      userId: input.user.id,
      projectId: input.projectId,
      title,
      role: "user",
      content: input.message.content,
    })

    // Assemble RAG context for structured insights
    let context = null
    if (latestText) {
      try {
        context = await aiSearchRAGService.assembleContext(
          {
            query: latestText,
            limit: 10,
            offset: 0,
            sortBy: "relevance",
            includeRelationships: true,
            relationshipDepth: 2,
            includeKnowledgeBase: true,
            maxContextItems: 8,
            projectIds: [input.projectId],
          },
          input.user.id
        )
      } catch (error) {
        logger.warn("[OPENUI-CHAT] Context assembly failed", {
          projectId: input.projectId,
          userId: input.user.id,
          threadId: input.threadId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Load fallback context if RAG returned nothing
    const fallbackProjectContext =
      !context || context.sources.length === 0
        ? await this.loadProjectContextFallback(input.projectId)
        : null

    // Determine best component type for this context
    const selectionContext: ComponentSelectionContext = {
      prompt: latestText,
      dataPoints: context?.sources.length || 0,
      domainContext: fallbackProjectContext?.framework || undefined,
    }

    const componentType = selectComponentType(selectionContext)

    // Build structured payload
    const assistantPayload = buildAssistantPayload({
      projectId: input.projectId,
      threadId: userEntry?.thread.id ?? input.threadId ?? null,
      prompt: latestText,
      componentType,
      contextPrompt: context?.contextPrompt,
      sourceCount: context?.sources.length ?? 0,
      fallbackProjectContext,
    })

    // Persist assistant message
    await this.repository.appendMessage({
      threadId: userEntry?.thread.id ?? input.threadId,
      userId: input.user.id,
      projectId: input.projectId,
      title,
      role: "assistant",
      content: assistantPayload,
    })

    return new Response(createSsePayload(assistantPayload), {
      status: 200,
      headers: {
        "cache-control": "no-cache",
        connection: "keep-alive",
        "content-type": "text/event-stream",
      },
    })
  }
}

/**
 * Helper: Extract text from message content
 */
export function extractMessageText(content: OpenUIChatJson): string {
  if (typeof content === "string") {
    return content.trim()
  }

  if (typeof content === "object" && content !== null && !Array.isArray(content)) {
    const obj = content as Record<string, OpenUIChatJson>
    if (obj.text && typeof obj.text === "string") {
      return obj.text.trim()
    }
  }

  return ""
}

/**
 * Helper: Build thread title from prompt
 */
function buildThreadTitle(prompt: string): string {
  return prompt.split("\n")[0].slice(0, 100) || "Untitled"
}

/**
 * Helper: Create SSE-formatted payload
 */
function createSsePayload(payload: OpenUIChatJson): string {
  return `event: message\ndata: ${JSON.stringify(payload)}\n\n`
}

/**
 * Helper: Build fallback synopsis when RAG context is unavailable
 */
function buildFallbackSynopsis(
  fallbackProjectContext: ProjectContextFallback | null | undefined,
  prompt: string
): string {
  if (!fallbackProjectContext) {
    return "No supporting context available."
  }

  const description = fallbackProjectContext.description?.trim() || "No description available."
  const framework = fallbackProjectContext.framework?.trim() || "Framework not set"

  return [
    `Project: ${fallbackProjectContext.name}`,
    `Framework: ${framework}`,
    `Description: ${description}`,
    `Requested: ${prompt}`,
  ].join("\n")
}

/**
 * Helper: Load project context fallback
 */
async function defaultProjectContextFallbackLoader(projectId: string): Promise<ProjectContextFallback | null> {
  try {
    const result = await pool.query(
      `SELECT name, description, framework FROM projects WHERE id = $1`,
      [projectId]
    )
    if (result.rows.length === 0) {
      return null
    }
    const row = result.rows[0]
    return {
      name: row.name,
      description: row.description,
      framework: row.framework,
    }
  } catch (error) {
    logger.error("[OPENUI-CHAT] Failed to load project context fallback", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Helper: Build intelligent assistant payload
 */
function buildAssistantPayload(input: {
  projectId: string
  threadId: string | null
  prompt: string
  componentType: string
  contextPrompt?: string
  sourceCount: number
  fallbackProjectContext?: ProjectContextFallback | null
}): OpenUIChatJson {
  const synopsis =
    input.contextPrompt && !input.contextPrompt.startsWith("No internal ADPA search context was found")
      ? input.contextPrompt.slice(0, 500)
      : buildFallbackSynopsis(input.fallbackProjectContext, input.prompt)

  // Build component-based payload
  const payload: ComponentPayload = {
    type: "component",
    component: input.componentType as any,
    props: {
      title: `${input.componentType} view`,
      projectId: input.projectId,
      threadId: input.threadId,
      prompt: input.prompt,
      supportingEvidence: input.sourceCount,
      synopsis,
    },
    metadata: {
      supportingEvidence: input.sourceCount,
      prompt: input.prompt,
      synopsis,
    },
  }

  return payload
}
