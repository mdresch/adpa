import { type ModelMessage, streamObject } from 'ai'

import { relatedSchema } from '../schema/related'
import { getModel } from '../utils/registry'
import { isTracingEnabled } from '../utils/telemetry'

import { RELATED_QUESTIONS_PROMPT } from './prompts/related-questions-prompt'

export async function createRelatedQuestionsStream(
    messages: ModelMessage[],
    abortSignal?: AbortSignal,
    parentTraceId?: string
) {
    // Use the related questions model configuration from dynamic orchestration if available
    const { getDynamicRelatedQuestionsModel } = await import('../config/model-types')
    const relatedModel = await getDynamicRelatedQuestionsModel()
    const modelId = `${relatedModel.providerId}:${relatedModel.id}`

    return streamObject({
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
                messageCount: messages.length,
                ...(parentTraceId && {
                    langfuseTraceId: parentTraceId,
                    langfuseUpdateParent: false
                })
            }
        }
    })
}
