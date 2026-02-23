import {
    convertToModelMessages,
    createUIMessageStream,
    createUIMessageStreamResponse,
    pruneMessages,
    smoothStream,
    consumeStream,
    UIMessage,
    UIMessageStreamWriter
} from 'ai'
import { v4 as uuidv4 } from 'uuid'

import { researcher } from '@/lib/morphic/agents/researcher'
import { isTracingEnabled } from '@/lib/morphic/utils/telemetry'
import { getLangfuseClient } from '@/lib/morphic/utils/langfuse-client'

import { loadChatWithMessages as loadChat, upsertMessage, createChat } from '../db/actions'
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
        knowledgeEnabled,
        ragScope
    } = config

    // Verify that chatId is provided
    if (!chatId) {
        return new Response('Chat ID is required', {
            status: 400,
            statusText: 'Bad Request'
        })
    }

    // Persist user message and create chat if needed
    if (message) {
        // Ensure chat exists if new
        if (isNewChat && userId) {
            const title = getTextFromParts(message.parts)?.slice(0, 100) || DEFAULT_CHAT_TITLE
            await createChat({ id: chatId, title, userId })
        }

        // Save the user message
        if (userId) {
            await upsertMessage({
                ...message,
                chatId
            }, userId)
        }
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

    // Create parent trace ID and Langfuse trace
    let parentTraceId: string | undefined
    const langfuse = getLangfuseClient()
    let langfuseTrace: any = null
    if (isTracingEnabled()) {
        parentTraceId = uuidv4()
    }
    if (langfuse) {
        langfuseTrace = langfuse.trace({
            id: parentTraceId,
            name: `morphic-search-${searchMode || 'adaptive'}`,
            sessionId: chatId,
            userId: userId || 'anonymous',
            metadata: {
                chatId,
                searchMode,
                modelType,
                modelId: model ? `${model.providerId}:${model.id}` : 'unknown',
                knowledgeEnabled,
                trigger
            },
            tags: ['morphic', searchMode || 'adaptive', model?.providerId || 'unknown']
        })
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

        // We wrap the entire execution within createUIMessageStream so we can merge the result
        // matching the UI message protocol expected by the DefaultChatTransport on the frontend.
        const stream = createUIMessageStream<UIMessage>({
            execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
                let lastError: any = null
                let success = false

                // Fallback Orchestration Loop
                for (const candidate of candidateModels) {
                    const currentModelId = `${candidate.providerId}:${candidate.id}`

                    let langfuseGeneration: any = null
                    try {
                        perfLog(`Attempting model: ${currentModelId} `)
                        context.modelId = currentModelId

                        // Start a Langfuse generation span for this LLM call
                        if (langfuseTrace) {
                            langfuseGeneration = langfuseTrace.generation({
                                name: `researcher-${searchMode || 'adaptive'}`,
                                model: currentModelId,
                                metadata: {
                                    searchMode,
                                    modelType,
                                    knowledgeEnabled
                                }
                            })
                        }

                        const messagesToModel = await prepareMessages(context, message)

                        // Get the researcher agent — pass writer for tool UI streaming
                        const researchAgent = researcher({
                            model: currentModelId,
                            modelConfig: candidate,
                            writer,
                            parentTraceId,
                            searchMode,
                            modelType,
                            knowledgeEnabled,
                            userId,
                            ragScope
                        })

                        const signedMessages = await signInternalFileUrls(messagesToModel, currentModelId)
                        const isOpenAI = currentModelId.startsWith('openai:')
                        let messagesToConvert = isOpenAI
                            ? stripReasoningParts(signedMessages)
                            : signedMessages

                        // Cleanup Morphic specific generator states ('complete', 'error', etc) from previous tool results
                        messagesToConvert = messagesToConvert.map(msg => {
                            const msgAny = msg as any
                            if (Array.isArray(msgAny.parts)) {
                                return {
                                    ...msg,
                                    parts: msgAny.parts.map((toolPart: any) => {
                                        if (toolPart.type === 'tool-result' && toolPart.result && typeof toolPart.result === 'object') {
                                            const cleanedResult = { ...toolPart.result }
                                            delete cleanedResult.state
                                            return { ...toolPart, result: cleanedResult }
                                        }
                                        return toolPart
                                    })
                                }
                            }
                            return msg
                        })

                        let coreMessages = await convertToModelMessages(messagesToConvert)

                        // Prune messages to keep context manageable
                        coreMessages = pruneMessages({
                            messages: coreMessages,
                            reasoning: 'before-last-message',
                            toolCalls: 'before-last-2-messages',
                            emptyMessages: 'remove'
                        })

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

                        // Execute the stream via the ToolLoopAgent
                        const result = await researchAgent.stream({
                            messages: coreMessages,
                            abortSignal,
                            experimental_transform: smoothStream({ chunking: 'word' })
                        })

                        perfTime(`researchAgent.stream initiated(${currentModelId})`, llmStart)

                        // Consume and map the stream to the UI
                        result.consumeStream()

                        writer.merge(
                            result.toUIMessageStream({
                                messageMetadata: ({ part }: any) => {
                                    if (part.type === 'start') {
                                        return {
                                            traceId: parentTraceId,
                                            searchMode,
                                            modelId: currentModelId
                                        }
                                    }
                                }
                            })
                        )

                        // End Langfuse generation span on success
                        if (langfuseGeneration) {
                            langfuseGeneration.end({
                                output: `[streaming response from ${currentModelId}]`,
                                level: 'DEFAULT',
                                statusMessage: 'SUCCESS'
                            })
                        }

                        success = true
                        break // Break Out on Success

                    } catch (error: any) {
                        console.error(`Model ${currentModelId} failed: `, error)
                        // End Langfuse generation span on error
                        if (langfuseGeneration) {
                            langfuseGeneration.end({
                                output: error.message || 'Unknown error',
                                level: 'ERROR',
                                statusMessage: error.message
                            })
                        }
                        lastError = error
                        if (candidate === candidateModels[candidateModels.length - 1]) throw error
                        perfLog(`Falling back from ${currentModelId}...`)
                    }
                }

                if (!success && lastError) {
                    throw lastError
                }
            },
            onError: (error: any) => {
                return error instanceof Error ? error.message : String(error)
            },
            onFinish: async ({ responseMessage, isAborted }) => {
                if (isAborted || !responseMessage) return

                // Persist stream results to database (includes title update)
                await persistStreamResults(
                    responseMessage,
                    chatId,
                    userId,
                    titlePromise,
                    parentTraceId,
                    searchMode,
                    context.modelId
                )

                // Flush Langfuse traces
                if (langfuse) {
                    try {
                        await langfuse.flushAsync()
                    } catch (e) {
                        console.error('[Langfuse] Error flushing traces:', e)
                    }
                }
            }
        })

        return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream })

    } catch (error) {
        console.error('Stream execution error:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}

