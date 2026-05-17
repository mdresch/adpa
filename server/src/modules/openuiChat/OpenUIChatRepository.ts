/**
 * OpenUI Chat Repository
 * Handles persistence of threads and messages
 */

import type { PoolClient } from "pg"
import { pool } from "../../database/connection"

export type OpenUIChatJson =
  | string
  | number
  | boolean
  | null
  | OpenUIChatJson[]
  | { [key: string]: OpenUIChatJson }

export interface OpenUIChatThread {
  id: string
  userId: string
  projectId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type OpenUIChatThreadSummary = OpenUIChatThread

export interface OpenUIChatMessage {
  id: string
  threadId: string
  userId: string
  role: string
  content: OpenUIChatJson
  createdAt: string
}

export class OpenUIChatRepository {
  /**
   * List all threads for a user in a specific project
   */
  async listThreads(userId: string, projectId: string, client?: PoolClient): Promise<OpenUIChatThreadSummary[]> {
    const c = client || pool
    const result = await c.query(
      `
      SELECT id, user_id, project_id, title, created_at, updated_at
      FROM openui_chat_threads
      WHERE user_id = $1 AND project_id = $2
      ORDER BY updated_at DESC
      `,
      [userId, projectId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * Get a specific thread with all messages
   */
  async getThread(threadId: string, userId: string, projectId: string, client?: PoolClient) {
    const c = client || pool

    const threadResult = await c.query(
      `
      SELECT id, user_id, project_id, title, created_at, updated_at
      FROM openui_chat_threads
      WHERE id = $1 AND user_id = $2 AND project_id = $3
      `,
      [threadId, userId, projectId]
    )

    if (threadResult.rows.length === 0) {
      return null
    }

    const threadRow = threadResult.rows[0]
    const messagesResult = await c.query(
      `
      SELECT id, thread_id, user_id, role, content, created_at
      FROM openui_chat_messages
      WHERE thread_id = $1
      ORDER BY created_at ASC
      `,
      [threadId]
    )

    return {
      id: threadRow.id,
      userId: threadRow.user_id,
      projectId: threadRow.project_id,
      title: threadRow.title,
      createdAt: threadRow.created_at,
      updatedAt: threadRow.updated_at,
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        threadId: row.thread_id,
        userId: row.user_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
      })),
    }
  }

  /**
   * Create or update a thread and append a message
   */
  async appendMessage(input: {
    threadId?: string
    userId: string
    projectId: string
    title: string
    role: string
    content: OpenUIChatJson
  }): Promise<{ thread: OpenUIChatThread; message: OpenUIChatMessage }> {
    const c = pool

    try {
      await c.query("BEGIN")

      let threadId = input.threadId

      if (!threadId) {
        // Create new thread
        const threadResult = await c.query(
          `
          INSERT INTO openui_chat_threads (user_id, project_id, title)
          VALUES ($1, $2, $3)
          RETURNING id, user_id, project_id, title, created_at, updated_at
          `,
          [input.userId, input.projectId, input.title]
        )
        threadId = threadResult.rows[0].id
      } else {
        // Update thread timestamp
        await c.query(
          `UPDATE openui_chat_threads SET updated_at = NOW() WHERE id = $1`,
          [threadId]
        )
      }

      // Append message
      const messageResult = await c.query(
        `
        INSERT INTO openui_chat_messages (thread_id, user_id, role, content)
        VALUES ($1, $2, $3, $4)
        RETURNING id, thread_id, user_id, role, content, created_at
        `,
        [threadId, input.userId, input.role, JSON.stringify(input.content)]
      )

      const messageRow = messageResult.rows[0]

      // Get updated thread
      const threadResult = await c.query(
        `
        SELECT id, user_id, project_id, title, created_at, updated_at
        FROM openui_chat_threads
        WHERE id = $1
        `,
        [threadId]
      )

      await c.query("COMMIT")

      const threadRow = threadResult.rows[0]
      return {
        thread: {
          id: threadRow.id,
          userId: threadRow.user_id,
          projectId: threadRow.project_id,
          title: threadRow.title,
          createdAt: threadRow.created_at,
          updatedAt: threadRow.updated_at,
        },
        message: {
          id: messageRow.id,
          threadId: messageRow.thread_id,
          userId: messageRow.user_id,
          role: messageRow.role,
          content: messageRow.content,
          createdAt: messageRow.created_at,
        },
      }
    } catch (error) {
      await c.query("ROLLBACK")
      throw error
    }
  }
}
