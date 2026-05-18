import type { AuthenticatedUser } from "@/lib/auth-utils"
import { buildOpenUISystemPrompt, buildOpenUIUserMessage } from "@/lib/openui/systemPrompt"
import { pool } from "../../database/connection"
import { NotFoundError, ValidationError } from "../../middleware/errorHandler"
import aiSearchRAGService from "../../services/aiSearchRAGService"
import { logger } from "../../utils/logger"
import { OpenUIChatRepository, type OpenUIChatJson, type OpenUIChatThreadSummary, type OpenUIChatThread } from "./OpenUIChatRepository"
import { google } from "@ai-sdk/google"
import { streamText } from "ai"

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
  documentId?: string
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

    const title = buildThreadTitle(latestText)

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

    // Load document content if a specific document is requested
    let documentContext: DocumentContext | null = null
    if (input.documentId) {
      documentContext = await loadDocumentContext(input.documentId, input.projectId)
      if (documentContext) {
        logger.info("[OPENUI-CHAT] Document context loaded", {
          documentId: input.documentId,
          documentName: documentContext.name,
          contentLength: documentContext.content.length,
        })
      }
    }

    // Run RAG if no document is attached
    let ragContext: string | undefined
    if (!documentContext && latestText) {
      try {
        const context = await aiSearchRAGService.assembleContext(
          {
            query: latestText,
            limit: 12,
            offset: 0,
            sortBy: "relevance",
            includeRelationships: true,
            relationshipDepth: 2,
            includeKnowledgeBase: true,
            maxContextItems: 10,
            projectIds: [input.projectId],
          },
          input.user.id
        )
        if (context?.contextPrompt && !context.contextPrompt.startsWith("No internal ADPA search context")) {
          ragContext = context.contextPrompt
        }
      } catch (error) {
        logger.warn("[OPENUI-CHAT] RAG context assembly failed", {
          projectId: input.projectId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Load project fallback for context when no document/RAG
    let fallbackProjectContext: ProjectContextFallback | null = null
    if (!documentContext && !ragContext) {
      fallbackProjectContext = await this.loadProjectContextFallback(input.projectId)
    }

    const threadId = userEntry?.thread.id ?? input.threadId ?? null

    // Build the system prompt and user message
    const systemPrompt = buildOpenUISystemPrompt({
      documentName: documentContext?.name,
      documentType: documentContext?.templateName ?? undefined,
    })

    const userMessage = buildOpenUIUserMessage({
      prompt: latestText,
      documentContent: documentContext?.content,
      documentName: documentContext?.name,
      ragContext,
      projectName: fallbackProjectContext?.name,
      projectDescription: fallbackProjectContext?.description ?? undefined,
    })

    // Stream OpenUI Lang from the LLM
    logger.info("[OPENUI-CHAT] Streaming OpenUI Lang from LLM", {
      projectId: input.projectId,
      documentId: input.documentId,
      hasDocumentContext: !!documentContext,
      hasRagContext: !!ragContext,
      contentLength: documentContext?.content?.length ?? 0,
    })

    try {
      const result = await streamText({
        model: google("gemini-2.0-flash"),
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        maxTokens: 8192,
        temperature: 0.1,
      })

      // Accumulate the full response to save to DB after streaming
      let fullResponse = ""

      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              fullResponse += chunk
              // Stream each chunk as SSE text event
              const sseChunk = `event: text\ndata: ${JSON.stringify({ text: chunk, threadId })}\n\n`
              controller.enqueue(encoder.encode(sseChunk))
            }
            // Send done event with final threadId
            const doneEvent = `event: done\ndata: ${JSON.stringify({ threadId, length: fullResponse.length })}\n\n`
            controller.enqueue(encoder.encode(doneEvent))
            controller.close()

            // Persist the full assistant response (OpenUI Lang text) to DB
            try {
              await new OpenUIChatRepository().appendMessage({
                threadId,
                userId: input.user.id,
                projectId: input.projectId,
                title,
                role: "assistant",
                content: fullResponse,
              })
              logger.info("[OPENUI-CHAT] Saved OpenUI Lang response to DB", {
                threadId,
                responseLength: fullResponse.length,
              })
            } catch (dbError) {
              logger.warn("[OPENUI-CHAT] Failed to save assistant response to DB", {
                error: dbError instanceof Error ? dbError.message : String(dbError),
              })
            }
          } catch (streamError) {
            logger.error("[OPENUI-CHAT] LLM stream error", {
              error: streamError instanceof Error ? streamError.message : String(streamError),
            })
            const errEvent = `event: error\ndata: ${JSON.stringify({ message: "LLM stream failed" })}\n\n`
            controller.enqueue(encoder.encode(errEvent))
            controller.close()
          }
        },
      })

      return new Response(stream, {
        status: 200,
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream",
          "x-thread-id": threadId ?? "",
        },
      })
    } catch (error) {
      logger.error("[OPENUI-CHAT] Failed to start LLM stream", {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
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

function buildThreadTitle(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, " ").trim()
  if (!normalized) return "New thread"
  return normalized.slice(0, 80)
}

function isThreadNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message === "OpenUI chat thread not found"
}

type DocumentContext = {
  name: string
  content: string
  templateName: string | null
  framework: string | null
}

async function loadDocumentContext(documentId: string, projectId: string): Promise<DocumentContext | null> {
  try {
    const result = await pool.query<{
      name: string
      content: string | null
      template_name: string | null
      template_framework: string | null
    }>(
      `SELECT d.name, d.content, t.name AS template_name, t.framework AS template_framework
       FROM documents d
       LEFT JOIN templates t ON t.id = d.template_id
       WHERE d.id = $1 AND d.project_id = $2 AND d.deleted_at IS NULL
       LIMIT 1`,
      [documentId, projectId]
    )
    const row = result.rows[0]
    if (!row) return null
    const rawContent = row.content
    const text = typeof rawContent === "string"
      ? rawContent
      : rawContent != null
        ? JSON.stringify(rawContent)
        : ""

    // Allow up to 24,000 chars (~6,000 tokens) — enough for a full charter
    const TRUNCATE_AT = 24_000
    const truncated = text.length > TRUNCATE_AT
      ? text.slice(0, TRUNCATE_AT) + "\n\n[...content truncated for context window...]"
      : text

    return {
      name: row.name,
      content: truncated,
      templateName: row.template_name ?? null,
      framework: row.template_framework ?? null,
    }
  } catch (error) {
    logger.warn("[OPENUI-CHAT] Document context lookup failed", {
      documentId,
      projectId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function defaultProjectContextFallbackLoader(projectId: string): Promise<ProjectContextFallback | null> {
  try {
    const result = await pool.query<{
      name: string
      description: string | null
      framework: string | null
    }>(
      `SELECT name, description, framework FROM projects WHERE id = $1`,
      [projectId]
    )
    const row = result.rows[0]
    if (!row) return null
    return { name: row.name, description: row.description, framework: row.framework }
  } catch (error) {
    logger.warn("[OPENUI-CHAT] Project context fallback lookup failed", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
