/**
 * OpenUI Chat Controller
 * HTTP endpoints for chat functionality
 */

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

  /**
   * POST /api/v1/openui-chat/chat
   * Send a message and get an intelligent component-based response
   */
  static async chat(req: Request, res: Response) {
    const user = (req as any).user as AuthenticatedUser
    const { projectId, threadId, messages } = req.body

    if (!projectId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "projectId and messages array are required" })
    }

    // Get the latest user message
    const submittedMessage = getSubmittedUserMessage(messages)
    if (!submittedMessage) {
      return res.status(400).json({ error: "The latest message must be a user message" })
    }

    const messageText = extractMessageText(submittedMessage.content)
    if (!messageText) {
      return res.status(400).json({ error: "message content is required" })
    }

    // Check access
    const hasAccess = await userHasProjectAccess(pool, user, projectId)
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" })
    }

    try {
      const streamResponse = await this.service.streamReply({
        user,
        projectId,
        threadId,
        message: submittedMessage,
      })

      await pipeWebResponseToExpress(streamResponse, res)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const statusCode = message.includes("not found") ? 404 : 500

      return res.status(statusCode).json({
        error: message,
      })
    }
  }

  /**
   * GET /api/v1/openui-chat/threads
   * List all threads for a project
   */
  static async listThreads(req: Request, res: Response) {
    const user = (req as any).user as AuthenticatedUser
    const { projectId } = req.query

    if (!projectId || typeof projectId !== "string") {
      return res.status(400).json({ error: "projectId is required" })
    }

    // Check access
    const hasAccess = await userHasProjectAccess(pool, user, projectId)
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" })
    }

    try {
      const threads = await this.service.listThreads(user.id, projectId)
      return res.json({ threads })
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to list threads",
      })
    }
  }

  /**
   * GET /api/v1/openui-chat/threads/:threadId
   * Get a specific thread with all messages
   */
  static async getThread(req: Request, res: Response) {
    const user = (req as any).user as AuthenticatedUser
    const { threadId } = req.params
    const { projectId } = req.query

    if (!projectId || typeof projectId !== "string") {
      return res.status(400).json({ error: "projectId is required" })
    }

    // Check access
    const hasAccess = await userHasProjectAccess(pool, user, projectId)
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" })
    }

    try {
      const thread = await this.service.getThread(user.id, projectId, threadId)
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" })
      }
      return res.json(thread)
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get thread",
      })
    }
  }
}

/**
 * Helper: Extract the latest user message from the conversation
 */
function getSubmittedUserMessage(messages: OpenUIChatRequestMessage[]): OpenUIChatUserMessage | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null
  }

  const latest = messages[messages.length - 1]

  if (!latest || typeof latest !== "object" || latest.role !== "user") {
    return null
  }

  return latest as OpenUIChatUserMessage
}
