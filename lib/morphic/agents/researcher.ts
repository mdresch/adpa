import {
    streamText,
    type CoreMessage,
    type LanguageModel,
    type ToolSet,
    tool
} from 'ai'

import { type ResearcherTools } from '@/lib/morphic/types/agent'
import { type ModelType } from '@/lib/morphic/types/model-type'
import { type Model } from '@/lib/morphic/types/models'
import { SearchMode } from '@/lib/morphic/types/search'

import { fetchTool } from '../tools/fetch'
import { createDbQueryTool, createRagSearchTool } from '../tools/knowledge'
import { createQuestionTool } from '../tools/question'
import { createSearchTool } from '../tools/search'
import { createTodoTools } from '../tools/todo'
import { getModel } from '../utils/registry'

import {
    ADAPTIVE_MODE_PROMPT,
    QUICK_MODE_PROMPT
} from './prompts/search-mode-prompts'

// Enhanced wrapper function with better type safety and streaming support
function wrapSearchToolForQuickMode<
    T extends ReturnType<typeof createSearchTool>
>(originalTool: T) {
    return tool({
        description: originalTool.description,
        parameters: (originalTool as any).parameters || (originalTool as any).inputSchema,
        execute: async (params, context) => {
            const executeFunc = originalTool.execute
            if (!executeFunc) {
                throw new Error('Search tool execute function is not defined')
            }

            // Force optimized type for quick mode
            const modifiedParams = {
                ...params,
                type: 'optimized' as const
            }

            // Execute the original tool
            // Note: streamText handles tool execution, so we just return the result
            return executeFunc(modifiedParams, context as any)
        }
    })
}

export function createResearcher({
    model,
    modelConfig,
    parentTraceId,
    searchMode = 'adaptive',
    modelType,
    knowledgeEnabled = false,
    userId
}: {
    model: string
    modelConfig?: Model
    parentTraceId?: string
    searchMode?: SearchMode
    modelType?: ModelType
    knowledgeEnabled?: boolean
    userId?: string
}) {
    const currentDate = new Date().toLocaleString()

    // Create model-specific tools with proper typing
    const originalSearchTool = createSearchTool(model)
    const askQuestionTool = createQuestionTool(model)
    // Todo tools are no longer strictly tied to a writer in this pattern, but we keep the logic
    const todoTools = createTodoTools()

    let systemPrompt: string
    let activeToolsList: (keyof ResearcherTools)[] = []
    let maxSteps: number
    let searchTool = originalSearchTool

    // Configure based on search mode
    switch (searchMode) {
        case 'quick':
            console.log(
                '[Researcher] Quick mode: maxSteps=10, tools=[search, fetch]'
            )
            systemPrompt = QUICK_MODE_PROMPT
            activeToolsList = ['search', 'fetch']
            maxSteps = 10
            // @ts-ignore - Wrapping tool type complexity
            searchTool = wrapSearchToolForQuickMode(originalSearchTool)
            break

        case 'adaptive':
        default:
            systemPrompt = ADAPTIVE_MODE_PROMPT
            activeToolsList = ['search', 'fetch']

            if (knowledgeEnabled) {
                activeToolsList.push('ragSearch', 'dbQuery')
            }
            // Only enable todo tools for quality model type
            if ('todoWrite' in todoTools && modelType === 'quality') {
                activeToolsList.push('todoWrite')
            }
            console.log(
                `[Researcher] Adaptive mode: maxSteps=MAX, modelType=${modelType}, tools=[${activeToolsList.join(', ')}]`
            )
            maxSteps = 50
            searchTool = originalSearchTool
            break
    }

    // Initialize knowledge tools if enabled and user is present
    let knowledgeTools = {}
    if (knowledgeEnabled && userId) {
        knowledgeTools = {
            ragSearch: createRagSearchTool(userId),
            dbQuery: createDbQueryTool(userId)
        }
    } else if (knowledgeEnabled) {
        console.warn('[Researcher] Knowledge enabled but no userId provided, skipping knowledge tools')
    }

    // Build tools object
    const tools = {
        search: searchTool,
        fetch: fetchTool,
        askQuestion: askQuestionTool,
        ...knowledgeTools,
        ...todoTools
    }

    // Return the streamable object (simulating the agent interface but using streamText)
    return {
        stream: async (messages: CoreMessage[]) => {
            return streamText({
                model: getModel(model),
                tools: tools as any, // Cast to any to avoid complex tool typing issues during refactor - stricter types can be added later
                system: `${systemPrompt}\nCurrent date and time: ${currentDate}`,
                messages,
                maxSteps,
                experimental_telemetry: {
                    isEnabled: true, // Assuming tracing enabled for now, can recover isTracingEnabled() check
                    functionId: 'research-agent',
                    metadata: {
                        modelId: model,
                        agentType: 'researcher',
                        searchMode,
                        ...(parentTraceId && {
                            langfuseTraceId: parentTraceId
                        })
                    }
                },
                ...modelConfig?.providerOptions
            })
        }
    }
}

export const researcher = createResearcher
