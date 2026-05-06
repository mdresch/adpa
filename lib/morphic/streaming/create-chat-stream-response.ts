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
import { getLangfuseClient, isLangfuseEnabled } from '@/lib/morphic/utils/langfuse-client'

import { 
    loadChatWithMessages as defaultLoadChat, 
    upsertMessage as defaultUpsertMessage, 
    createChatWithFirstMessage as defaultCreateChat,
    updateChatTitle as defaultUpdateChatTitle 
} from '../db/actions'
import { generateChatTitle } from '../agents/title-generator'
import { signInternalFileUrls } from '../utils/file-signer'
import { getTextFromParts } from '../utils/message-utils'
import { perfLog, perfTime } from '../utils/perf-logging'

import { persistStreamResults } from './helpers/persist-stream-results'
import { prepareMessages } from './helpers/prepare-messages'
import { streamRelatedQuestions } from './helpers/stream-related-questions'
import { stripReasoningParts } from './helpers/strip-reasoning-parts'
import { CacheService } from '@/lib/kv'
import { createHash } from 'crypto'
import type { StreamContext } from './helpers/types'
import { BaseStreamConfig } from './types'
import { getMaxStepsForMode } from '../utils/search-mode-steps'

// ... existing code ...

const DEFAULT_CHAT_TITLE = 'Untitled'

