'use server'

import { revalidateTag } from 'next/cache'
import { getCurrentUserId } from '@/lib/morphic/auth/get-current-user'
import * as dbActions from '@/lib/morphic/db/actions'
import { generateId } from '@/lib/morphic/db/schema'

/**
 * Get all chats for the current user
 */
export async function getChats() {
    const userId = await getCurrentUserId()
    if (!userId) {
        return []
    }
    return dbActions.getChats(userId)
}

/**
 * Get chats with pagination for the current user
 */
export async function getChatsPage(limit = 20, offset = 0) {
    const userId = await getCurrentUserId()
    if (!userId) {
        return { chats: [], nextOffset: null }
    }
    return dbActions.getChatsPage(userId, limit, offset)
}

/**
 * Load a chat with messages
 */
export async function loadChat(chatId: string) {
    const userId = await getCurrentUserId()
    return dbActions.loadChatWithMessages(chatId, userId)
}

/**
 * Create a new chat
 */
export async function createChat(id?: string, title?: string) {
    const userId = await getCurrentUserId()
    if (!userId) {
        return null
    }

    const chat = await dbActions.createChat({
        id: id || generateId(),
        title: title || 'New Chat',
        userId,
        visibility: 'private'
    })

    if (chat) {
        revalidateTag(`chat-${chat.id}`, 'max')
    }
    return chat
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string) {
    const userId = await getCurrentUserId()
    if (!userId) {
        return { success: false, error: 'User not authenticated' }
    }

    const result = await dbActions.deleteChat(chatId, userId)

    if (result.success) {
        revalidateTag(`chat-${chatId}`, 'max')
    }

    return result
}

/**
 * Clear all chats for the current user
 */
export async function clearChats() {
    const userId = await getCurrentUserId()
    if (!userId) {
        return { success: false, error: 'User not authenticated' }
    }

    await dbActions.clearChats(userId)

    revalidateTag('chat', 'max')
    return { success: true }
}

/**
 * Save chat title
 */
export async function saveChatTitle(chatId: string, title: string) {
    const userId = await getCurrentUserId()
    await dbActions.updateChatTitle(chatId, title, userId)
    revalidateTag(`chat-${chatId}`, 'max')
}

/**
 * Share a chat (make it public)
 */
export async function shareChat(chatId: string) {
    const userId = await getCurrentUserId()
    if (!userId) {
        return null
    }

    const updatedChat = await dbActions.updateChatVisibility(
        chatId,
        userId,
        'public'
    )

    if (updatedChat) {
        revalidateTag(`chat-${chatId}`, 'max')
    }

    return updatedChat
}

/**
 * Submit feedback for a message
 */
export async function submitFeedback(traceId: string, score: number, messageId: string) {
    // This is a stub for now as we don't have a feedback API yet
    console.log('Feedback submitted:', { traceId, score, messageId })
    return { success: true }
}
