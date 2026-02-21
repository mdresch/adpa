'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { toast } from 'sonner'
import { generateId } from '@/lib/morphic/db/schema'
import type { UploadedFile } from '@/lib/morphic/types'
import type { UIMessage } from '@/lib/morphic/types/ai'
import {
    isDynamicToolPart,
    isToolCallPart,
    isToolTypePart
} from '@/lib/morphic/types/dynamic-tools'
import { cn } from '@/lib/morphic/utils'
import { useFileDropzone } from '@/lib/morphic/hooks/use-file-dropzone'
import { getScopeFromCookie } from './rag-scope-selector'
import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'
import { DragOverlay } from './drag-overlay'
import { ErrorModal } from './error-modal'

interface ChatSection {
    id: string
    userMessage: UIMessage
    assistantMessages: UIMessage[]
}

export function Chat({
    id: providedId,
    savedMessages = [],
    query,
    isGuest = false
}: {
    id?: string
    savedMessages?: UIMessage[]
    query?: string
    isGuest?: boolean
}) {
    const router = useRouter()
    const [chatId, setChatId] = useState(() => providedId || generateId())

    const handleNewChat = () => {
        const newId = generateId()
        setChatId(newId)
        setInput('')
        setUploadedFiles([])
        setErrorModal({
            open: false,
            type: 'general',
            message: ''
        })
    }

    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [input, setInput] = useState('')
    const [errorModal, setErrorModal] = useState<{
        open: boolean
        type: 'rate-limit' | 'auth' | 'forbidden' | 'general'
        message: string
        details?: string
    }>({
        open: false,
        type: 'general',
        message: ''
    })

    const {
        messages,
        status,
        setMessages,
        stop,
        sendMessage,
        regenerate,
        addToolResult,
        error
    } = useChat({
        id: chatId,
        transport: new DefaultChatTransport({
            api: '/api/morphic/chat',
            prepareSendMessagesRequest: ({ messages, trigger, messageId }) => {
                const lastMessage = messages[messages.length - 1]
                const messageToRegenerate =
                    trigger === 'regenerate-message'
                        ? messages.find(m => m.id === messageId)
                        : undefined

                return {
                    body: {
                        trigger,
                        chatId: chatId,
                        messageId,
                        ...(isGuest ? { messages } : {}),
                        message:
                            trigger === 'regenerate-message' &&
                                messageToRegenerate?.role === 'user'
                                ? messageToRegenerate
                                : trigger === 'submit-message'
                                    ? lastMessage
                                    : undefined,
                        isNewChat:
                            trigger === 'submit-message' &&
                            messages.length === 1 &&
                            savedMessages.length === 0,
                        ragScope: getScopeFromCookie()
                    }
                }
            }
        }),
        messages: savedMessages,
        onFinish: () => {
            window.dispatchEvent(new CustomEvent('chat-history-updated'))
        },
        onError: error => {
            const errorMessage = error.message?.toLowerCase() || ''
            const isRateLimit =
                error.message?.includes('429') ||
                errorMessage.includes('rate limit') ||
                errorMessage.includes('too many requests') ||
                errorMessage.includes('daily limit')

            const isAuthError =
                error.message?.includes('401') ||
                errorMessage.includes('unauthorized') ||
                errorMessage.includes('authentication required')

            if (isRateLimit) {
                let parsedError: {
                    error?: string
                    resetAt?: number
                    remaining?: number
                } = {}
                try {
                    const jsonMatch = error.message?.match(/\{.*\}/)
                    if (jsonMatch) {
                        parsedError = JSON.parse(jsonMatch[0])
                    }
                } catch {
                }

                const userMessage =
                    parsedError.error ||
                    'You have reached your daily limit for quality mode chat requests.'

                setErrorModal({
                    open: true,
                    type: 'rate-limit',
                    message: userMessage,
                    details: undefined
                })
            } else if (isAuthError) {
                setErrorModal({
                    open: true,
                    type: 'auth',
                    message: error.message
                })
            } else if (
                error.message?.includes('403') ||
                errorMessage.includes('forbidden')
            ) {
                setErrorModal({
                    open: true,
                    type: 'forbidden',
                    message: error.message
                })
            } else {
                toast.error(`Error in chat: ${error.message}`)
            }
        },
        experimental_throttle: 100,
        generateId
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
    }

    const sections = useMemo<ChatSection[]>(() => {
        const result: ChatSection[] = []
        let currentSection: ChatSection | null = null

        for (const message of messages) {
            if (message.role === 'user') {
                if (currentSection) {
                    result.push(currentSection)
                }
                currentSection = {
                    id: message.id,
                    userMessage: message,
                    assistantMessages: []
                }
            } else if (currentSection && message.role === 'assistant') {
                currentSection.assistantMessages.push(message)
            }
        }

        if (currentSection) {
            result.push(currentSection)
        }

        return result
    }, [messages])

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('messages-changed', {
                detail: { hasMessages: messages.length > 0 }
            })
        )
    }, [messages.length])

    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container
            const threshold = 50
            if (scrollHeight - scrollTop - clientHeight < threshold) {
                setIsAtBottom(true)
            } else {
                setIsAtBottom(false)
            }
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()

        return () => container.removeEventListener('scroll', handleScroll)
    }, [messages.length])

    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const { scrollTop, scrollHeight, clientHeight } = container
        const threshold = 50
        if (scrollHeight - scrollTop - clientHeight < threshold) {
            setIsAtBottom(true)
        } else {
            setIsAtBottom(false)
        }
    }, [messages])

    useEffect(() => {
        const isCurrentChat =
            window.location.pathname === `/search/${chatId}` ||
            (window.location.pathname === '/' && sections.length > 0)

        if (isCurrentChat && sections.length > 0) {
            const lastMessage = messages[messages.length - 1]
            if (lastMessage && lastMessage.role === 'user') {
                const sectionId = lastMessage.id
                requestAnimationFrame(() => {
                    const sectionElement = document.getElementById(`section-${sectionId}`)
                    sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                })
            }
        }
    }, [sections, messages, chatId])

    const onQuerySelect = (query: string) => {
        sendMessage({
            role: 'user',
            parts: [{ type: 'text', text: query }]
        })
    }

    const handleUpdateAndReloadMessage = async (
        editedMessageId: string,
        newContentText: string
    ) => {
        if (!chatId) {
            toast.error('Chat ID is missing.')
            return
        }

        try {
            setMessages(prevMessages => {
                const messageIndex = prevMessages.findIndex(
                    m => m.id === editedMessageId
                )
                if (messageIndex === -1) return prevMessages

                const updatedMessages = [...prevMessages]
                updatedMessages[messageIndex] = {
                    ...updatedMessages[messageIndex],
                    parts: [{ type: 'text', text: newContentText }],
                    content: newContentText
                }

                return updatedMessages
            })

            await regenerate({ messageId: editedMessageId })
        } catch (error) {
            console.error('Error during message edit and reload process:', error)
            toast.error(
                `Error processing edited message: ${(error as Error).message}`
            )
        }
    }

    const handleReloadFrom = async (reloadFromFollowerMessageId: string) => {
        if (!chatId) {
            toast.error('Chat ID is missing for reload.')
            return
        }

        try {
            await regenerate({ messageId: reloadFromFollowerMessageId })
        } catch (error) {
            console.error(
                `Error during reload from message ${reloadFromFollowerMessageId}:`,
                error
            )
            toast.error(`Failed to reload conversation: ${(error as Error).message}`)
        }
    }

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const uploaded = uploadedFiles.filter(f => f.status === 'uploaded')

        if (input.trim() || uploaded.length > 0) {
            const parts: any[] = []

            if (input.trim()) {
                parts.push({ type: 'text', text: input })
            }

            uploaded.forEach(f => {
                parts.push({
                    type: 'file',
                    url: f.url!,
                    filename: f.name!,
                    mediaType: f.file.type
                })
            })

            sendMessage({ role: 'user', parts })
            setInput('')
            setUploadedFiles([])

            if (!isGuest && window.location.pathname === '/') {
                window.history.pushState({}, '', `/search/${chatId}`)
            }
        }
    }

    const { isDragging, handleDragOver, handleDragLeave, handleDrop } =
        useFileDropzone({
            uploadedFiles,
            setUploadedFiles,
            chatId: chatId
        })
    const guestDragHandlers = {
        isDragging: false,
        handleDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
        },
        handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
        },
        handleDrop: (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
        }
    }
    const dragHandlers = isGuest
        ? guestDragHandlers
        : { isDragging, handleDragOver, handleDragLeave, handleDrop }

    return (
        <div
            className={cn(
                'relative flex h-full min-w-0 flex-1 flex-col',
                messages.length === 0 ? 'items-center justify-center' : ''
            )}
            data-testid="full-chat"
            onDragOver={dragHandlers.handleDragOver}
            onDragLeave={dragHandlers.handleDragLeave}
            onDrop={dragHandlers.handleDrop}
        >
            <ChatMessages
                sections={sections}
                onQuerySelect={onQuerySelect}
                status={status}
                chatId={chatId}
                isGuest={isGuest}
                addToolResult={({
                    toolCallId,
                    result
                }: {
                    toolCallId: string
                    result: any
                }) => {
                    let toolName = 'unknown'

                    outerLoop: for (const message of messages) {
                        if (!message.parts) continue

                        for (const part of message.parts) {
                            if (isToolCallPart(part) && part.toolCallId === toolCallId) {
                                toolName = part.toolName
                                break outerLoop
                            } else if (
                                isToolTypePart(part) &&
                                part.toolCallId === toolCallId
                            ) {
                                toolName = part.type.substring(5)
                                break outerLoop
                            } else if (
                                isDynamicToolPart(part) &&
                                part.toolCallId === toolCallId
                            ) {
                                toolName = part.toolName
                                break outerLoop
                            }
                        }
                    }

                    addToolResult({ tool: toolName, toolCallId, output: result })
                }}
                scrollContainerRef={scrollContainerRef}
                onUpdateMessage={handleUpdateAndReloadMessage}
                reload={handleReloadFrom}
                error={error}
            />
            <ChatPanel
                chatId={chatId}
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={onSubmit}
                status={status}
                messages={messages}
                setMessages={setMessages}
                stop={stop}
                query={query}
                append={(message: any) => {
                    sendMessage(message)
                }}
                showScrollToBottomButton={!isAtBottom}
                uploadedFiles={uploadedFiles}
                setUploadedFiles={setUploadedFiles}
                scrollContainerRef={scrollContainerRef}
                onNewChat={handleNewChat}
                isGuest={isGuest}
            />
            <DragOverlay visible={dragHandlers.isDragging} />
            <ErrorModal
                open={errorModal.open}
                onOpenChange={open => setErrorModal(prev => ({ ...prev, open }))}
                error={errorModal}
                onRetry={
                    errorModal.type !== 'rate-limit'
                        ? () => {
                            if (messages.length > 0) {
                                const lastUserMessage = messages
                                    .filter(m => m.role === 'user')
                                    .pop()
                                if (lastUserMessage) {
                                    sendMessage(lastUserMessage)
                                }
                            }
                        }
                        : undefined
                }
                onAuthClose={() => {
                    setMessages([])
                    router.push('/')
                }}
            />
        </div>
    )
}
