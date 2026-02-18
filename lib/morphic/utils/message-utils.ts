import { ModelMessage, UIMessage } from 'ai'
import { Message as DBMessage } from '@/lib/morphic/db/schema'

interface DatabaseMessageInput {
    role: DBMessage['role']
    parts: any
}

export function convertMessageForDB(
    message: ModelMessage
): DatabaseMessageInput {
    let parts: any
    if (message.content === null || message.content === undefined) {
        parts = []
    } else if (typeof message.content === 'string') {
        parts = [{ text: message.content }]
    } else if (Array.isArray(message.content)) {
        const textParts = message.content
            .filter(part => part.type === 'text')
            .map(part => ({ text: part.text }))
        if (textParts.length > 0) {
            parts = textParts
        } else {
            parts = [{ text: JSON.stringify(message.content) }]
        }
    } else {
        parts = [{ text: JSON.stringify(message.content) }]
    }
    return {
        role: message.role,
        parts: parts
    }
}

export function convertMessagesForDB(
    messages: ModelMessage[]
): DatabaseMessageInput[] {
    return messages.map(convertMessageForDB)
}

export function extractTitleFromMessage(
    message: ModelMessage,
    maxLength = 100
): string {
    if (!message.content) return 'New Chat'
    if (typeof message.content === 'string') {
        return message.content.substring(0, maxLength)
    }
    if (Array.isArray(message.content)) {
        const textPart = message.content.find(part => part.type === 'text')
        if (textPart && 'text' in textPart) {
            return textPart.text.substring(0, maxLength)
        }
    }
    return 'New Chat'
}

export function getTextFromParts(parts?: UIMessage['parts']): string {
    return (
        parts
            ?.filter(part => part.type === 'text')
            .map(part => part.text)
            .join(' ') ?? ''
    )
}

export function mergeUIMessages(
    primaryMessage: UIMessage,
    secondaryMessage: UIMessage
): UIMessage {
    return {
        ...primaryMessage,
        parts: [...(primaryMessage.parts || []), ...(secondaryMessage.parts || [])]
    }
}

export function hasToolCalls(message: UIMessage | null): boolean {
    if (!message || !message.parts) return false
    return message.parts.some(
        part =>
            part.type && (part.type.startsWith('tool-') || part.type === 'tool-call')
    )
}
