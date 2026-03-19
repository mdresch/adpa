'use client'

import React from 'react'
import type { ReasoningPart } from '@ai-sdk/provider-utils'
import { UseChatHelpers } from '@ai-sdk/react'
import { ChatRequestOptions } from 'ai'
import type { SearchResultItem } from '@/lib/morphic/types'
import type {
    DataPart,
    ToolPart,
    UIDataTypes,
    UIMessage,
    UITools
} from '@/lib/morphic/types/ai'
import type { DynamicToolPart } from '@/lib/morphic/types/dynamic-tools'
import { AnswerSection } from './answer-section'
import { DataSection } from './data-section'
import { DynamicToolDisplay } from './dynamic-tool-display'
import { ResearchProcessSection } from './research-process-section'
import { SearchSection } from './search-section'
import { UserFileSection } from './user-file-section'
import { UserTextSection } from './user-text-section'
import { AgentRunTracker } from './agent-run-tracker'

type MessagePart =
    | ReasoningPart
    | ToolPart
    | DataPart
    | { type: 'text'; text: string }
    | DynamicToolPart

function isReasoningPart(part: MessagePart): part is ReasoningPart {
    return part.type === 'reasoning'
}

function isToolPart(part: MessagePart): part is ToolPart {
    return (
        (part.type?.startsWith?.('tool-') && part.type !== 'dynamic-tool') ?? false
    )
}

function isDataPart(part: MessagePart): part is DataPart {
    return part.type?.startsWith?.('data-') ?? false
}

function isDynamicToolPart(part: MessagePart): part is DynamicToolPart {
    return part.type === 'dynamic-tool'
}

type Props = {
    message: UIMessage
    messageId: string
    getIsOpen: (id: string, partType?: string, hasNextPart?: boolean) => boolean
    onOpenChange: (id: string, open: boolean) => void
    onQuerySelect: (query: string) => void
    chatId?: string
    status?: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>>['status']
    addToolResult?: (params: { toolCallId: string; result: any }) => void
    reload?: (
        messageId: string,
        options?: ChatRequestOptions
    ) => Promise<void | string | null | undefined>
    onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
    isGuest?: boolean
    citationMaps?: Record<string, Record<number, SearchResultItem>>
}

export function RenderMessage({
    message,
    messageId,
    getIsOpen,
    onOpenChange,
    onQuerySelect,
    chatId,
    status,
    addToolResult,
    reload,
    onUpdateMessage,
    isGuest,
    citationMaps
}: Props) {
    if (message.role === 'user') {
        // Extract text from parts array or use content field
        const userText = message.content || 
            (message.parts as MessagePart[] | undefined)?.find(
                (p): p is { type: 'text'; text: string } => p.type === 'text'
            )?.text || ''
        
        return (
            <div className="flex flex-col gap-2">
                <UserTextSection
                    content={userText}
                    messageId={messageId}
                    onUpdateMessage={onUpdateMessage}
                />
                {message.experimental_attachments?.map((attachment, index) => (
                    <UserFileSection
                        key={`${messageId}-file-${index}`}
                        file={{
                            name: attachment.name || 'File',
                            url: attachment.url,
                            contentType: attachment.contentType || 'application/octet-stream'
                        }}
                    />
                ))}
            </div>
        )
    }

    const parts = message.parts as MessagePart[]
    if (!parts?.length) return null

    return (
        <div className="flex flex-col gap-4">
            {parts.map((part, index) => {
                const hasNext = index < parts.length - 1

                if (isReasoningPart(part) || isToolPart(part)) {
                    const subsequentParts = parts.slice(index)
                    const researchGroup: MessagePart[] = []

                    for (const p of subsequentParts) {
                        if (isReasoningPart(p) || isToolPart(p) || isDataPart(p)) {
                            researchGroup.push(p)
                        } else {
                            break
                        }
                    }

                    if (researchGroup.length > 0) {
                        const hasSubsequentText = parts
                            .slice(index + researchGroup.length)
                            .some(p => p.type === 'text')

                        const element = (
                            <ResearchProcessSection
                                key={`${messageId}-research-${index}`}
                                message={message}
                                messageId={messageId}
                                getIsOpen={getIsOpen}
                                onOpenChange={onOpenChange}
                                onQuerySelect={onQuerySelect}
                                status={status}
                                addToolResult={addToolResult}
                                parts={researchGroup}
                                hasSubsequentText={hasSubsequentText}
                            />
                        )

                        parts.splice(index, researchGroup.length - 1)
                        return element
                    }
                }

                if (part.type === 'text') {
                    return (
                        <AnswerSection
                            key={`${messageId}-text-${index}`}
                            content={part.text}
                            isOpen={getIsOpen(messageId, 'text', hasNext)}
                            onOpenChange={open => onOpenChange(messageId, open)}
                            chatId={chatId}
                            messageId={messageId}
                            metadata={message.metadata}
                            status={status}
                            reload={reload}
                            citationMaps={citationMaps}
                            isGuest={isGuest}
                        />
                    )
                }

                if (isDataPart(part)) {
                    return (
                        <DataSection
                            key={`${messageId}-data-${index}`}
                            part={part}
                            onQuerySelect={onQuerySelect}
                        />
                    )
                }

                if (isDynamicToolPart(part)) {
                    return (
                        <DynamicToolDisplay
                            key={`${messageId}-dynamic-${part.toolCallId}`}
                            part={part}
                        />
                    )
                }

                return null
            })}
        </div>
    )
}
