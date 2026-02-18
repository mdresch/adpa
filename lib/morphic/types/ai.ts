import type { ReasoningPart, TextPart } from '@ai-sdk/provider-utils'
import type { UIMessage as AIMessage, InferUITool } from 'ai'

import { fetchTool } from '@/lib/morphic/tools/fetch'
import { dbQueryTool, ragSearchTool } from '@/lib/morphic/tools/knowledge'
import { askQuestionTool } from '@/lib/morphic/tools/question'
import { searchTool } from '@/lib/morphic/tools/search'
import { createTodoTools, type TodoItem } from '@/lib/morphic/tools/todo'
import type { SearchMode } from '@/lib/morphic/types/search'

// Re-export TodoItem for external use
export type { TodoItem }

// Define metadata type for messages
export interface UIMessageMetadata {
    traceId?: string
    feedbackScore?: number | null
    searchMode?: SearchMode
    modelId?: string
    [key: string]: any
}

export type UIMessage<
    TMetadata = UIMessageMetadata,
    TDataTypes = UIDataTypes,
    TTools = UITools
> = AIMessage

export interface RelatedQuestionsData {
    status: 'loading' | 'streaming' | 'success' | 'error'
    questions?: Array<{ question: string }>
}

export type UIDataTypes = {
    sources?: any[]
    relatedQuestions?: RelatedQuestionsData
}

// Data part types for DataSection
export type DataRelatedQuestionsPart = {
    type: 'data-relatedQuestions'
    id?: string
    data: RelatedQuestionsData
}

export type DataPart = DataRelatedQuestionsPart

// Create todo tools instance for type inference
const todoTools = createTodoTools()

export type UITools = {
    search: InferUITool<typeof searchTool>
    fetch: InferUITool<typeof fetchTool>
    askQuestion: InferUITool<typeof askQuestionTool>
    todoWrite: InferUITool<typeof todoTools.todoWrite>
    ragSearch: InferUITool<typeof ragSearchTool>
    dbQuery: InferUITool<typeof dbQueryTool>
    // Dynamic tools will be added at runtime
    [key: string]: any
}

export type ToolPart<T extends keyof UITools = keyof UITools> = {
    type: `tool-${T}`
    toolCallId: string
    input: UITools[T]['input']
    output?: UITools[T]['output']
    state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error'
    errorText?: string
}

export type Part = TextPart | ReasoningPart | ToolPart
