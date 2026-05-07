import { tool } from 'ai'
import { z } from 'zod'

// Todo item schema
export const todoItemSchema = z
    .object({
        id: z.string().describe('Unique identifier for the todo item'),
        content: z.string().describe('The task description'),
        status: z
            .enum(['pending', 'in_progress', 'completed', 'cancelled'])
            .describe('Current status of the task'),
        // Optional fields — models often omit these.
        priority: z.enum(['high', 'medium', 'low']).optional(),
        timestamp: z.string().optional()
    })
    .passthrough()

export type TodoItem = z.infer<typeof todoItemSchema>

// Schema for todo write tool
export const todoWriteInputSchema = z
    .object({
        // Primary shape used by this codebase
        todos: z.array(todoItemSchema).optional(),
        progressMessage: z.string().optional(),

        // Alternate shape sometimes produced by other tool prompts/runtimes
        merge: z.boolean().optional(),
        message: z.string().optional()
    })
    .passthrough()

// Create todo tools with session-scoped storage
export function createTodoTools() {
    // Session-scoped todos storage - isolated per tool instance
    let sessionTodos: TodoItem[] = []
    const todoWrite = tool({
        description:
            'Create or update todos to track progress on complex tasks. Use this to maintain a list of action items. The response includes completedCount and totalCount to verify task completion.',
        inputSchema: todoWriteInputSchema,
        execute: async function* (input: any) {
            const todosRaw = Array.isArray(input?.todos) ? input.todos : []
            const progressMessage = input?.progressMessage ?? input?.message

            // Yield initial state
            yield { state: 'writing', progressMessage }

            // Update session todos - ensure priority is always set
            sessionTodos = todosRaw.map((todo: any) => ({
                ...todo,
                priority: todo.priority || 'medium',
                timestamp: todo.timestamp || new Date().toISOString()
            }))

            // Calculate progress
            const completedCount = sessionTodos.filter((t: any) => t.status === 'completed').length
            const totalCount = sessionTodos.length

            yield {
                state: 'complete',
                success: true,
                message: progressMessage || `Updated ${totalCount} todos`,
                completedCount,
                totalCount,
                todos: sessionTodos
            }
            return sessionTodos
        }
    })

    return { todoWrite }
}
