import {
    stepCountIs,
    tool,
    ToolLoopAgent,
    type UIMessageStreamWriter
} from 'ai'
import { z } from 'zod'

import { type ResearcherTools } from '@/lib/morphic/types/agent'
import { type ModelType } from '@/lib/morphic/types/model-type'
import { type Model } from '@/lib/morphic/types/models'
import { SearchMode } from '@/lib/morphic/types/search'
import { type RAGScope } from '@/lib/morphic/streaming/types'

import { createFileSearchTool } from '../tools/file-search'
import { fetchTool } from '../tools/fetch'
import { createDbQueryTool, createRagSearchTool } from '../tools/knowledge'
import { createQuestionTool } from '../tools/question'
import { createSearchTool } from '../tools/search'
import { createTodoTools } from '../tools/todo'
import { createRunProjectAgentTool } from '../tools/run-project-agent'
import { getModel } from '../utils/registry'
import { isTracingEnabled } from '@/lib/morphic/utils/telemetry'

import {
    ADAPTIVE_MODE_PROMPT,
    QUICK_MODE_PROMPT
} from './prompts/search-mode-prompts'

// Enhanced wrapper function with better type safety and streaming support
function wrapSearchToolForQuickMode<
    T extends ReturnType<typeof createSearchTool>
>(originalTool: T, model: string): T {
    return tool({
        description: originalTool.description,
        inputSchema: originalTool.inputSchema,
        async *execute(params, context) {
            const executeFunc = originalTool.execute
            if (!executeFunc) {
                throw new Error('Search tool execute function is not defined')
            }

            // Force optimized type for quick mode
            const modifiedParams = {
                ...params,
                type: 'optimized' as const
            }

            // Execute the original tool and pass through all yielded values
            const result = executeFunc(modifiedParams, context as any)

            // Handle AsyncIterable (streaming) case
            if (
                result &&
                typeof result === 'object' &&
                Symbol.asyncIterator in result
            ) {
                for await (const chunk of result as any) {
                    yield chunk
                }
            } else {
                // Fallback for non-streaming (shouldn't happen with new implementation)
                const finalResult = await result
                yield finalResult || {
                    state: 'complete' as const,
                    results: [],
                    images: [],
                    query: (params as any).query,
                    number_of_results: 0
                }
            }
        }
    }) as any as T
}

export function createResearcher({
    model,
    modelConfig,
    writer,
    parentTraceId,
    searchMode = 'adaptive',
    modelType,
    knowledgeEnabled = false,
    userId,
    ragScope,
    assistedContext
}: {
    model: string
    modelConfig?: Model
    writer?: UIMessageStreamWriter
    parentTraceId?: string
    searchMode?: SearchMode
    modelType?: ModelType
    knowledgeEnabled?: boolean
    userId?: string
    ragScope?: RAGScope
    assistedContext?: string
}) {
    try {
        const currentDate = new Date().toLocaleString()

        // Create model-specific tools with proper typing
        const originalSearchTool = createSearchTool(model)
        const askQuestionTool = createQuestionTool(model)
        // Todo tools dynamically need a writer in original Morphic
        const todoTools = writer ? createTodoTools() : {}

        let systemPrompt: string
        let activeToolsList: (keyof ResearcherTools)[] = []
        let maxSteps: number
        let searchTool = originalSearchTool

        // Configure based on search mode
        switch (searchMode) {
            case 'quick':
                console.log(
                    '[Researcher] Quick mode: maxSteps=20, tools=[search, fetch]'
                )
                systemPrompt = QUICK_MODE_PROMPT
                activeToolsList = ['search', 'fetch']
                maxSteps = 20
                searchTool = wrapSearchToolForQuickMode(originalSearchTool, model)
                break

            case 'adaptive':
            default:
                systemPrompt = ADAPTIVE_MODE_PROMPT
                activeToolsList = ['search', 'fetch', 'runProjectAgent']

                if (knowledgeEnabled) {
                    activeToolsList.push('ragSearch', 'dbQuery')
                }
                // Enable File Search for ADPA knowledge base
                activeToolsList.push('fileSearch')
                // Only enable todo tools for quality model type
                if (writer && 'todoWrite' in todoTools && modelType === 'quality') {
                    activeToolsList.push('todoWrite')
                }
                console.log(
                    `[Researcher] Adaptive mode: maxSteps=50, modelType=${modelType}, tools=[${activeToolsList.join(', ')}]`
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
        }

        // Initialize File Search tool (always available if store exists)
        let fileSearchTools = {}
        const fileSearchStoreName = process.env.GEMINI_FILE_SEARCH_STORE
        if (fileSearchStoreName) {
            fileSearchTools = {
                fileSearch: createFileSearchTool(fileSearchStoreName, ragScope)
            }
        }

        const runProjectAgentTool = createRunProjectAgentTool()

        // Build tools object with proper typing
        const tools: ResearcherTools = {
            search: searchTool,
            fetch: fetchTool,
            askQuestion: askQuestionTool,
            runProjectAgent: runProjectAgentTool,
            ...knowledgeTools,
            ...fileSearchTools,
            ...todoTools
        } as ResearcherTools

        // Create ToolLoopAgent with all configuration
        const assistedContextInstructions = assistedContext
            ? `\n\nADPA_ASSISTED_CONTEXT_START\n${assistedContext}\nADPA_ASSISTED_CONTEXT_END\nUse this assisted context as primary internal evidence for your response.`
            : ''

        const agent = new ToolLoopAgent({
            model: getModel(model),
            instructions: `${systemPrompt}\nCurrent date and time: ${currentDate}${assistedContextInstructions}`,
            tools,
            activeTools: activeToolsList,
            stopWhen: stepCountIs(maxSteps),
            ...(modelConfig?.providerOptions && {
                providerOptions: modelConfig.providerOptions
            }),
            experimental_telemetry: {
                isEnabled: isTracingEnabled(),
                functionId: 'research-agent',
                metadata: {
                    modelId: model,
                    agentType: 'researcher',
                    aiCallType: 'research_agent',
                    requestedGeneration: 'research_response',
                    callPath: 'morphic-researcher-agent',
                    searchMode,
                    modelType: modelType || 'default',
                    knowledgeEnabled,
                    hasAssistedContext: !!assistedContext,
                    ...(parentTraceId && {
                        langfuseTraceId: parentTraceId,
                        langfuseUpdateParent: false
                    })
                }
            }
        })

        return agent
    } catch (error) {
        console.error('Error in createResearcher:', error)
        throw error
    }
}

// Helper function to access agent tools
export function getResearcherTools(
    agent: ToolLoopAgent<never, ResearcherTools, never>
): ResearcherTools {
    return agent.tools
}

export const researcher = createResearcher
