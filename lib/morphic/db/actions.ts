'use server'

import { and, asc, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import { db } from './index'
import { chats, messages, parts, aiProviders, aiModels, aiModelConfig, feedback, generateId } from './schema'
import { withOptionalRLS, withRLS } from './with-rls'
import type { UIMessage } from '@/lib/morphic/types/ai'
import type { PersistableUIMessage } from '@/lib/morphic/types/message-persistence'
import {
    buildUIMessageFromDB,
    mapUIMessagePartsToDBParts,
    mapUIMessageToDBMessage
} from '@/lib/morphic/utils/message-mapping'
import { perfLog, perfTime } from '@/lib/morphic/utils/perf-logging'
import { incrementDbOperationCount } from '@/lib/morphic/utils/perf-tracking'

import type { Chat, Message } from './schema'

/**
 * Create a new chat
 */
export async function createChat({
    id,
    title,
    userId,
    visibility = 'private'
}: {
    id: string
    title: string
    userId: string
    visibility?: 'public' | 'private'
}): Promise<Chat> {
    return withRLS(userId, async tx => {
        const [chat] = await tx
            .insert(chats)
            .values({
                id,
                title,
                userId,
                visibility
            })
            .returning()

        return chat
    })
}

/**
 * Get chat by ID with permission check
 */
export async function getChat(
    chatId: string,
    userId?: string
): Promise<Chat | null> {
    return withOptionalRLS(userId || null, async tx => {
        const [chat] = await (tx as any)
            .select()
            .from(chats)
            .where(eq(chats.id, chatId))
            .limit(1)

        if (!chat) {
            return null
        }

        if (chat.visibility === 'public') {
            return chat
        }

        if (chat.visibility === 'private' && userId && chat.userId === userId) {
            return chat
        }

        return null
    })
}

/**
 * Upsert a message with its parts
 */
export async function upsertMessage(
    message: PersistableUIMessage & { chatId: string },
    userId?: string
): Promise<Message> {
    const count = incrementDbOperationCount()
    perfLog(`DB - upsertMessage called - count: ${count}`)

    const executeFn = userId
        ? (callback: (tx: any) => Promise<Message>) => withRLS(userId, callback)
        : (callback: (tx: any) => Promise<Message>) => db.transaction(callback)

    const result = await executeFn(async tx => {
        const messageData = mapUIMessageToDBMessage(message)
        const [dbMessage] = await tx
            .insert(messages)
            .values(messageData)
            .onConflictDoUpdate({
                target: messages.id,
                set: { role: messageData.role, updatedAt: new Date() }
            })
            .returning()

        await tx.delete(parts).where(eq(parts.messageId, message.id))

        if (message.parts && message.parts.length > 0) {
            const dbParts = mapUIMessagePartsToDBParts(message.parts as any[], message.id)
            if (dbParts.length > 0) {
                await tx.insert(parts).values(dbParts)
            }
        }

        return dbMessage
    })

    return result
}

/**
 * Load chat messages with parts
 */
export async function loadChat(
    chatId: string,
    userId?: string
): Promise<UIMessage[]> {
    try {
        return await withOptionalRLS(userId || null, async (tx: any) => {
            const result = await tx.query.messages.findMany({
                where: eq(messages.chatId, chatId),
                with: {
                    parts: {
                        orderBy: [asc(parts.order)]
                    }
                },
                orderBy: [asc(messages.createdAt)]
            })

            return result.map((msg: any) => buildUIMessageFromDB(msg, msg.parts))
        })
    } catch (error) {
        console.error('[Morphic DB] loadChat failed; returning empty message list', {
            chatId,
            userId: userId ?? null,
            error
        })
        return []
    }
}

function isConnectionOrAuthFailure(error: any): boolean {
    const code = error?.code || error?.cause?.code
    if (typeof code === 'string') {
        return [
            'ECONNREFUSED',
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ENETUNREACH',
            '28P01'
        ].includes(code)
    }

    const message = String(error?.message || '')
    const causeMessage = String(error?.cause?.message || '')
    const combined = `${message} ${causeMessage}`.toLowerCase()
    return (
        combined.includes('password authentication failed') ||
        combined.includes('connection timeout') ||
        combined.includes('failed query')
    )
}

/**
 * Load chat with messages in a single query (optimized)
 */
export async function loadChatWithMessages(
    chatId: string,
    userId?: string
): Promise<(Chat & { messages: UIMessage[] }) | null> {
    const count = incrementDbOperationCount()
    perfLog(`DB - loadChatWithMessages called - count: ${count}`)

    try {
        return await withOptionalRLS(userId || null, async (tx: any) => {
            const chatResult = await tx
                .select()
                .from(chats)
                .where(eq(chats.id, chatId))
                .limit(1)

            const messagesResult = await tx.query.messages.findMany({
                where: eq(messages.chatId, chatId),
                with: {
                    parts: {
                        orderBy: [asc(parts.order)]
                    }
                },
                orderBy: [asc(messages.createdAt)]
            })

            const chat = chatResult[0]
            if (!chat) {
                return null
            }

            if (chat.visibility === 'private' && (!userId || chat.userId !== userId)) {
                return null
            }

            const uiMessages = messagesResult.map((msg: any) =>
                buildUIMessageFromDB(msg, msg.parts)
            )
            return { ...chat, messages: uiMessages }
        })
    } catch (error) {
        if (isConnectionOrAuthFailure(error)) {
            console.error('[Morphic DB] loadChatWithMessages degraded due to DB connectivity/auth issue', {
                chatId,
                userId: userId ?? null,
                code: error?.code || error?.cause?.code,
                message: error?.message || error?.cause?.message || String(error)
            })
            return null
        }

        console.error('[Morphic DB] loadChatWithMessages failed unexpectedly', {
            chatId,
            userId: userId ?? null,
            error
        })
        return null
    }
}

/**
 * Delete messages after a specific message
 */
export async function deleteMessagesAfter(
    chatId: string,
    messageId: string,
    userId?: string
): Promise<{ count: number }> {
    return withOptionalRLS(userId || null, async (tx: any) => {
        const [targetMessage] = await tx
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.id, messageId))
            .limit(1)

        if (!targetMessage) {
            return { count: 0 }
        }

        const messagesToDelete = await tx
            .select({ id: messages.id })
            .from(messages)
            .where(
                and(
                    eq(messages.chatId, chatId),
                    gt(messages.createdAt, targetMessage.createdAt)
                )
            )

        const messageIds = messagesToDelete.map((m: any) => m.id)

        if (messageIds.length > 0) {
            await tx.delete(messages).where(inArray(messages.id, messageIds))
        }

        return { count: messageIds.length }
    })
}

