import type { AuthenticatedUser } from "@/lib/auth-utils"
import type { Request, Response } from "express"

import { pool } from "../../database/connection"
import { userHasProjectAccess } from "../../lib/project-access"
import { pipeWebResponseToExpress } from "../../utils/stream"

import {
  OpenUIChatService,
  extractMessageText,
  type OpenUIChatRequestMessage,
  type OpenUIChatUserMessage,
} from "./OpenUIChatService"

export class OpenUIChatController {
  static service = new OpenUIChatService()

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
      return res.status(400).json({ error: "The latest message must be a user message" })
    }

    if (!extractMessageText(submittedMessage.content)) {
      return res.status(400).json({ error: "message content is required" })
    }

    const hasAccess = await userHasProjectAccess(pool, user, projectId)
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" })
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

    const projectId = String(req.query.projectId || "").trim()
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" })
    }

    const hasAccess = await userHasProjectAccess(pool, user, projectId)
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" })
    }

    const threads = await this.service.listThreads(user.id, projectId)
    return res.json({ threads })
  }

  static async getThread(req: Request, res: Response) {
    const user = req.user as AuthenticatedUser | undefined
    if (!user?.id) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const projectId = String(req.query.projectId || "").trim()
    const threadId = String(req.params.id || "").trim()

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" })
    }

    if (!threadId) {
      return res.status(400).json({ error: "threadId is required" })
    }

    const hasAccess = await userHasProjectAccess(pool, user, projectId)
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" })
    }

    const thread = await this.service.getThread(user.id, projectId, threadId)
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" })
    }

    return res.json({ thread })
  }
}

function getSubmittedUserMessage(messages: OpenUIChatRequestMessage[]): OpenUIChatUserMessage | null {
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
