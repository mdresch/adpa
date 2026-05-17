<<<<<<< HEAD
/**
 * OpenUI Chat Repository
 * Handles persistence of threads and messages
 */

import type { Pool, PoolClient } from "pg"
import { getInternalPool, pool } from "../../database/connection"

export type OpenUIChatJson =
  | string
  | number
  | boolean
  | null
  | OpenUIChatJson[]
  | { [key: string]: OpenUIChatJson }

export interface OpenUIChatThread {
=======
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
    createdAt: Date
    updatedAt: Date
  userId: string
  projectId: string
  title: string
<<<<<<< HEAD
  createdAt: string
  updatedAt: string
}

export type OpenUIChatThreadSummary = OpenUIChatThread

    createdAt: Date
=======
  createdAt: Date
  updatedAt: Date
}

export type OpenUIChatMessage = {
>>>>>>> adpa-project-charter
  id: string
  threadId: string
  userId: string
  role: string
  content: OpenUIChatJson
<<<<<<< HEAD
  createdAt: string
}

export class OpenUIChatRepository {
  /**
   * List all threads for a user in a specific project
   */
  async listThreads(userId: string, projectId: string, client?: PoolClient): Promise<OpenUIChatThreadSummary[]> {
    const c = client || pool
    const result = await c.query(
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
        id: row.id,
        threadId: row.thread_id,
        userId: row.user_id,
        role: row.role,
        createdAt: Date
        updatedAt: Date
      }

      export type OpenUIChatMessage = {
    content: OpenUIChatJson
  }): Promise<{ thread: OpenUIChatThread; message: OpenUIChatMessage }> {
    const client = await pool.connect()
    try {
      await client.query("BEGIN")

      userId: threadRow.user_id,
