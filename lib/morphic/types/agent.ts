import type {
    ModelMessage as CoreMessage,
    UIToolInvocation,
    UIMessage
} from 'ai'

import type { fetchTool } from '../tools/fetch'
import type { createFileSearchTool } from '../tools/file-search'
import type { createDbQueryTool, createRagSearchTool } from '../tools/knowledge'
import type { createQuestionTool } from '../tools/question'
import type { createSearchTool } from '../tools/search'
import type { createTodoTools } from '../tools/todo'
import type { createRunProjectAgentTool } from '../tools/run-project-agent'

// Define the tools type for researcher agent
export type ResearcherTools = {
    search: ReturnType<typeof createSearchTool>
    fetch: typeof fetchTool
    askQuestion: ReturnType<typeof createQuestionTool>
    ragSearch: ReturnType<typeof createRagSearchTool>
    dbQuery: ReturnType<typeof createDbQueryTool>
    fileSearch: ReturnType<typeof createFileSearchTool>
    runProjectAgent: ReturnType<typeof createRunProjectAgentTool>
} & ReturnType<typeof createTodoTools>

// Tool invocation types for each tool
export type SearchToolInvocation = UIToolInvocation<any> & { toolName: 'search' }
export type FetchToolInvocation = UIToolInvocation<any> & { toolName: 'fetch' }
export type QuestionToolInvocation = UIToolInvocation<any> & { toolName: 'askQuestion' }
export type TodoWriteToolInvocation = UIToolInvocation<any> & { toolName: string }

// Union type for all tool invocations
export type ResearcherToolInvocation = UIToolInvocation<any> & {
    toolName: string
    result?: any
}

// Helper type to extract tool names
export type ResearcherToolName = keyof ResearcherTools

// Type guard functions
export function isSearchToolInvocation(
    invocation: ResearcherToolInvocation
): invocation is SearchToolInvocation {
    return (invocation as any).toolName === 'search'
}

export function isFetchToolInvocation(
    invocation: ResearcherToolInvocation
): invocation is FetchToolInvocation {
    return (invocation as any).toolName === 'fetch'
}

// Response type for agent.respond()
export type ResearcherResponse = Response

// Options type for agent.respond()
export type ResearcherRespondOptions = {
    messages: UIMessage[]
}