export async function createChatStreamResponse(
    config: BaseStreamConfig
): Promise<Response> {
    console.debug('[MORPHIC-STREAM] createChatStreamResponse started', { chatId: config.chatId, userId: config.userId });
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
        ragScope,
        assistedContext,
        dbActions
    } = config

    // Use injected actions or default to lib/morphic/db/actions
    const db = {
        loadChatWithMessages: dbActions?.loadChatWithMessages || defaultLoadChat,
        upsertMessage: dbActions?.upsertMessage || defaultUpsertMessage,
        updateChatTitle: dbActions?.updateChatTitle || defaultUpdateChatTitle
    }
    
    // We handle createChat separately below to avoid type conflicts between 
    // the simplified backend version and the complex default version

    // Verify that chatId is provided
    if (!chatId) {
        return new Response('Chat ID is required', {
            status: 400,
            statusText: 'Bad Request'
        })
    }

    // Persist user message and create chat if needed
    if (message) {
        if (isNewChat && userId) {
            const title = getTextFromParts(message.parts)?.slice(0, 100) || 'New Chat'
            if (dbActions?.createChat) {
                // Simplified interface from backend
                await dbActions.createChat(chatId, userId, title)
            } else {
                // Default interface from lib/morphic/db/actions
                await defaultCreateChat(chatId, message, userId, title)
            }
        }

        // Save the user message
        if (userId) {
            await db.upsertMessage({
                ...message,
                chatId
            }, userId)
        }
    }

    // Skip loading chat for new chats optimization
    let initialChat = null
    if (!isNewChat) {
        const loadChatStart = performance.now()
        initialChat = await db.loadChatWithMessages(chatId, userId)
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
    const traceDebugEnabled = process.env.LANGFUSE_DEBUG_TRACING === 'true'
    const langfuse = getLangfuseClient()
    let langfuseTrace: any = null
    if (isTracingEnabled() || isLangfuseEnabled()) {
        parentTraceId = uuidv4()
    }
    if (langfuse) {
        langfuseTrace = langfuse.trace({
            ...(parentTraceId ? { id: parentTraceId } : {}),
            name: `morphic-search-${searchMode || 'adaptive'}`,
            sessionId: chatId,
            userId: userId || 'anonymous',
            metadata: {
                chatId,
                searchMode,
                modelType,
                modelId: model ? `${model.providerId}:${model.id}` : 'unknown',
                knowledgeEnabled,
                hasAssistedContext: !!assistedContext,
                trigger,
                correlationId: config.correlationId
            },
            tags: ['morphic', searchMode || 'adaptive', model?.providerId || 'unknown']
        })

        if (traceDebugEnabled) {
            console.info(`[Langfuse][TraceDebug] trace created chatId=${chatId} traceId=${parentTraceId || 'auto'} mode=${searchMode || 'adaptive'}`)
        }
    }

    // Cache check
    const cacheKey = createHash('sha256')
        .update(JSON.stringify({
            message,
            searchMode,
            modelType,
            knowledgeEnabled,
            ragScope
        }))
        .digest('hex')

    // Return cached response if available (only for authenticated users to avoid cross-user leakage)
    // NOTE: The cache stores the completed UIMessage object. We cannot replay a UIMessage directly
    // into a UIMessageStreamWriter because writer.write() expects typed stream parts, not a
    // UIMessage. Caching is therefore a read-ahead optimisation only: if a cached entry exists we
    // skip generation and return the stored response via NextResponse.json so the client receives
    // a fully-materialised message in a single JSON payload.
    if (userId) {
        try {
            const cached = await CacheService.get<UIMessage>(`chat:cache:${chatId}:${cacheKey}`)
            if (cached) {
                perfLog('Cache hit — returning cached response as JSON')
                return new Response(JSON.stringify(cached), {
                    headers: { 'Content-Type': 'application/json' }
                })
            }
        } catch {
            // Cache read failure is non-fatal — proceed to generate fresh response
        }
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
        isNewChat,
        correlationId: config.correlationId
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
        let activeLangfuseGeneration: any = null
        let finalMessagesToModel: UIMessage[] = []
        const stream = createUIMessageStream<UIMessage>({
            execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
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
                            activeLangfuseGeneration = langfuseGeneration
                        }

                        const messagesToModel = await prepareMessages(context, message)
                        finalMessagesToModel = messagesToModel

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
                            ragScope,
                            assistedContext
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

                        // Strict Final Filter: Gemini crashes if content is an empty array, empty string, or an array of empty text objects
                        coreMessages = coreMessages.filter(msg => {
                            if (typeof msg.content === 'string') {
                                return (msg.content || '').trim().length > 0;
                            }
                            if (Array.isArray(msg.content)) {
                                if (msg.content.length === 0) return false;
                                // Check if all parts are text parts with empty strings
                                const hasRealContent = msg.content.some(part => {
                                    if (part.type === 'text') {
                                        return (part.text || '').trim().length > 0;
                                    }
                                    return true; // tool invocations/results count as real content
                                });
                                return hasRealContent;
                            }
                            return true;
                        });

                        // Update Langfuse generation with prepared input
                        if (langfuseGeneration) {
                            langfuseGeneration.update({
                                input: coreMessages.map(m => ({
                                    role: m.role,
                                    content: typeof m.content === 'string'
                                        ? m.content.substring(0, 2000)
                                        : JSON.stringify(m.content).substring(0, 2000)
                                }))
                            })
                        }

                        // Debug payload logging (development only to prevent leaking conversation data)
                        if (process.env.NODE_ENV === 'development') {
                            console.debug("\n--- CORE MESSAGES PAYLOAD ---");
                            console.debug(JSON.stringify(coreMessages, null, 2));
                            console.debug("-----------------------------\n");
                        }

                        if (!initialChat && message && !titlePromise) {
                            const messageContent = getTextFromParts(message.parts)
                            if (messageContent) {
                                titlePromise = generateChatTitle({
                                    userMessageContent: messageContent,
                                    modelId: currentModelId,
                                    abortSignal,
                                    parentTraceId,
                                    userId
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
                                            modelId: currentModelId,
                                            maxSteps: getMaxStepsForMode(searchMode)
                                        }
                                    }
                                }
                            })
                        )

                        // End Langfuse generation span on success (final output added in onFinish)
                        if (langfuseGeneration) {
                            langfuseGeneration.end({
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
                console.error('[MORPHIC-STREAM] Error during stream execution:', error)
                return JSON.stringify({
                    message: error instanceof Error ? error.message : String(error),
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
                })
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
                    context.modelId,
                    undefined, // initialSavePromise - already awaited above
                    undefined, // initialUserMessage
                    {
                        ...db,
                        createChat: dbActions?.createChat || ((id: string, userId: string, title: string) => 
                            defaultCreateChat(id, message!, userId, title))
                    }
                )

                // Update Langfuse generation with actual streamed output
                if (activeLangfuseGeneration && responseMessage.parts) {
                    try {
                        const textParts = responseMessage.parts
                            .filter((p: any) => p.type === 'text')
                            .map((p: any) => p.text)
                            .join('')
                        
                        // Fallback: If no text was produced, send a helpful error message to avoid "unanswered query"
                        if (textParts.length === 0 && !isAborted) {
                           console.warn(`[MORPHIC-STREAM] No text produced for chatId=${chatId}. Providing fallback.`);
                           const fallbackText = "I'm sorry, I couldn't find a clear answer to your query. Please try rephrasing or checking your search settings.";
                           responseMessage.parts.push({ type: 'text', text: fallbackText });
                        }

                        const toolParts = responseMessage.parts
                            .filter((p: any) => p.type === 'tool-invocation')
                            .map((p: any) => ({ tool: p.toolInvocation?.toolName, args: p.toolInvocation?.args }))
                        activeLangfuseGeneration.update({
                            output: {
                                text: textParts.substring(0, 5000),
                                toolCalls: toolParts.length > 0 ? toolParts : undefined,
                                totalParts: responseMessage.parts.length
                            }
                        })

                        // Update the parent Trace with the final input (full history) and aggregated output
                        if (langfuseTrace && textParts) {
                            const inputSummary = finalMessagesToModel.length > 0
                                ? finalMessagesToModel.map((m: UIMessage) => `[${m.role}]: ${getTextFromParts(m.parts)}`).join('\n\n')
                                : (typeof message === 'string' ? message : JSON.stringify(message))

                            langfuseTrace.update({
                                input: (inputSummary || '').substring(0, 20000),
                                output: (textParts || '').substring(0, 10000)
                            })
                        }
                    } catch (e) {
                        // Non-critical — don't break persistence
                        console.error('[Langfuse] Error updating trace data onFinish:', e);
                    }
                }

                // Cache the finished response message
                if (responseMessage.parts.length > 0) {
                    await CacheService.set(`chat:cache:${chatId}:${cacheKey}`, responseMessage, 3600)
                }

                // Flush Langfuse traces
                if (langfuse) {
                    try {
                        if (traceDebugEnabled) {
                            console.info(`[Langfuse][TraceDebug] flush start chatId=${chatId} traceId=${parentTraceId || 'auto'}`)
                        }
                        await langfuse.flushAsync()
                        if (traceDebugEnabled) {
                            console.info(`[Langfuse][TraceDebug] flush success chatId=${chatId} traceId=${parentTraceId || 'auto'}`)
                        }
                    } catch (e) {
                        if (traceDebugEnabled) {
                            console.error(`[Langfuse][TraceDebug] flush failed chatId=${chatId} traceId=${parentTraceId || 'auto'}`, e)
                        }
                        console.error('[Langfuse] Error flushing traces:', e)
                    }
                }
            }
        })

        return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream })

    } catch (error: any) {
        console.error('[MORPHIC-STREAM] Stream execution error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal Stream Error', 
            details: error.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}

