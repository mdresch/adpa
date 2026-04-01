'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Textarea from 'react-textarea-autosize'
import { UseChatHelpers } from '@ai-sdk/react'
import { ArrowUp, ChevronDown, MessageCirclePlus, Square } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import type { UploadedFile } from '@/lib/morphic/types'
import type { UIDataTypes, UIMessage, UITools } from '@/lib/morphic/types/ai'
import { cn } from '@/lib/morphic/utils'
import { ActionButtons } from './action-buttons'
import { useArtifact } from './artifact/artifact-context'
import { FileUploadButton } from './file-upload-button'
import { ModelTypeSelector } from './model-type-selector'
import { RAGScopeSelector } from './rag-scope-selector'
import { SearchModeSelector } from './search-mode-selector'
import { Button } from './ui/button'
import { IconBlinkingLogo } from './ui/icons'
import { UploadedFileList } from './uploaded-file-list'
import { Switch } from './ui/switch'
import { Label } from '@/components/ui/label'
import { generateId } from '@/lib/morphic/db/schema'


const INPUT_UPDATE_DELAY_MS = 10

interface ChatPanelProps {
    chatId: string
    input: string
    handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
    status: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>>['status']
    messages: UIMessage[]
    setMessages: (messages: UIMessage[]) => void
    query?: string
    stop: () => void
    append: (message: any) => void
    showScrollToBottomButton: boolean
    scrollContainerRef: React.RefObject<HTMLDivElement>
    uploadedFiles: UploadedFile[]
    setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
    onNewChat?: () => void
    isGuest?: boolean
}

