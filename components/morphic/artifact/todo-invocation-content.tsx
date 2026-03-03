'use client'

import type { ToolPart } from '@/lib/morphic/types/ai'
import TodoListContent from '../todo-list-content'

interface TodoInvocationContentProps {
    part: ToolPart<'todoWrite'>
}

export function TodoInvocationContent({ part }: TodoInvocationContentProps) {
    const todos = ((part.output as unknown as { todos?: unknown[] })?.todos || (part.input as unknown as { todos?: unknown[] })?.todos || []) as Array<{ id: string; content: string; status: 'pending' | 'in_progress' | 'completed'; priority: 'high' | 'medium' | 'low'; timestamp: string }>
    const completedCount = (part.output as unknown as { completedCount?: number })?.completedCount
    const totalCount = (part.output as unknown as { totalCount?: number })?.totalCount

    if (part.state === 'output-error') {
        return (
            <TodoListContent
                errorText={part.errorText || 'Failed to process todos'}
            />
        )
    }

    const message =
        part.output && 'message' in part.output
            ? ((part.output as unknown as { message?: string }).message as string | undefined)
            : undefined

    return (
        <TodoListContent
            todos={todos}
            message={message}
            completedCount={completedCount}
            totalCount={totalCount}
            showSummary={true}
            itemVariant="plain"
        />
    )
}
