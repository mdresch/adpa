import * as ai from 'ai'
import { wrapAISDK } from 'langsmith/experimental/vercel'

import { getModel } from '@/lib/morphic/utils/registry'
import { isTracingEnabled } from '@/lib/morphic/utils/telemetry'
import { getLangfuseClient } from '@/lib/morphic/utils/langfuse-client'
import { aiService } from '@/server/src/services/aiService'

const { generateText: tracedGenerateText } = wrapAISDK(ai)

interface GenerateChatTitleParams {
    userMessageContent: string
    modelId: string
    abortSignal?: AbortSignal
    parentTraceId?: string
    userId?: string
}

/**
 * Generates a concise chat title using an LLM.
 * @param userMessageContent The content of the user's first message.
 * @param model The language model instance to use for generation.
 * @returns A promise that resolves to the generated title string.
 */
export async function generateChatTitle({
    userMessageContent,
    modelId,
    abortSignal,
    parentTraceId,
    userId
}: GenerateChatTitleParams): Promise<string> {
    // Fallback title uses the first 75 characters of the message or a default string.
    const fallbackTitle = userMessageContent.substring(0, 75).trim() || 'New Chat'

    try {
        const systemPrompt = `System: You are an AI assistant specialized in creating very short, concise, and informative titles for chat conversations based on the user's first message. The title should ideally be 3-5 words long, and no more than 10 words. Only output the title itself, with no prefixes, labels, or quotation marks.`

        // Extract provider and model from modelId (format: "provider:model")
        const [providerId, ...modelParts] = modelId.split(':')
        const modelName = modelParts.join(':')

        // Use AIService for robust generation with fallback
        const aiResponse = await aiService.generateWithFallback({
            userId,
            provider: providerId || 'openai',
            model: modelName || 'gpt-4o',
            prompt: userMessageContent,
            system_prompt: systemPrompt,
            temperature: 0.5,
            max_tokens: 50,
            aiCallType: 'title_generation',
            requestedGeneration: 'chat_title',
            metadata: {
                modelId,
                parentTraceId
            }
        })

        const cleanedTitle = (aiResponse.content || '').trim()

        // If the model returns an empty string, use the fallback.
        if (!cleanedTitle) {
            console.warn('LLM generated an empty title, using fallback.')
            return fallbackTitle
        }

        // Remove any surrounding quotes that the model might have added
        return cleanedTitle.replace(/^[\"']|[\"']$/g, '')
    } catch (error) {
        if (
            error instanceof Error &&
            (error.name === 'AbortError' || error.name === 'ResponseAborted')
        ) {
            if (process.env.NODE_ENV === 'development') {
                console.info('Title generation aborted; using fallback title.')
            }
        } else {
            console.error('Error generating chat title with AIService:', error)
        }
        // If LLM generation fails or is aborted, return the fallback title.
        return fallbackTitle
    }
}

// Compatibility export
export const generateTitle = async (messages: any[], modelId: string) => {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    return generateChatTitle({
        userMessageContent: lastUserMessage?.content || '',
        modelId
    });
}
