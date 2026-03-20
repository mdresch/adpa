import { UIMessage } from 'ai'

import { createChatWithFirstMessage, upsertMessage, updateChatTitle } from '@/lib/morphic/db/actions'
import { SearchMode } from '@/lib/morphic/types/search'
import { perfTime } from '@/lib/morphic/utils/perf-logging'
import { retryDatabaseOperation } from '@/lib/morphic/utils/retry'

const DEFAULT_CHAT_TITLE = 'Untitled'

export async function persistStreamResults(
    responseMessage: UIMessage,
    chatId: string,
    userId: string,
    titlePromise?: Promise<string>,
    parentTraceId?: string,
    searchMode?: SearchMode,
    modelId?: string,
    initialSavePromise?: Promise<any>,
    initialUserMessage?: UIMessage,
    dbActions?: {
        createChat: (chatId: string, userId: string, title: string) => Promise<any>
        upsertMessage: (message: UIMessage & { chatId: string }, userId: string) => Promise<any>
        updateChatTitle: (chatId: string, title: string, userId: string) => Promise<any>
    }
) {
    // Attach metadata to the response message using type assertion to handle missing property in UIMessage
    const currentMetadata = (responseMessage as any).metadata || {}
    ;(responseMessage as any).metadata = {
        ...currentMetadata,
        ...(parentTraceId && { traceId: parentTraceId }),
        ...(searchMode && { searchMode }),
        ...(modelId && { modelId })
    }

    // Wait for title generation if it was started
    const chatTitle = titlePromise ? await titlePromise : undefined

    // Ensure the initial chat/message persistence finished before saving the response
    if (initialSavePromise) {
        const initialSaveStart = performance.now()
        try {
            await initialSavePromise
            perfTime('initial chat persistence awaited', initialSaveStart)
        } catch (error) {
            console.error('Initial chat persistence failed:', error)
            if (initialUserMessage) {
                const fallbackStart = performance.now()
                try {
                    if (dbActions?.createChat) {
                        await dbActions.createChat(chatId, userId, DEFAULT_CHAT_TITLE)
                    } else if (initialUserMessage) {
                        await createChatWithFirstMessage(
                            chatId,
                            initialUserMessage,
                            userId,
                            DEFAULT_CHAT_TITLE
                        )
                    } else {
                        throw new Error('No user message available for fallback chat creation')
                    }
                    perfTime('initial chat persistence fallback completed', fallbackStart)
                } catch (fallbackError) {
                    // Check if the error is due to duplicate key (chat already exists)
                    const isDuplicateKey =
                        fallbackError instanceof Error &&
                        (fallbackError.message.includes('duplicate key') ||
                            fallbackError.message.includes('unique constraint'))

                    if (isDuplicateKey) {
                        // Chat already exists, this is fine - continue to save the response message
                        console.log(
                            'Chat already exists (duplicate key), continuing with response save'
                        )
                        perfTime(
                            'initial chat persistence - duplicate detected',
                            fallbackStart
                        )
                    } else {
                        // Other error - log and return
                        console.error('Fallback chat creation failed:', fallbackError)
                        return
                    }
                }
            } else {
                return
            }
        }
    }

    // Save message with retry logic
    const saveStart = performance.now()
    try {
        const upsertAction = dbActions?.upsertMessage || upsertMessage
        await upsertAction({ ...responseMessage, chatId }, userId)
        perfTime('upsertMessage (AI response) completed', saveStart)
    } catch (error) {
        console.error('Error saving message:', error)
        try {
            const upsertAction = dbActions?.upsertMessage || upsertMessage
            await retryDatabaseOperation(
                () => upsertAction({ ...responseMessage, chatId }, userId),
                'save message'
            )
            perfTime('upsertMessage (AI response) completed after retry', saveStart)
        } catch (retryError) {
            console.error('Failed to save after retries:', retryError)
            // Don't throw here to avoid breaking the stream
        }
    }

    // Update title after message is saved
    if (chatTitle && chatTitle !== DEFAULT_CHAT_TITLE) {
        try {
            const updateTitleAction = dbActions?.updateChatTitle || updateChatTitle
            await updateTitleAction(chatId, chatTitle, userId)
        } catch (error) {
            console.error('Error updating title:', error)
            // Don't throw here as title update is not critical
        }
    }
}
