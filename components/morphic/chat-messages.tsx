'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { UseChatHelpers } from '@ai-sdk/react'
import { useMediaQuery } from '@/lib/morphic/hooks/use-media-query'
import type { UIDataTypes, UIMessage, UITools } from '@/lib/morphic/types/ai'
import { cn } from '@/lib/morphic/utils'
import { extractCitationMapsFromMessages } from '@/lib/morphic/utils/citation'
import { AnimatedLogo } from './ui/animated-logo'
import { ChatError } from './chat-error'
import { RenderMessage } from './render-message'

interface ChatSection {
    id: string
    userMessage: UIMessage
    assistantMessages: UIMessage[]
}

interface ChatMessagesProps {
    sections: ChatSection[]
    onQuerySelect: (query: string) => void
    status: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>>['status']
    chatId?: string
    isGuest?: boolean
    addToolResult?: (params: { toolCallId: string; result: any }) => void
    scrollContainerRef: React.RefObject<HTMLDivElement>
    onUpdateMessage?: (messageId: string, newContent: string) => Promise<void>
    reload?: (messageId: string) => Promise<void | string | null | undefined>
    error?: Error | string | null | undefined
}

export function ChatMessages({
    sections,
    onQuerySelect,
    status,
    chatId,
    isGuest = false,
    addToolResult,
    scrollContainerRef,
    onUpdateMessage,
    reload,
    error
}: ChatMessagesProps) {
    const [userModifiedStates, setUserModifiedStates] = useState<
        Record<string, boolean>
    >({})
    const toolCountCacheRef = useRef<Map<string, number>>(new Map())
    const isLoading = status === 'submitted' || status === 'streaming'
    const isMobile = useMediaQuery('(max-width: 767px)')

    const toolTypes = [
        'tool-search',
        'tool-fetch',
        'tool-askQuestion',
        'tool-relatedQuestions'
    ]

    useEffect(() => {
        if (isLoading) {
            toolCountCacheRef.current.clear()
        }
    }, [isLoading])

    const offsetHeight = isMobile ? 208 : 196

    const allCitationMaps = useMemo(() => {
        const allMessages: UIMessage[] = []
        sections.forEach(section => {
            allMessages.push(section.userMessage)
            allMessages.push(...section.assistantMessages)
        })
        return extractCitationMapsFromMessages(allMessages)
    }, [sections])

    if (!sections.length) return null

    const showLoading = status === 'submitted' || status === 'streaming'

    const getToolCount = (message?: UIMessage): number => {
        if (!message || !message.id) return 0

        if (isLoading) {
            const count =
                message.parts?.filter(part => toolTypes.includes(part.type)).length || 0
            return count
        }

        const cached = toolCountCacheRef.current.get(message.id)
        if (cached !== undefined) {
            return cached
        }

        const count =
            message.parts?.filter(part => toolTypes.includes(part.type)).length || 0
        toolCountCacheRef.current.set(message.id, count)
        return count
    }

    const getIsOpen = (
        id: string,
        partType?: string,
        hasNextPart?: boolean,
        message?: UIMessage
    ) => {
        if (userModifiedStates.hasOwnProperty(id)) {
            return userModifiedStates[id]
        }

        if (partType && toolTypes.includes(partType)) {
            const toolCount = getToolCount(message)
            if (toolCount > 1) {
                return false
            }
            return true
        }

        if (partType === 'tool-invocation') {
            return true
        }

        if (partType === 'reasoning') {
            return !hasNextPart
        }

        return true
    }

    const handleOpenChange = (id: string, open: boolean) => {
        setUserModifiedStates(prev => ({
            ...prev,
            [id]: open
        }))
    }

    return (
        <div
            id="scroll-container"
            ref={scrollContainerRef}
            role="list"
            aria-roledescription="chat messages"
            className={cn(
                'relative size-full pt-14',
                sections.length > 0 ? 'flex-1 overflow-y-auto' : ''
            )}
        >
            <div className="relative mx-auto w-full max-w-full md:max-w-3xl px-4">
                {sections.map((section, sectionIndex) => (
                    <div
                        key={section.id}
                        id={`section-${section.id}`}
                        className="chat-section pb-14"
                        style={
                            sectionIndex === sections.length - 1
                                ? { minHeight: `calc(100dvh - ${offsetHeight}px)` }
                                : {}
                        }
                    >
                        <div className="flex flex-col gap-4 mb-4">
                            <RenderMessage
                                message={section.userMessage}
                                messageId={section.userMessage.id}
                                getIsOpen={(id, partType, hasNextPart) =>
                                    getIsOpen(id, partType, hasNextPart, section.userMessage)
                                }
                                onOpenChange={handleOpenChange}
                                onQuerySelect={onQuerySelect}
                                chatId={chatId}
                                isGuest={isGuest}
                                status={status}
                                addToolResult={addToolResult}
                                onUpdateMessage={onUpdateMessage}
                                reload={reload}
                                citationMaps={allCitationMaps}
                            />
                        </div>

                        {section.assistantMessages.map((assistantMessage, messageIndex) => {
                            return (
                                <div key={assistantMessage.id} className="flex flex-col gap-4">
                                    <RenderMessage
                                        message={assistantMessage}
                                        messageId={assistantMessage.id}
                                        getIsOpen={(id, partType, hasNextPart) =>
                                            getIsOpen(id, partType, hasNextPart, assistantMessage)
                                        }
                                        onOpenChange={handleOpenChange}
                                        onQuerySelect={onQuerySelect}
                                        chatId={chatId}
                                        isGuest={isGuest}
                                        status={status}
                                        addToolResult={addToolResult}
                                        onUpdateMessage={onUpdateMessage}
                                        reload={reload}
                                        citationMaps={allCitationMaps}
                                    />
                                </div>
                            )
                        })}
                        {showLoading && sectionIndex === sections.length - 1 && (
                            <div className="flex justify-start py-4">
                                <AnimatedLogo className="h-10 w-10" />
                            </div>
                        )}
                        {sectionIndex === sections.length - 1 && (
                            <ChatError error={error} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