/**
 * Delete messages from a specific index
 */
export async function deleteMessagesFromIndex(
    chatId: string,
    messageId: string,
    userId?: string
): Promise<{ count: number }> {
    return withOptionalRLS(userId || null, async (tx: any) => {
        const allMessages = await tx
            .select({ id: messages.id, createdAt: messages.createdAt })
            .from(messages)
            .where(eq(messages.chatId, chatId))
            .orderBy(asc(messages.createdAt))

        const messageIndex = allMessages.findIndex((m: any) => m.id === messageId)

        if (messageIndex === -1) {
            return { count: 0 }
        }

        const messagesToDelete = allMessages.slice(messageIndex)
        const messageIds = messagesToDelete.map((m: any) => m.id)

        if (messageIds.length > 0) {
            await tx.delete(messages).where(inArray(messages.id, messageIds))
        }

        return { count: messageIds.length }
    })
}

/**
 * Get all chats for a user
 */
export async function getChats(userId: string): Promise<Chat[]> {
    return withRLS(userId, async tx => {
        return tx
            .select({
                id: chats.id,
                createdAt: chats.createdAt,
                updatedAt: chats.updatedAt,
                title: chats.title,
                userId: chats.userId,
                visibility: chats.visibility
            })
            .from(chats)
            .where(eq(chats.userId, userId))
            .orderBy(desc(chats.createdAt))
    })
}

/**
 * Get chats with pagination
 */
export async function getChatsPage(
    userId: string,
    limit = 20,
    offset = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
    try {
        return withRLS(userId, async tx => {
            const results = await tx
                .select({
                    id: chats.id,
                    createdAt: chats.createdAt,
                    updatedAt: chats.updatedAt,
                    title: chats.title,
                    userId: chats.userId,
                    visibility: chats.visibility
                })
                .from(chats)
                .where(eq(chats.userId, userId))
                .orderBy(desc(chats.createdAt))
                .limit(limit)
                .offset(offset)
            console.log(`[DB:getChatsPage] Found ${results.length} chats`)

            const nextOffset = results.length === limit ? offset + limit : null

            return {
                chats: results,
                nextOffset
            }
        })
    } catch (error) {
        console.error('Error fetching chat page for userId:', userId, error)
        return { chats: [], nextOffset: null }
    }
}

/**
 * Delete a chat
 */
export async function deleteChat(
    chatId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        return withRLS(userId, async tx => {
            const [chat] = await (tx as any)
                .select()
                .from(chats)
                .where(eq(chats.id, chatId))
                .limit(1)

            if (!chat || chat.userId !== userId) {
                return { success: false, error: 'Unauthorized' }
            }

            await tx.delete(chats).where(eq(chats.id, chatId))

            return { success: true }
        })
    } catch (error) {
        console.error('Error deleting chat:', error)
        return { success: false, error: 'Failed to delete chat' }
    }
}

