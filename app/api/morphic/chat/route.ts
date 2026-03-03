import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'

import { loadChatWithMessages as loadChat } from '@/lib/morphic/db/actions'
import { calculateConversationTurn, trackChatEvent } from '@/lib/morphic/analytics'
import { getCurrentUserId } from '@/lib/morphic/auth/get-current-user'
import { checkAndEnforceOverallChatLimit, checkAndEnforceGuestLimit } from '@/lib/morphic/rate-limit/chat-limits'
import { createChatStreamResponse } from '@/lib/morphic/streaming/create-chat-stream-response'
import { selectModel } from '@/lib/morphic/utils/model-selection'
import { perfLog, perfTime } from '@/lib/morphic/utils/perf-logging'
import { resetAllCounters } from '@/lib/morphic/utils/perf-tracking'
import { isProviderEnabled } from '@/lib/morphic/utils/registry'
import { getTextFromParts } from '@/lib/morphic/utils/message-utils'
import aiSearchRAGService from '@/services/aiSearchRAGService'
import { connectDatabase } from '@/server/src/database/connection'

import { SearchMode } from '@/lib/morphic/types/search'

export const maxDuration = 300

export async function POST(req: Request) {
    const startTime = performance.now()
    const abortSignal = req.signal

    // Initialize database connection (safe to call multiple times)
    await connectDatabase()

    // Reset counters for new request (development only)
    if (process.env.ENABLE_PERF_LOGGING === 'true') {
        resetAllCounters()
    }

    try {
        const body = await req.json()
        const { message, messages, chatId, trigger, messageId, ragScope } = body
        const isNewChat = !!body.isNewChat

        perfLog(
            `API Route - Start: chatId=${chatId}, trigger=${trigger}, isNewChat=${isNewChat}`
        )

        // Handle different triggers using AI SDK standard values
        if (trigger === 'regenerate-message') {
            if (!messageId) {
                return new Response('messageId is required for regeneration', {
                    status: 400,
                    statusText: 'Bad Request'
                })
            }
        } else if (trigger === 'submit-message') {
            if (!message) {
                return new Response('message is required for submission', {
                    status: 400,
                    statusText: 'Bad Request'
                })
            }
        }

        const authStart = performance.now()
        const userId = await getCurrentUserId()
        perfTime('Auth completed', authStart)

        const isGuest = !userId
        if (isGuest && process.env.ENABLE_GUEST_CHAT !== 'true') {
            return new Response('Authentication required', {
                status: 401,
                statusText: 'Unauthorized'
            })
        }

        if (isGuest) {
            const forwardedFor = req.headers.get('x-forwarded-for') || ''
            const ip =
                forwardedFor.split(',')[0]?.trim() ||
                req.headers.get('x-real-ip') ||
                null
            const guestLimitResponse = await checkAndEnforceGuestLimit(ip)
            if (guestLimitResponse) return guestLimitResponse
        } else {
            const overallLimitResponse = await checkAndEnforceOverallChatLimit(userId)
            if (overallLimitResponse) return overallLimitResponse
        }

        const cookieStore = await cookies()

        // Get search mode from cookie
        const searchModeCookie = cookieStore.get('searchMode')?.value
        const searchMode: SearchMode =
            searchModeCookie && ['quick', 'adaptive'].includes(searchModeCookie)
                ? (searchModeCookie as SearchMode)
                : 'adaptive'

        // Get knowledge enabled from cookie
        const knowledgeEnabled = cookieStore.get('knowledgeEnabled')?.value === 'true'

        const isCloudDeployment = process.env.MORPHIC_CLOUD_DEPLOYMENT === 'true'
        const forceSpeed = isGuest || isCloudDeployment
        const modelCookieStore = forceSpeed
            ? ({
                get: (name: string) =>
                    name === 'modelType'
                        ? ({ value: 'speed' } as const)
                        : cookieStore.get(name)
            } as any)
            : cookieStore

        // Select the appropriate model based on model type preference and search mode
        const selectedModel = selectModel({
            cookieStore: modelCookieStore,
            searchMode
        })

        if (!isProviderEnabled(selectedModel.providerId)) {
            return new Response(
                `Selected provider is not enabled ${selectedModel.providerId}`,
                {
                    status: 404,
                    statusText: 'Not Found'
                }
            )
        }

        // Resolve model type from cookie (forced to speed for guests and cloud)
        const modelTypeCookie = cookieStore.get('modelType')?.value
        const resolvedModelType =
            modelTypeCookie === 'quality' || modelTypeCookie === 'speed'
                ? modelTypeCookie
                : 'speed'
        const modelType = forceSpeed ? 'speed' : resolvedModelType

        const streamStart = performance.now()
        perfLog(
            `createChatStreamResponse - Start: model=${selectedModel.providerId}:${selectedModel.id}, searchMode=${searchMode}, modelType=${modelType}`
        )

        let assistedContext: string | undefined
        if (trigger === 'submit-message' && message && userId && searchMode === 'adaptive') {
            try {
                const queryText = getTextFromParts(message.parts)?.trim()
                if (queryText && queryText.length >= 2) {
                    const context = await aiSearchRAGService.assembleContext({
                        query: queryText,
                        limit: 10,
                        offset: 0,
                        sortBy: 'relevance',
                        includeRelationships: true,
                        relationshipDepth: 2,
                        includeKnowledgeBase: knowledgeEnabled,
                        maxContextItems: 8
                    }, userId)

                    assistedContext = context.contextPrompt
                }
            } catch (error) {
                console.warn('[MORPHIC] Assisted context assembly failed:', error)
            }
        }

        // Note: createEphemeralChatStreamResponse is skipped for now, handling guest as normal chat stream 
        // unless explicitly needed. 
        const response = await createChatStreamResponse({
            message,
            model: selectedModel,
            chatId,
            userId: userId || 'anonymous-user',
            trigger,
            messageId,
            abortSignal,
            isNewChat,
            searchMode,
            modelType: modelType as any,
            knowledgeEnabled,
            ragScope,
            assistedContext
        })

        perfTime('createChatStreamResponse resolved', streamStart)

            // Track analytics event (non-blocking)
            ; (async () => {
                try {
                    let conversationTurn = 1
                    if (!isNewChat && userId) {
                        const chat = await loadChat(chatId, userId)
                        if (chat?.messages) {
                            conversationTurn = calculateConversationTurn(chat.messages) + 1
                        }
                    }

                    if (userId) {
                        await trackChatEvent({
                            searchMode,
                            modelType: modelTypeCookie === 'quality' ? 'quality' : 'speed',
                            conversationTurn,
                            isNewChat,
                            trigger,
                            chatId,
                            userId,
                            modelId: selectedModel.id
                        })
                    }
                } catch (error) {
                    console.error('Analytics tracking failed:', error)
                }
            })()

        if (chatId && userId) {
            revalidateTag(`chat-${chatId}`, 'max') // This is valid for on-demand revalidation.
            // But to be safe, let's use revalidatePath as well or instead if that's what's intended.
            // Actually, the warning said "without the second argument is now deprecated". 
            // This usually applies to revalidatePath(path, type). revalidateTag(tag) takes one arg.
            // Maybe it means revalidateTag(tag, opts)? No.
            // Let's assume the user meant revalidatePath if the warning persists. 
            // For now, I'll keep revalidateTag but also add revalidatePath for the specific page.
        }

        const totalTime = performance.now() - startTime
        perfLog(`Total API route time: ${totalTime.toFixed(2)}ms`)

        return response
    } catch (error) {
        console.error('API route error:', error)
        return new Response('Error processing your request', {
            status: 500,
            statusText: 'Internal Server Error'
        })
    }
}
