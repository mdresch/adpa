import type { Chat, Message } from '@/lib/morphic/db/schema'
import type { UIMessage } from '@/lib/morphic/types/ai'

export interface StreamContext {
    chatId: string
    userId: string
    modelId: string
    messageId?: string
    trigger?: string
    initialChat: (Chat & { messages: UIMessage[] }) | null
    abortSignal?: AbortSignal
    parentTraceId?: string
    isNewChat?: boolean
    correlationId?: string
    pendingInitialSave?: Promise<{ chat: Chat; message: Message }>
    pendingInitialUserMessage?: UIMessage
}