/**
 * Clear all chats (custom legacy support)
 */
export async function clearChats(userId: string) {
    return await db.delete(chats).where(eq(chats.userId, userId)).returning()
}

/**
 * Update chat visibility
 */
export async function updateChatVisibility(
    chatId: string,
    userId: string,
    visibility: 'public' | 'private'
): Promise<Chat | null> {
    return withRLS(userId, async tx => {
        const chat = await getChat(chatId, userId)
        if (!chat || chat.userId !== userId) {
            return null
        }

        const [updatedChat] = await (tx as any)
            .update(chats)
            .set({ visibility })
            .where(eq(chats.id, chatId))
            .returning()

        return updatedChat
    })
}

/**
 * Update chat title
 */
export async function updateChatTitle(
    chatId: string,
    title: string,
    userId?: string
): Promise<Chat | null> {
    return withOptionalRLS(userId || null, async (tx: any) => {
        const [updatedChat] = await tx
            .update(chats)
            .set({ title })
            .where(eq(chats.id, chatId))
            .returning()

        return updatedChat || null
    })
}

/**
 * Create a chat with the first message in a single transaction
 */
export async function createChatWithFirstMessageTransaction({
    chatId,
    chatTitle,
    userId,
    message
}: {
    chatId: string
    chatTitle: string
    userId: string
    message: PersistableUIMessage
}): Promise<{ chat: Chat; message: Message }> {
    perfLog(`DB - createChatWithFirstMessageTransaction start`)
    const dbStart = performance.now()
    return await withRLS(userId, async tx => {
        console.log(`[DB:RLS] Setting session config for user: ${userId}`)
        await tx.execute(
            sql`SELECT set_config('app.current_user_id', ${userId}, true)`
        )

        console.log(`[DB:RLS] Executing callback for user: ${userId}`)
        await tx
            .insert(chats)
            .values({
                id: chatId,
                title: chatTitle.substring(0, 255),
                userId,
                visibility: 'private'
            })
            .onConflictDoUpdate({
                target: chats.id,
                set: { title: chatTitle.substring(0, 255) }
            })

        const [chat] = await (tx as any)
            .select()
            .from(chats)
            .where(eq(chats.id, chatId))
            .limit(1)

        const dbMessageData = mapUIMessageToDBMessage({ ...message, chatId } as any)
        await tx
            .insert(messages)
            .values(dbMessageData)
            .onConflictDoUpdate({
                target: messages.id,
                set: { role: dbMessageData.role }
            })

        const [savedMessage] = await (tx as any)
            .select()
            .from(messages)
            .where(eq(messages.id, dbMessageData.id))
            .limit(1)

        if (message.parts && message.parts.length > 0) {
            const partsData = mapUIMessagePartsToDBParts(
                message.parts as any[],
                savedMessage.id
            )
            if (partsData.length > 0) {
                await tx.delete(parts).where(eq(parts.messageId, savedMessage.id))
                await tx.insert(parts).values(partsData)
            }
        }

        perfTime('DB - createChatWithFirstMessageTransaction completed', dbStart)
        return { chat, message: savedMessage }
    })
}

// AI Configuration actions (Existing ADPA support)
export async function getEnabledProviders() {
    return await db.query.aiProviders.findMany({
        where: eq(aiProviders.isEnabled, 1)
    })
}

export async function getModelConfig(searchMode: any, modelType: any) {
    return await db.query.aiModelConfig.findFirst({
        where: and(eq(aiModelConfig.searchMode, searchMode), eq(aiModelConfig.modelType, modelType)),
        with: {
            aiModel: {
                with: {
                    aiProvider: true
                }
            }
        },
        orderBy: [desc(aiModelConfig.priority)]
    })
}

// Helper legacy export
export async function saveChat(params: any) {
    const { id, userId, title, visibility = 'private' } = params
    return await db.insert(chats).values({ id, userId, title, visibility }).onConflictDoUpdate({
        target: chats.id,
        set: { title, visibility }
    }).returning()
}

export async function saveMessage(params: any) {
    const { id, chatId, role, metadata } = params
    return await db.insert(messages).values({ id, chatId, role, metadata }).onConflictDoUpdate({
        target: messages.id,
        set: { role, metadata, updatedAt: new Date() }
    }).returning()
}

export async function savePart(part: any) {
    return await db.insert(parts).values(part).returning()
}

// createChatWithFirstMessage is high-level, adding it here for compatibility with some imports
export async function createChatWithFirstMessage(
    chatId: string,
    message: UIMessage,
    userId: string,
    title?: string
): Promise<{ chat: Chat; message: Message }> {
    return await createChatWithFirstMessageTransaction({
        chatId,
        chatTitle: title || 'New Chat',
        userId,
        message: { ...message, id: message.id || generateId() }
    })
}
