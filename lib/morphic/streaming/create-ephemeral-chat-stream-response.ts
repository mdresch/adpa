import { consumeStream, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, pruneMessages, smoothStream, UIMessage, UIMessageStreamWriter } from 'ai'
import { randomUUID } from 'crypto'
import { researcher } from '@/lib/morphic/agents/researcher'
import { isTracingEnabled } from '@/lib/morphic/utils/telemetry'
import { stripReasoningParts } from './helpers/strip-reasoning-parts'
import { BaseStreamConfig } from './types'

export async function createEphemeralChatStreamResponse(config: BaseStreamConfig): Promise<Response> {
    const { message, model, abortSignal, searchMode, modelType, knowledgeEnabled } = config
    let parentTraceId = isTracingEnabled() ? randomUUID() : undefined
    const stream = createUIMessageStream<UIMessage>({
        execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
            try {
                const currentModelId = `${model.providerId}:${model.id}`
                const researchAgent = researcher({ model: currentModelId, modelConfig: model, writer, parentTraceId, searchMode, modelType, knowledgeEnabled })
                const messagesToConvert = currentModelId.startsWith('openai:') ? stripReasoningParts([message!]) : [message!]
                let modelMessages = await convertToModelMessages(messagesToConvert)
                modelMessages = pruneMessages({ messages: modelMessages, emptyMessages: 'remove' })
                const result = await researchAgent.stream({ messages: modelMessages, abortSignal, experimental_transform: smoothStream({ chunking: 'word' }) })
                result.consumeStream()
                writer.merge(result.toUIMessageStream({ messageMetadata: () => ({ traceId: parentTraceId, searchMode, modelId: currentModelId }) }))
            } catch (error) { throw error }
        }
    })
    return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream })
}