export function ChatPanel({
    chatId,
    input,
    handleInputChange,
    handleSubmit,
    status,
    messages,
    setMessages,
    query,
    stop,
    append,
    showScrollToBottomButton,
    uploadedFiles,
    setUploadedFiles,
    scrollContainerRef,
    onNewChat,
    isGuest = false
}: ChatPanelProps) {
    const router = useRouter()
    const inputRef: React.MutableRefObject<HTMLTextAreaElement | null> = useRef(null)
    const isFirstRender: React.MutableRefObject<boolean> = useRef(true)
    const [isComposing, setIsComposing] = useState(false)
    const [enterDisabled, setEnterDisabled] = useState(false)
    const [isInputFocused, setIsInputFocused] = useState(false)
    const [isAgentMode, setIsAgentMode] = useState(false)
    const [agentResponse, setAgentResponse] = useState<string | null>(null)
    const { close: closeArtifact } = useArtifact()
    const isLoading = status === 'submitted' || status === 'streaming'

    const handleCompositionStart = () => setIsComposing(true)

    const handleCompositionEnd = () => {
        setIsComposing(false)
        setEnterDisabled(true)
        setTimeout(() => {
            setEnterDisabled(false)
        }, 300)
    }

    const handleNewChat = () => {
        setMessages([])
        closeArtifact()
        setIsInputFocused(false)
        inputRef.current?.blur()
        onNewChat?.()
        router.push('/')
    }

    const handleAgentSubmit = async (goal: string) => {
        if (!goal.trim()) return;

        append({
            id: generateId(),
            role: 'user',
            content: goal,
        });

        setAgentResponse('Agent is thinking...');

        try {
            const response = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Agent request failed');
            }

            const result = await response.json();
            
            append({
                id: generateId(),
                role: 'assistant',
                content: result.response,
                // trace: result.trace // Can be used later to show agent thoughts
            });
            setAgentResponse(null);

        } catch (error: any) {
            toast.error(error.message);
            setAgentResponse(null);
            append({
                id: generateId(),
                role: 'assistant',
                content: `Error: ${error.message}`,
            });
        }
    };

    const isToolInvocationInProgress = () => {
        if (!messages.length) return false

        const lastMessage = messages[messages.length - 1]
        if (lastMessage.role !== 'assistant' || !lastMessage.parts) return false

        const parts = lastMessage.parts
        const lastPart = parts[parts.length - 1]

        return (
            (lastPart?.type === 'tool-search' ||
                lastPart?.type === 'tool-fetch' ||
                lastPart?.type === 'tool-askQuestion') &&
            ((lastPart as any)?.state === 'input-streaming' ||
                (lastPart as any)?.state === 'input-available')
        )
    }

    useEffect(() => {
        if (isFirstRender.current && query && query.trim().length > 0) {
            append({
                role: 'user',
                content: query
            })
            isFirstRender.current = false
        }
    }, [query, append])

    const handleFileRemove = useCallback(
        (index: number) => {
            setUploadedFiles(prev => prev.filter((_, i) => i !== index))
        },
        [setUploadedFiles]
    )

    const handleScrollToBottom = () => {
        const scrollContainer = scrollContainerRef.current
        if (scrollContainer) {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            })
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                'w-full bg-transparent group/form-container shrink-0 z-50',
                messages.length > 0 ? 'sticky bottom-0 px-2 pb-4' : 'px-6'
            )}
        >
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none -z-10" />
            
            {messages.length === 0 && (
                <div className="mb-10 flex flex-col items-center gap-4">
                    <IconBlinkingLogo className="size-12" />
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground/90">
                        How can I help you research today?
                    </h1>
                </div>
            )}
            {uploadedFiles.length > 0 && (
                <UploadedFileList files={uploadedFiles} onRemove={handleFileRemove} />
            )}
            <form
                onSubmit={e => {
                    if (isAgentMode) {
                        e.preventDefault();
                        handleAgentSubmit(input);
                        handleInputChange({ target: { value: '' } } as any);
                    } else {
                        handleSubmit(e);
                    }
                    setIsInputFocused(false);
                    inputRef.current?.blur();
                }}
                className={cn('max-w-full md:max-w-3xl w-full mx-auto relative group')}
            >
                {showScrollToBottomButton && messages.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="absolute -top-12 right-4 z-20 size-10 rounded-full shadow-neo-out border-none glass-morphic"
                        onClick={handleScrollToBottom}
                        title="Scroll to bottom"
                    >
                        <ChevronDown size={18} />
                    </Button>
                )}

                <div
                    className={cn(
                        'relative flex flex-col w-full gap-2 bg-secondary/50 rounded-[2rem] border-0 transition-all duration-500 shadow-neo-in focus-bloom group-hover:bg-secondary/70'
                    )}
                >
                    <Textarea
                        ref={inputRef}
                        name="input"
                        rows={2}
                        maxRows={10}
                        tabIndex={0}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        placeholder="Ask anything..."
                        spellCheck={false}
                        value={input}
                        disabled={isLoading || isToolInvocationInProgress()}
                        className="resize-none w-full min-h-12 bg-transparent border-0 p-4 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={handleInputChange}
                        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            if (
                                e.key === 'Enter' &&
                                !e.shiftKey &&
                                !isComposing &&
                                !enterDisabled
                            ) {
                                if (input.trim().length === 0) {
                                    e.preventDefault()
                                    return
                                }
                                e.preventDefault()
                                const textarea = e.target as HTMLTextAreaElement
                                textarea.form?.requestSubmit()
                                setIsInputFocused(false)
                                textarea.blur()
                            }
                        }}
                    />

                    <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                            {!isGuest && (
                                <FileUploadButton
                                    onFileSelect={async files => {
                                        const newFiles: UploadedFile[] = files.map(file => ({
                                            file,
                                            status: 'uploading'
                                        }))
                                        setUploadedFiles(prev => [...prev, ...newFiles])
                                        
                                        const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
                                        
                                        await Promise.all(
                                            newFiles.map(async uf => {
                                                const formData = new FormData()
                                                formData.append('file', uf.file)
                                                formData.append('chatId', chatId)
                                                try {
                                                    const headers: HeadersInit = {}
                                                    if (authToken) {
                                                        headers['Authorization'] = `Bearer ${authToken}`
                                                    }
                                                    
                                                    const res = await fetch('/api/upload', {
                                                        method: 'POST',
                                                        headers,
                                                        body: formData
                                                    })

                                                    if (!res.ok) {
                                                        const errorData = await res.json().catch(() => ({}))
                                                        throw new Error(
                                                            errorData.error ||
                                                            errorData.message ||
                                                            'Upload failed'
                                                        )
                                                    }

                                                    const { file: uploaded } = await res.json()
                                                    setUploadedFiles(prev =>
                                                        prev.map(f =>
                                                            f.file === uf.file
                                                                ? {
                                                                    ...f,
                                                                    status: 'uploaded',
                                                                    url: uploaded.url,
                                                                    name: uploaded.filename,
                                                                    key: uploaded.key
                                                                }
                                                                : f
                                                        )
                                                    )
                                                } catch (e) {
                                                    toast.error(`Failed to upload ${uf.file.name}`)
                                                    setUploadedFiles(prev =>
                                                        prev.map(f =>
                                                            f.file === uf.file ? { ...f, status: 'error' } : f
                                                        )
                                                    )
                                                }
                                            })
                                        )
                                    }}
                                />
                            )}
                            <SearchModeSelector />
                            <RAGScopeSelector />
                            <div className="flex items-center space-x-2">
                                <Switch id="agent-mode" checked={isAgentMode} onCheckedChange={setIsAgentMode} />
                                <Label htmlFor="agent-mode">Agent Mode</Label>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {messages.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleNewChat}
                                    className="shrink-0 rounded-full group"
                                    type="button"
                                    disabled={isLoading}
                                >
                                    <MessageCirclePlus className="size-4 group-hover:rotate-12 transition-all" />
                                </Button>
                            )}
                            {process.env.NEXT_PUBLIC_MORPHIC_CLOUD_DEPLOYMENT !== 'true' && (
                                <ModelTypeSelector disabled={isGuest} />
                            )}
                            <Button
                                type={isLoading ? 'button' : 'submit'}
                                size={'icon'}
                                className={cn(isLoading && 'animate-pulse', 'rounded-full')}
                                disabled={(input.trim().length === 0 && !isLoading) || isToolInvocationInProgress()}
                                onClick={isLoading ? stop : undefined}
                            >
                                {isLoading ? <Square size={20} /> : <ArrowUp size={20} />}
                            </Button>
                        </div>
                    </div>
                </div>

                {messages.length === 0 && (
                    <ActionButtons
                        onSelectPrompt={message => {
                            handleInputChange({
                                target: { value: message }
                            } as React.ChangeEvent<HTMLTextAreaElement>)
                            setTimeout(() => {
                                inputRef.current?.form?.requestSubmit()
                                setIsInputFocused(false)
                                inputRef.current?.blur()
                            }, INPUT_UPDATE_DELAY_MS)
                        }}
                        onCategoryClick={category => {
                            handleInputChange({
                                target: { value: category }
                            } as React.ChangeEvent<HTMLTextAreaElement>)
                            inputRef.current?.focus()
                        }}
                        inputRef={inputRef}
                        className="mt-2"
                    />
                )}
            </form>
        </motion.div>
    )
}

