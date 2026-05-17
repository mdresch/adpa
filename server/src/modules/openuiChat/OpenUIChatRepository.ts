import type { Pool, PoolClient } from "pg"

import { getInternalPool, pool } from "../../database/connection"

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">
type ClientQueryable = Pick<PoolClient, "query" | "release">
type TransactionCapable = Pick<Pool, "query" | "connect"> | ClientQueryable
type TransactionMode = "transaction" | "savepoint"

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

export type OpenUIChatThread = OpenUIChatThreadSummary & {
  messages: OpenUIChatMessage[]
}

export type AppendMessageInput = {
  threadId?: string
  userId: string
  projectId: string
  title?: string
  role: string
  content: OpenUIChatJson
}

export type AppendMessageResult = {
  thread: OpenUIChatThreadSummary
  message: OpenUIChatMessage
}

export class OpenUIChatRepository {
  constructor(private readonly db: TransactionCapable = pool) {}

  async listThreads(userId: string, projectId: string): Promise<OpenUIChatThreadSummary[]> {
    return this.withConnection(async (db) => {
      const result = await db.query<ThreadRow>(
        `
          SELECT id, user_id, project_id, title, created_at, updated_at
          FROM public.openui_chat_threads
          WHERE user_id = $1 AND project_id = $2
          ORDER BY updated_at DESC, created_at DESC
        `,
        [userId, projectId]
      )

      return result.rows.map(mapThreadRow)
    })
  }

  async appendMessage(input: AppendMessageInput): Promise<AppendMessageResult> {
    return this.withTransaction(async (client) => {
      const thread = input.threadId
        ? await this.requireThread(client, input.threadId, input.userId, input.projectId)
        : await this.createThread(client, input.userId, input.projectId, input.title)

      const messageResult = await client.query<MessageRow>(
        `
          INSERT INTO public.openui_chat_messages (thread_id, user_id, role, content)
          VALUES ($1, $2, $3, $4::jsonb)
          RETURNING id, thread_id, user_id, role, content, created_at
        `,
        [thread.id, input.userId, input.role, JSON.stringify(input.content)]
      )

      const updatedThreadResult = await client.query<ThreadRow>(
        `
          UPDATE public.openui_chat_threads
          SET title = COALESCE($2, title), updated_at = NOW()
          WHERE id = $1
          RETURNING id, user_id, project_id, title, created_at, updated_at
        `,
        [thread.id, normalizeTitle(input.title)]
      )

      return {
        thread: mapThreadRow(updatedThreadResult.rows[0]),
        message: mapMessageRow(messageResult.rows[0]),
      }
    })
  }

  async getThread(threadId: string, userId: string, projectId: string): Promise<OpenUIChatThread | null> {
    return this.withConnection(async (db) => {
      const threadResult = await db.query<ThreadRow>(
        `
          SELECT id, user_id, project_id, title, created_at, updated_at
          FROM public.openui_chat_threads
          WHERE id = $1 AND user_id = $2 AND project_id = $3
        `,
        [threadId, userId, projectId]
      )

      const threadRow = threadResult.rows[0]
      if (!threadRow) {
        return null
      }

      const messagesResult = await db.query<MessageRow>(
        `
          SELECT id, thread_id, user_id, role, content, created_at
          FROM public.openui_chat_messages
          WHERE thread_id = $1
          ORDER BY created_at ASC, id ASC
        `,
        [threadId]
      )

      return {
        ...mapThreadRow(threadRow),
        messages: messagesResult.rows.map(mapMessageRow),
      }
    })
  }

  private async createThread(db: Queryable, userId: string, projectId: string, title?: string): Promise<OpenUIChatThreadSummary> {
    const result = await db.query<ThreadRow>(
      `
        INSERT INTO public.openui_chat_threads (user_id, project_id, title)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, project_id, title, created_at, updated_at
      `,
      [userId, projectId, normalizeTitle(title) ?? "New thread"]
    )

    return mapThreadRow(result.rows[0])
  }

  private async requireThread(db: Queryable, threadId: string, userId: string, projectId: string): Promise<OpenUIChatThreadSummary> {
    const result = await db.query<ThreadRow>(
      `
        SELECT id, user_id, project_id, title, created_at, updated_at
        FROM public.openui_chat_threads
        WHERE id = $1 AND user_id = $2 AND project_id = $3
      `,
      [threadId, userId, projectId]
    )

    const thread = result.rows[0]
    if (!thread) {
      throw new Error("OpenUI chat thread not found")
    }

    return mapThreadRow(thread)
  }

  private async withConnection<T>(callback: (db: Queryable) => Promise<T>): Promise<T> {
    const client = await this.getClient()

    try {
      return callback(client)
    } finally {
      if (hasConnect(this.db)) {
        client.release()
      }
    }
  }

  private async withTransaction<T>(callback: (client: Queryable) => Promise<T>): Promise<T> {
    const client = await this.getClient()
    const mode = this.getTransactionMode()
    const savepointName = "openui_chat_append_message"

    try {
      if (mode === "savepoint") {
        await client.query(`SAVEPOINT ${savepointName}`)
      } else {
        await client.query("BEGIN")
      }

      const result = await callback(client)

      if (mode === "savepoint") {
        await client.query(`RELEASE SAVEPOINT ${savepointName}`)
      } else {
        await client.query("COMMIT")
      }

      return result
    } catch (error) {
      if (mode === "savepoint") {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`)
      } else {
        await client.query("ROLLBACK")
      }

      throw error
    } finally {
      if (hasConnect(this.db)) {
        client.release()
      }
    }
  }

  private async getClient(): Promise<ClientQueryable> {
    if (hasConnect(this.db)) {
      return this.db.connect()
    }

    return this.db
  }

  private getTransactionMode(): TransactionMode {
    if (isClientQueryable(this.db)) {
      return "savepoint"
    }

    if (this.db === pool) {
      const current = getInternalPool()
      if (current && isClientQueryable(current)) {
        return "savepoint"
      }
    }

    return "transaction"
  }
}

function hasConnect(db: TransactionCapable): db is Pick<Pool, "query" | "connect"> {
  return "connect" in db
}

function isClientQueryable(db: unknown): db is ClientQueryable {
  return Boolean(db) && typeof db === "object" && "release" in db && "query" in db
}

function normalizeTitle(title?: string): string | null {
  if (!title) {
    return null
  }

  const trimmed = title.trim()
  return trimmed.length > 0 ? trimmed : null
}

function mapThreadRow(row: ThreadRow): OpenUIChatThreadSummary {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessageRow(row: MessageRow): OpenUIChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}