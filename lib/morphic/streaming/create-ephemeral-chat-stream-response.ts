import { consumeStream, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, pruneMessages, smoothStream, UIMessage, UIMessageStreamWriter } from 'ai'
import { randomUUID } from 'crypto'
import { researcher } from '@/lib/morphic/agents/researcher'
import { isTracingEnabled } from '@/lib/morphic/utils/telemetry'
import { getLangfuseClient } from '@/lib/morphic/utils/langfuse-client'
import { stripReasoningParts } from './helpers/strip-reasoning-parts'
import { BaseStreamConfig } from './types'

export async function createEphemeralChatStreamResponse(config: BaseStreamConfig): Promise<Response> {
    const { message, model, abortSignal, searchMode, modelType, knowledgeEnabled } = config
    let parentTraceId = isTracingEnabled() ? randomUUID() : undefined

    // Initialize Langfuse trace
    const langfuse = getLangfuseClient()
    let langfuseTrace: any = null
    if (langfuse && parentTraceId) {
        langfuseTrace = langfuse.trace({
            id: parentTraceId,
            name: `morphic-ephemeral-${searchMode || 'adaptive'}`,
            sessionId: `ephemeral-${parentTraceId}`,
            userId: 'anonymous-guest',
            metadata: { searchMode, modelType, modelId: model ? `${model.providerId}:${model.id}` : 'unknown' },
            tags: ['morphic', 'ephemeral', searchMode || 'adaptive']
        })
    }

    const stream = createUIMessageStream<UIMessage>({
        execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
            const currentModelId = `${model.providerId}:${model.id}`
            let langfuseGeneration: any = null
            try {
                if (langfuseTrace) {
                    langfuseGeneration = langfuseTrace.generation({
                        name: `researcher-ephemeral`,
                        model: currentModelId,
                        metadata: { searchMode, modelType }
                    })
                }

                const researchAgent = researcher({ model: currentModelId, modelConfig: model, writer, parentTraceId, searchMode, modelType, knowledgeEnabled })
                const messagesToConvert = currentModelId.startsWith('openai:') ? stripReasoningParts([message!]) : [message!]
                let modelMessages = await convertToModelMessages(messagesToConvert)
                modelMessages = pruneMessages({ messages: modelMessages, emptyMessages: 'remove' })
                const result = await researchAgent.stream({ messages: modelMessages, abortSignal, experimental_transform: smoothStream({ chunking: 'word' }) })
                result.consumeStream()
                writer.merge(result.toUIMessageStream({ messageMetadata: () => ({ traceId: parentTraceId, searchMode, modelId: currentModelId }) }))

                if (langfuseGeneration) {
                    langfuseGeneration.end({ output: `[streaming response from ${currentModelId}]`, level: 'DEFAULT', statusMessage: 'SUCCESS' })
                }
            } catch (error: any) {
                if (langfuseGeneration) {
                    langfuseGeneration.end({ output: error?.message || 'Unknown error', level: 'ERROR', statusMessage: error?.message })
                }
                throw error
            } finally {
                if (langfuse) {
                    langfuse.flushAsync().catch(() => { })
                }
            }
        }
    })
    return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream })
}

