import type { Pool, PoolClient } from "pg"
<<<<<<< Updated upstream
import { pool } from "../../database/connection"
=======
import { getInternalPool, pool } from "../../database/connection"

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">
type ClientQueryable = Pick<PoolClient, "query" | "release">
type TransactionCapable = Pick<Pool, "query" | "connect"> | ClientQueryable
type TransactionMode = "transaction" | "savepoint"
>>>>>>> Stashed changes

export type OpenUIChatJson =
  | null
  | boolean
  | number
  | string
  | OpenUIChatJson[]
  | { [key: string]: OpenUIChatJson }

type ThreadRow = {
  id: string
  user_id: string
  project_id: string
  title: string
  created_at: Date
  updated_at: Date
}

type MessageRow = {
  id: string
  thread_id: string
  user_id: string
  role: string
  content: OpenUIChatJson
  created_at: Date
}

export type OpenUIChatThreadSummary = {
  id: string
<<<<<<< Updated upstream
  userId: string
  projectId: string
  title: string
=======
  threadId: string
  userId: string
  projectId: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export type OpenUIChatMessage = {
  id: string
  threadId: string
  userId: string
  role: string
  content: OpenUIChatJson
  createdAt: Date
}

export class OpenUIChatRepository {
  // ... (rest of the class implementation remains, ensure no conflict markers remain)
}
<<<<<<< HEAD
  createdAt: string
  updatedAt: string
}

export type OpenUIChatThreadSummary = OpenUIChatThread

    createdAt: Date
=======
>>>>>>> Stashed changes
  createdAt: Date
  updatedAt: Date
}

export type OpenUIChatMessage = {
  id: string
  threadId: string
  userId: string
  role: string
  content: OpenUIChatJson
  createdAt: Date
}

export type OpenUIChatThread = OpenUIChatThreadSummary & {
  messages: OpenUIChatMessage[]
}

export class OpenUIChatRepository {
  async listThreads(userId: string, projectId: string, client?: PoolClient): Promise<OpenUIChatThreadSummary[]> {
    const c = client || pool
    const result = await c.query<ThreadRow>(
      `SELECT id, user_id, project_id, title, created_at, updated_at
       FROM openui_chat_threads
       WHERE user_id = $1 AND project_id = $2
       ORDER BY updated_at DESC`,
      [userId, projectId]
    )
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getThread(threadId: string, userId: string, projectId: string, client?: PoolClient): Promise<OpenUIChatThread | null> {
    const c = client || pool
    const threadResult = await c.query<ThreadRow>(
      `SELECT id, user_id, project_id, title, created_at, updated_at
       FROM openui_chat_threads
       WHERE id = $1 AND user_id = $2 AND project_id = $3`,
      [threadId, userId, projectId]
    )
    if (threadResult.rows.length === 0) return null

    const row = threadResult.rows[0]
    
    const messagesResult = await c.query<MessageRow>(
      `SELECT id, thread_id, user_id, role, content, created_at
       FROM openui_chat_messages
       WHERE thread_id = $1
       ORDER BY created_at ASC`,
      [threadId]
    )
    
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: messagesResult.rows.map(m => ({
        id: m.id,
        threadId: m.thread_id,
        userId: m.user_id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at
      }))
    }
  }

  async appendMessage(input: {
    threadId?: string | null
    userId: string
    projectId: string
    title: string
    role: string
    content: OpenUIChatJson
  }): Promise<{ thread: OpenUIChatThreadSummary; message: OpenUIChatMessage }> {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      let threadId = input.threadId
      let threadRow: ThreadRow
      let projectId = input.projectId

      // Workaround for global chat passing "default" which violates UUID syntax and foreign key
      if (projectId === "default" || projectId === "test") {
        try {
          const projResult = await client.query<{ id: string }>('SELECT id FROM projects LIMIT 1')
          if (projResult.rowCount && projResult.rowCount > 0) {
            projectId = projResult.rows[0].id
          }
        } catch (err) {
          console.warn("[OpenUIChatRepository] Failed to fetch fallback project ID:", err)
        }
      }

      if (threadId) {
        const threadResult = await client.query<ThreadRow>(
          `UPDATE openui_chat_threads
           SET updated_at = NOW()
           WHERE id = $1 AND user_id = $2 AND project_id = $3
           RETURNING *`,
          [threadId, input.userId, projectId]
        )
        if (threadResult.rows.length === 0) {
          throw new Error("OpenUI chat thread not found")
        }
        threadRow = threadResult.rows[0]
      } else {
        const threadResult = await client.query<ThreadRow>(
          `INSERT INTO openui_chat_threads (user_id, project_id, title)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [input.userId, projectId, input.title]
        )
        threadRow = threadResult.rows[0]
        threadId = threadRow.id
      }
      
      const messageResult = await client.query<MessageRow>(
        `INSERT INTO openui_chat_messages (thread_id, user_id, role, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [threadId, input.userId, input.role, JSON.stringify(input.content)]
      )
      
      await client.query("COMMIT")
      
      const m = messageResult.rows[0]
      return {
        thread: {
          id: threadRow.id,
          userId: threadRow.user_id,
          projectId: threadRow.project_id,
          title: threadRow.title,
          createdAt: threadRow.created_at,
          updatedAt: threadRow.updated_at
        },
        message: {
          id: m.id,
          threadId: m.thread_id,
          userId: m.user_id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at
        }
      }
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  }
}
