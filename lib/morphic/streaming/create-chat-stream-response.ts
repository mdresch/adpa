import {
    // @ts-ignore - convertToModelMessages exists in runtime but not in d.ts
    convertToModelMessages
} from 'ai'
import { v4 as uuidv4 } from 'uuid'

import { researcher } from '@/lib/morphic/agents/researcher'
import { isTracingEnabled } from '@/lib/morphic/utils/telemetry'

import { loadChatWithMessages as loadChat } from '../db/actions'
import { generateChatTitle } from '../agents/title-generator'
import { signInternalFileUrls } from '../utils/file-signer'
import { getTextFromParts } from '../utils/message-utils'
import { perfLog, perfTime } from '../utils/perf-logging'

import { persistStreamResults } from './helpers/persist-stream-results'
import { prepareMessages } from './helpers/prepare-messages'
import { streamRelatedQuestions } from './helpers/stream-related-questions'
import { stripReasoningParts } from './helpers/strip-reasoning-parts'
import type { StreamContext } from './helpers/types'
import { BaseStreamConfig } from './types'

// Constants
const DEFAULT_CHAT_TITLE = 'Untitled'

export async function createChatStreamResponse(
    config: BaseStreamConfig
): Promise<Response> {
    const {
        message,
        model,
        chatId,
        searchMode,
        modelType,
        userId,
        trigger,
        messageId,
        abortSignal,
        isNewChat,
        knowledgeEnabled
    } = config

    // Verify that chatId is provided
    if (!chatId) {
        return new Response('Chat ID is required', {
            status: 400,
            statusText: 'Bad Request'
        })
    }

    // Skip loading chat for new chats optimization
    let initialChat = null
    if (!isNewChat) {
        const loadChatStart = performance.now()
        initialChat = await loadChat(chatId, userId)
        perfTime('loadChat completed', loadChatStart)

        if (initialChat && initialChat.userId !== userId) {
            return new Response('You are not allowed to access this chat', {
                status: 403,
                statusText: 'Forbidden'
            })
        }
    } else {
        perfLog('loadChat skipped for new chat')
    }

    // Create parent trace ID
    let parentTraceId: string | undefined
    if (isTracingEnabled()) {
        parentTraceId = uuidv4()
    }

    // Create stream context
    if (!model) {
        console.error('createChatStreamResponse: model is undefined')
        throw new Error('createChatStreamResponse: model is required')
    }

    const context: StreamContext = {
        chatId,
        userId,
        modelId: `${model.providerId}:${model.id}`,
        messageId,
        trigger,
        initialChat,
        abortSignal,
        parentTraceId,
        isNewChat
    }

    let titlePromise: Promise<string> | undefined

    try {
        const { refreshRegistry } = await import('@/lib/morphic/utils/registry')
        const { getModelsForSlot } = await import('@/lib/morphic/config/model-types')
        await refreshRegistry()

        // Get prioritized fallback candidates
        const candidateModels = await getModelsForSlot(
            searchMode || 'adaptive',
            modelType || 'quality'
        )

        if (candidateModels.length === 0) {
            candidateModels.push(model)
        }

        let lastError: any = null

        // Fallback Orchestration Loop
        for (const candidate of candidateModels) {
            const currentModelId = `${candidate.providerId}:${candidate.id}`

            try {
                perfLog(`Attempting model: ${currentModelId} `)
                context.modelId = currentModelId

                const messagesToModel = await prepareMessages(context, message)

                // Get the researcher agent
                // Note: We create it fresh for each model candidate
                const researchAgent = researcher({
                    model: currentModelId,
                    modelConfig: candidate,
                    parentTraceId,
                    searchMode,
                    modelType,
                    knowledgeEnabled,
                    userId
                })

                const signedMessages = await signInternalFileUrls(messagesToModel, currentModelId)
                const isOpenAI = currentModelId.startsWith('openai:')
                const messagesToConvert = isOpenAI
                    ? stripReasoningParts(signedMessages)
                    : signedMessages

                // Convert to ModelMessages (v6 standard substitution)
                // convertToModelMessages is async? index.d.ts says it returns Promise<ModelMessage[]>
                const coreMessages = await convertToModelMessages(messagesToConvert)

                // Title generation
                if (!initialChat && message && !titlePromise) {
                    const messageContent = getTextFromParts(message.parts)
                    if (messageContent) {
                        titlePromise = generateChatTitle({
                            userMessageContent: messageContent,
                            modelId: currentModelId,
                            abortSignal,
                            parentTraceId
                        }).catch(() => DEFAULT_CHAT_TITLE)
                    }
                }

                const llmStart = performance.now()

                // Execute the stream via the agent wrapper
                // @ts-ignore - Assuming coreMessages is compatible
                const result = await researchAgent.stream(coreMessages as any)
                // Log available keys for debugging
                console.log(`[Debug] Result keys:`, Object.keys(result))

                perfTime(`researchAgent.stream initiated(${currentModelId})`, llmStart)

                // Return the data stream response using the stable v6 method
                // @ts-ignore
                if (typeof result.toUIMessageStreamResponse === 'function') {
                    console.log(`[Debug] Using toUIMessageStreamResponse`)
                    return result.toUIMessageStreamResponse()
                }

                // Fallback to toTextStreamResponse if UI stream is not available
                // @ts-ignore
                if (typeof result.toTextStreamResponse === 'function') {
                    console.log(`[Debug] Fallback to toTextStreamResponse`)
                    return result.toTextStreamResponse()
                }

                throw new Error('No compatible stream response method found (toUIMessageStreamResponse or toTextStreamResponse missing)')

            } catch (error: any) {
                console.error(`Model ${currentModelId} failed: `, error)
                lastError = error
                if (candidate === candidateModels[candidateModels.length - 1]) {
                    throw error
                }
                perfLog(`Falling back from ${currentModelId}...`)
            }
        }

        if (lastError) {
            throw lastError
        }

        return new Response('No models available', { status: 500 })

    } catch (error) {
        console.error('Stream execution error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}

