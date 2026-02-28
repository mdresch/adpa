import * as ai from 'ai'
import { type ModelMessage } from 'ai'
import { wrapAISDK } from 'langsmith/experimental/vercel'

import { relatedSchema } from '../schema/related'
import { getModel } from '../utils/registry'
import { isTracingEnabled } from '../utils/telemetry'
import { getLangfuseClient } from '../utils/langfuse-client'

import { RELATED_QUESTIONS_PROMPT } from './prompts/related-questions-prompt'

const { streamObject: tracedStreamObject } = wrapAISDK(ai)

export async function createRelatedQuestionsStream(
    messages: ModelMessage[],
    abortSignal?: AbortSignal,
    parentTraceId?: string
) {
    // Use the related questions model configuration from dynamic orchestration if available
    const { getDynamicRelatedQuestionsModel } = await import('../config/model-types')
    const relatedModel = await getDynamicRelatedQuestionsModel()
    const modelId = `${relatedModel.providerId}:${relatedModel.id}`

    // Start Langfuse generation span
    const langfuse = getLangfuseClient()
    let langfuseGeneration: any = null
    if (langfuse && parentTraceId) {
        const trace = langfuse.trace({ id: parentTraceId })
        langfuseGeneration = trace.generation({
            name: 'related-questions',
            model: modelId,
            input: `[${messages.length} messages] → generate 3 follow-up questions`,
            metadata: { messageCount: messages.length }
        })
    }

    const stream = tracedStreamObject({
        model: getModel(modelId),
        schema: relatedSchema,
        system: RELATED_QUESTIONS_PROMPT,
        messages: [
            ...messages,
            {
                role: 'user',
                content:
                    'Based on the conversation history and search results, generate 3 unique follow-up questions that would help the user explore different aspects of the topic. Focus on questions that dig deeper into specific findings or explore related areas not yet covered.'
            }
        ],
        abortSignal,
        experimental_telemetry: {
            isEnabled: isTracingEnabled(),
            functionId: 'related-questions',
            metadata: {
                modelId,
                agentType: 'related-questions-generator',
                aiCallType: 'related_questions_generation',
                requestedGeneration: 'related_questions',
                callPath: 'morphic-related-questions',
                messageCount: messages.length,
                ...(parentTraceId && {
                    langfuseTraceId: parentTraceId,
                    langfuseUpdateParent: false
                })
            }
        }
    })

    // Fire-and-forget: end the Langfuse generation once the stream finishes
    if (langfuseGeneration) {
        stream.object.then((obj: any) => {
            langfuseGeneration.end({
                output: JSON.stringify(obj),
                level: 'DEFAULT',
                statusMessage: 'SUCCESS'
            })
            langfuse?.flushAsync().catch(() => { })
        }).catch((err: any) => {
            langfuseGeneration.end({
                output: err?.message || 'stream error',
                level: 'ERROR',
                statusMessage: err?.message
            })
            langfuse?.flushAsync().catch(() => { })
        })
    }

    return stream
}
