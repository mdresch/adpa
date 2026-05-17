import type { AuthenticatedUser } from "@/lib/auth-utils"

import { pool } from "../../database/connection"
import { NotFoundError, ValidationError } from "../../middleware/errorHandler"
import aiSearchRAGService from "../../services/aiSearchRAGService"
import { logger } from "../../utils/logger"

import {
  OpenUIChatRepository,
  type OpenUIChatJson,
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
  reportMode: boolean
}

type ProjectContextFallback = {
  name: string
  description: string | null
  framework: string | null
}

export class OpenUIChatService {
  constructor(
    private readonly repository: OpenUIChatRepository = new OpenUIChatRepository(),
    private readonly loadProjectContextFallback: (projectId: string) => Promise<ProjectContextFallback | null> =
      defaultProjectContextFallbackLoader
  ) {}

  async listThreads(userId: string, projectId: string): Promise<OpenUIChatThreadSummary[]> {
    return this.repository.listThreads(userId, projectId)
  }

  async getThread(userId: string, projectId: string, threadId: string): Promise<OpenUIChatThread | null> {
    return this.repository.getThread(threadId, userId, projectId)
  }

  async streamReply(input: StreamReplyInput): Promise<Response> {
    const latestText = extractMessageText(input.message.content)
    if (!latestText) {
      throw new ValidationError("message content is required")
    }

    const title = buildThreadTitle(latestText, input.reportMode)

    if (input.threadId) {
      const existingThread = await this.repository.getThread(input.threadId, input.user.id, input.projectId)
      if (!existingThread) {
        throw new NotFoundError("OpenUI chat thread")
      }
    }

    const userEntry = await this.appendMessageOrThrowNotFound({
      threadId: input.threadId,
      userId: input.user.id,
      projectId: input.projectId,
      title,
      role: input.message.role,
      content: input.message.content,
    })

    let context = null
    if (latestText) {
      try {
        context = await aiSearchRAGService.assembleContext(
          {
            query: latestText,
            limit: input.reportMode ? 12 : 10,
            offset: 0,
            sortBy: "relevance",
            includeRelationships: true,
            relationshipDepth: 2,
            includeKnowledgeBase: true,
            maxContextItems: input.reportMode ? 10 : 8,
            projectIds: [input.projectId],
          },
          input.user.id
        )
      } catch (error) {
        logger.warn("[OPENUI-CHAT] Assisted context assembly failed", {
          projectId: input.projectId,
          userId: input.user.id,
          threadId: input.threadId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const fallbackProjectContext =
      input.reportMode && (!context || context.sources.length === 0)
        ? await this.loadProjectContextFallback(input.projectId)
        : null

    const assistantPayload = buildAssistantPayload({
      projectId: input.projectId,
      threadId: userEntry?.thread.id ?? input.threadId ?? null,
      prompt: latestText,
      reportMode: input.reportMode,
      contextPrompt: context?.contextPrompt,
      sourceCount: context?.sources.length ?? 0,
      fallbackProjectContext,
    })

    await this.appendMessageOrThrowNotFound({
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

  private async appendMessageOrThrowNotFound(
    input: Parameters<OpenUIChatRepository["appendMessage"]>[0]
  ): ReturnType<OpenUIChatRepository["appendMessage"]> {
    try {
      return await this.repository.appendMessage(input)
    } catch (error) {
      if (isThreadNotFoundError(error)) {
        throw new NotFoundError("OpenUI chat thread")
      }

      throw error
    }
  }
}

export function extractMessageText(content: OpenUIChatJson): string {
  if (typeof content === "string") {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => extractMessageText(part))
      .filter((value) => value.length > 0)
      .join(" ")
      .trim()
  }

  if (content && typeof content === "object") {
    const maybeText = (content as Record<string, OpenUIChatJson>).text
    if (typeof maybeText === "string") {
      return maybeText.trim()
    }

    const maybeContent = (content as Record<string, OpenUIChatJson>).content
    if (typeof maybeContent === "string") {
      return maybeContent.trim()
    }
  }

  return ""
}

function buildThreadTitle(prompt: string, reportMode: boolean): string {
  const normalized = prompt.replace(/\s+/g, " ").trim()
  if (!normalized) {
    return reportMode ? "Project report" : "New thread"
  }

  return normalized.slice(0, 80)
}

function isThreadNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === "OpenUI chat thread not found"
}

function buildAssistantPayload(input: {
  projectId: string
  threadId: string | null
  prompt: string
  reportMode: boolean
  contextPrompt?: string
  sourceCount: number
  fallbackProjectContext?: ProjectContextFallback | null
}): OpenUIChatJson {
  const synopsis =
    input.contextPrompt && !input.contextPrompt.startsWith("No internal ADPA search context was found")
      ? input.contextPrompt.slice(0, 500)
      : buildFallbackSynopsis(input.fallbackProjectContext, input.prompt)

  if (input.reportMode) {
    return {
      type: "report",
      component: "ReportOverview",
      props: {
        title: "Project charter report",
        projectId: input.projectId,
        threadId: input.threadId,
        prompt: input.prompt,
        supportingEvidence: input.sourceCount,
        synopsis,
      },
    }
  }

  return {
    type: "text",
    text:
      input.contextPrompt && input.contextPrompt.length > 0
        ? `Project ${input.projectId}: ${input.contextPrompt.slice(0, 1200)}`
        : `Project ${input.projectId}: ${input.prompt || "No message provided."}`,
  }
}

function createSsePayload(payload: OpenUIChatJson): string {
  return `event: message\ndata: ${JSON.stringify(payload)}\n\n`
}

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
    `Requested report: ${prompt}`,
  ].join("\n")
}

async function defaultProjectContextFallbackLoader(projectId: string): Promise<ProjectContextFallback | null> {
  try {
    const result = await pool.query<{
      name: string
      description: string | null
      framework: string | null
    }>(
      `
        SELECT name, description, framework
        FROM public.projects
        WHERE id = $1
      `,
      [projectId]
    )

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return {
      name: row.name,
      description: row.description,
      framework: row.framework,
    }
  } catch (error) {
    logger.warn("[OPENUI-CHAT] Project context fallback lookup failed", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
