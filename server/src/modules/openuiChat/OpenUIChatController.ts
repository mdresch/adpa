/**
 * OpenUI Chat Controller
 * HTTP endpoints for chat functionality
 */
import {
  OpenUIChatService,
  extractMessageText,
  type OpenUIChatRequestMessage,
  type OpenUIChatUserMessage,
} from "./OpenUIChatService"

import type { Request, Response } from "express"
import type { AuthenticatedUser } from "../../lib/auth-utils"
import { pipeWebResponseToExpress } from "../../utils/stream"

export class OpenUIChatController {
  static service = new OpenUIChatService()

  /**
   * POST /api/v1/openui-chat/chat
   * Send a message and get an intelligent component-based response
   */
  static async chat(req: Request, res: Response) {
    const user = req.user as AuthenticatedUser | undefined
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { projectId, threadId, messages } = req.body as {
      projectId?: string
      threadId?: string
      messages?: OpenUIChatRequestMessage[]
    }

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" })
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages are required" })
    }
    const submittedMessage = getSubmittedUserMessage(messages)
    if (!submittedMessage) {
      return res.status(400).json({ error: "A user message is required as the last message" })
    }
    if (!extractMessageText(submittedMessage.content)) {
      return res.status(400).json({ error: "message content is required" })
    }

    const reportMode = determineReportMode(submittedMessage)
    const streamResponse = await this.service.streamReply({
      user,
      projectId,
      threadId,
      message: submittedMessage,
      reportMode,
    })

    await pipeWebResponseToExpress(streamResponse, res)
  }

  static async listThreads(req: Request, res: Response) {
    const user = req.user as AuthenticatedUser | undefined
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    try {
      const projectId = String(req.query.projectId || "").trim()
      if (!projectId) {
        return res.status(400).json({ error: "projectId is required" })
      }
      const threads = await this.service.listThreads(user.id, projectId)
      return res.json({ threads })
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to list threads",
      })
    }
  }

  static async getThread(req: Request, res: Response) {
    const user = req.user as AuthenticatedUser | undefined
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    try {
      const projectId = String(req.query.projectId || "").trim()
      const threadId = String(req.params.id || "").trim()
      if (!projectId) {
        return res.status(400).json({ error: "projectId is required" })
      }
      if (!threadId) {
        return res.status(400).json({ error: "threadId is required" })
      }
      const thread = await this.service.getThread(user.id, projectId, threadId)
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" })
      }
      return res.json({ thread })
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get thread",
      })
    }
  }
}

function getSubmittedUserMessage(messages: OpenUIChatRequestMessage[]): OpenUIChatUserMessage | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null
  }
  const submittedMessage = messages[messages.length - 1]
  if (!submittedMessage || submittedMessage.role !== "user") {
    return null
  }
  return submittedMessage as OpenUIChatUserMessage
}

function determineReportMode(message: OpenUIChatUserMessage): boolean {
  const content = message.content
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const flags = content as Record<string, unknown>
    if (flags.reportMode === true) {
      return true
    }
    if (typeof flags.intent === "string" && /^(report|charter)$/i.test(flags.intent)) {
      return true
    }
  }
  const haystack = extractMessageText(message.content).toLowerCase()
  return /\b(charter|report)\b/i.test(haystack)
}
