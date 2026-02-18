'use server'

import { revalidateTag } from 'next/cache'
import { getCurrentUserId } from '@/lib/morphic/auth/get-current-user'
import * as dbActions from '@/lib/morphic/db/actions'

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
        revalidateTag(`chat-${chatId}`)
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
