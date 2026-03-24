'use client'

import { UseChatHelpers } from '@ai-sdk/react'
import { Database, Search } from 'lucide-react'
import type { ToolPart, UIDataTypes, UIMessage, UITools } from '@/lib/morphic/types/ai'
import { CollapsibleMessage } from './collapsible-message'
import FetchSection from './fetch-section'
import { QuestionConfirmation } from './question-confirmation'
import { SearchSection } from './search-section'
import { ToolTodoDisplay } from './tool-todo-display'
import { AgentRunTracker } from './agent-run-tracker'

interface ToolSectionProps {
    tool: ToolPart
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    status?: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>>['status']
    addToolResult?: (params: { toolCallId: string; result: any }) => void
    onQuerySelect: (query: string) => void
    borderless?: boolean
    isFirst?: boolean
    isLast?: boolean
}

export function ToolSection({
    tool,
    isOpen,
    onOpenChange,
    status,
    addToolResult,
    onQuerySelect,
    borderless = false,
    isFirst = false,
    isLast = false
}: ToolSectionProps) {
    if (tool.type === 'tool-askQuestion' || tool.type === 'tool-ask_question') {
        if (
            (tool.state === 'input-streaming' || tool.state === 'input-available') &&
            addToolResult
        ) {
            return (
                <QuestionConfirmation
                    toolInvocation={tool as ToolPart<'askQuestion'>}
                    onConfirm={(toolCallId, approved, response) => {
                        addToolResult({
                            toolCallId,
                            result: approved
                                ? response
                                : {
                                    declined: true,
                                    skipped: response?.skipped,
                                    message: 'User declined this question'
                                }
                        })
                    }}
                />
            )
        }

        if (tool.state === 'output-available') {
            return (
                <QuestionConfirmation
                    toolInvocation={tool as ToolPart<'askQuestion'>}
                    isCompleted={true}
                    onConfirm={() => { }}
                />
            )
        }
    }

    switch (tool.type) {
        case 'tool-search':
            return (
                <SearchSection
                    tool={tool as ToolPart<'search'>}
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                    status={status}
                    borderless={borderless}
                    isFirst={isFirst}
                    isLast={isLast}
                />
            )
        case 'tool-fetch':
            return (
                <FetchSection
                    tool={tool as ToolPart<'fetch'>}
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                    status={status}
                    borderless={borderless}
                    isFirst={isFirst}
                    isLast={isLast}
                />
            )
        case 'tool-todoWrite':
            return (
                <ToolTodoDisplay
                    tool="todoWrite"
                    state={tool.state}
                    input={tool.input}
                    output={tool.output}
                    errorText={tool.errorText}
                    toolCallId={tool.toolCallId}
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                    borderless={borderless}
                    isFirst={isFirst}
                    isLast={isLast}
                />
            )
        case 'tool-ragSearch':
        case 'tool-rag_search':
            return (
                <CollapsibleMessage
                    role="assistant"
                    isCollapsible={true}
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                    header={
                        <div className="flex items-center gap-2">
                            <Search className="size-4 text-blue-500" />
                            <span>Searching Knowledge Base</span>
                        </div>
                    }
                >
                    <div className="p-4 space-y-2">
                        <div className="text-sm font-medium">Query: {(tool.input as any).query}</div>
                        {tool.state === 'output-available' && (
                            <div className="text-sm text-muted-foreground italic">
                                Found {(tool.output as any).results?.length || 0} relevant snippets.
                            </div>
                        )}
                        {tool.state === 'output-error' && (
                            <div className="text-sm text-destructive">{tool.errorText}</div>
                        )}
                    </div>
                </CollapsibleMessage>
            )
        case 'tool-dbQuery':
        case 'tool-db_query':
            return (
                <CollapsibleMessage
                    role="assistant"
                    isCollapsible={true}
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                    header={
                        <div className="flex items-center gap-2">
                            <Database className="size-4 text-green-500" />
                            <span>Querying System Database</span>
                        </div>
                    }
                >
                    <div className="p-4 space-y-2">
                        <div className="text-sm font-mono bg-muted p-2 rounded overflow-x-auto whitespace-pre">
                            {(tool.input as any).sqlQuery}
                        </div>
                        {tool.state === 'output-available' && (
                            <div className="text-sm text-muted-foreground italic">
                                Returned {(tool.output as any).rowCount || 0} rows.
                            </div>
                        )}
                        {tool.state === 'output-error' && (
                            <div className="text-sm text-destructive">{tool.errorText}</div>
                        )}
                    </div>
                </CollapsibleMessage>
            )
        case 'tool-runProjectAgent':
        case 'tool-run_project_agent':
            if (tool.state === 'output-available' && (tool.output as any)?.status === 'started') {
                return (
                    <div className="w-full">
                        <AgentRunTracker 
                            runId={(tool.output as any).runId} 
                            projectId={(tool.output as any).projectId} 
                            goal={(tool.output as any).goal}
                            initialStatus="active"
                        />
                    </div>
                )
            } else if (tool.state === 'output-error' || (tool.state === 'output-available' && (tool.output as any)?.error)) {
                 return (
                    <div className="p-4 rounded-md border text-sm text-destructive bg-destructive/10">
                        Failed to start project agent: {tool.errorText || (tool.output as any)?.error}
                    </div>
                 )
            } else {
                 return (
                     <div className="p-4 text-sm text-muted-foreground animate-pulse">
                         Starting project agent...
                     </div>
                 )
            }
        default:
            return null
    }
}
