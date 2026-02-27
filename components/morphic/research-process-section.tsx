'use client'

import { useCallback, useState } from 'react'
import type { ReasoningPart } from '@ai-sdk/provider-utils'
import { UseChatHelpers } from '@ai-sdk/react'
import { ChevronDown } from 'lucide-react'
import type {
    DataPart as UIDataPart,
    ToolPart,
    UIDataTypes,
    UIMessage,
    UITools
} from '@/lib/morphic/types/ai'
import type { DynamicToolPart } from '@/lib/morphic/types/dynamic-tools'
import { cn } from '@/lib/morphic/utils'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from './ui/collapsible'
import { DataSection } from './data-section'
import { ReasoningSection } from './reasoning-section'
import { ToolSection } from './tool-section'

type TextPart = {
    type: 'text'
    text: string
}

type DataPart = UIDataPart

type MessagePart =
    | ReasoningPart
    | ToolPart
    | TextPart
    | DataPart
    | DynamicToolPart

function isReasoningPart(part: MessagePart): part is ReasoningPart {
    return part.type === 'reasoning'
}

function isToolPart(part: MessagePart): part is ToolPart {
    return (
        (part.type?.startsWith?.('tool-') && part.type !== 'dynamic-tool') ?? false
    )
}

function isTextPart(part: MessagePart): part is TextPart {
    return part.type === 'text'
}

function isDataPart(part: MessagePart): part is DataPart {
    return part.type?.startsWith?.('data-') ?? false
}

type Props = {
    message: UIMessage
    messageId: string
    getIsOpen: (id: string, partType?: string, hasNextPart?: boolean) => boolean
    onOpenChange: (id: string, open: boolean) => void
    onQuerySelect: (query: string) => void
    status?: UseChatHelpers<UIMessage<unknown, UIDataTypes, UITools>>['status']
    addToolResult?: (params: { toolCallId: string; result: any }) => void
    parts?: MessagePart[]
    hasSubsequentText?: boolean
}

function splitByText(parts: MessagePart[]): MessagePart[][] {
    const segments: MessagePart[][] = []
    let currentSegment: MessagePart[] = []

    for (const part of parts || []) {
        if (isTextPart(part)) {
            if (currentSegment.length > 0) {
                segments.push(currentSegment)
                currentSegment = []
            }
        } else {
            currentSegment.push(part)
        }
    }

    if (currentSegment.length > 0) {
        segments.push(currentSegment)
    }

    return segments
}

function groupConsecutiveParts(segment: MessagePart[]): MessagePart[][] {
    if (segment.length === 0) return []

    const groups: MessagePart[][] = []
    let currentIndex = 0

    while (currentIndex < segment.length) {
        const currentPart = segment[currentIndex]

        if (isToolPart(currentPart)) {
            const toolGroup = [currentPart]
            const toolType = currentPart.type

            let nextIndex = currentIndex + 1
            while (
                nextIndex < segment.length &&
                segment[nextIndex].type === toolType
            ) {
                toolGroup.push(segment[nextIndex] as ToolPart)
                nextIndex++
            }

            groups.push(toolGroup)
            currentIndex = nextIndex
        } else {
            groups.push([currentPart])
            currentIndex++
        }
    }

    return groups
}

function useAccordionState(onOpenChange: (id: string, open: boolean) => void) {
    const [openSectionId, setOpenSectionId] = useState<string | null>(null)

    const handleAccordionChange = useCallback(
        (id: string, open: boolean, isSingle: boolean) => {
            if (isSingle) {
                onOpenChange(id, open)
            } else {
                if (open) {
                    setOpenSectionId(id)
                } else {
                    setOpenSectionId(null)
                }
                onOpenChange(id, open)
            }
        },
        [onOpenChange]
    )

    return { openSectionId, handleAccordionChange }
}

function RenderPart({
    part,
    partId,
    hasNext,
    hasSubsequentContent,
    isSingle,
    isFirstGroup,
    isLastGroup,
    groupLength,
    partIndex,
    getIsOpen,
    openSectionId,
    handleAccordionChange,
    status,
    addToolResult,
    onQuerySelect
}: {
    part: MessagePart
    partId: string
    hasNext: boolean
    hasSubsequentContent: boolean
    isSingle: boolean
    isFirstGroup: boolean
    isLastGroup: boolean
    groupLength: number
    partIndex: number
    getIsOpen: (id: string, partType?: string, hasNextPart?: boolean) => boolean
    openSectionId: string | null
    handleAccordionChange: (id: string, open: boolean, isSingle: boolean) => void
    status?: any
    addToolResult?: (params: { toolCallId: string; result: any }) => void
    onQuerySelect: (query: string) => void
}) {
    const hasSubsequent = hasNext || hasSubsequentContent

    if (isReasoningPart(part)) {
        const isOpen = isSingle
            ? getIsOpen(partId, 'reasoning', hasSubsequent)
            : openSectionId === partId

        return (
            <ReasoningSection
                content={{ reasoning: part.text, isDone: !hasNext }}
                isOpen={isOpen}
                onOpenChange={open => handleAccordionChange(partId, open, isSingle)}
                isSingle={isSingle}
                isFirst={isFirstGroup && partIndex === 0}
                isLast={isLastGroup && partIndex === groupLength - 1}
            />
        )
    }

    if (isToolPart(part)) {
        const isOpen = isSingle
            ? getIsOpen(part.toolCallId, part.type, hasSubsequent)
            : openSectionId === part.toolCallId

        return (
            <ToolSection
                tool={part}
                isOpen={isOpen}
                onOpenChange={open =>
                    handleAccordionChange(part.toolCallId, open, isSingle)
                }
                status={status}
                addToolResult={addToolResult}
                onQuerySelect={onQuerySelect}
                borderless={!isSingle}
                isFirst={isFirstGroup && partIndex === 0}
                isLast={isLastGroup && partIndex === groupLength - 1}
            />
        )
    }

    if (isDataPart(part)) {
        return <DataSection part={part} onQuerySelect={onQuerySelect} />
    }

    return null
}

function useHasSubsequentContent(
    segments: MessagePart[][],
    messageParts: MessagePart[] | undefined
) {
    return useCallback(
        (segmentIndex: number): boolean => {
            if (segmentIndex < segments.length - 1) {
                return true
            }

            const lastSegment = segments[segmentIndex]
            if (!lastSegment || lastSegment.length === 0) {
                return false
            }

            const lastPartInSegment = lastSegment[lastSegment.length - 1]
            const remainingParts =
                messageParts?.slice(
                    messageParts.findIndex(p => p === lastPartInSegment) + 1
                ) || []

            return remainingParts.some(p => isTextPart(p))
        },
        [segments, messageParts]
    )
}

export function ResearchProcessSection({
    message,
    messageId,
    getIsOpen,
    onOpenChange,
    onQuerySelect,
    status,
    addToolResult,
    parts: partsOverride,
    hasSubsequentText = false
}: Props) {
    const allParts = (partsOverride ?? (message.parts || [])) as MessagePart[]
    const filteredParts = allParts.filter(p => !(isReasoningPart(p) && !p.text))
    const segments = partsOverride ? [filteredParts] : splitByText(filteredParts)

    const { openSectionId, handleAccordionChange } =
        useAccordionState(onOpenChange)

    const hasSubsequentContent = useHasSubsequentContent(
        segments,
        message.parts as MessagePart[] | undefined
    )

    const [parentOpenStates, setParentOpenStates] = useState<
        Record<string, boolean>
    >({})

    if (segments.length === 0 || segments.every(seg => seg.length === 0))
        return null

    return (
        <div className="space-y-2">
            {segments.map((seg, sidx) => {
                const groups = groupConsecutiveParts(seg)
                const isSingle = groups.length === 1 && groups[0].length === 1
                const containerClass = cn(!isSingle && 'rounded-lg border bg-card')
                const totalParts = seg.length
                const needsParentCollapsible = totalParts >= 5
                const parentId = `${messageId}-parent-${sidx}`
                const isParentOpen =
                    parentOpenStates[parentId] ?? (hasSubsequentText ? false : true)

                const segmentContent = (
                    <div className={containerClass}>
                        {groups.map((grp, gidx) => (
                            <div key={`${messageId}-grp-${sidx}-${gidx}`}>
                                {grp.map((part, pidx) => {
                                    const partId = isToolPart(part)
                                        ? part.toolCallId
                                        : `${messageId}-${part.type}-${sidx}-${gidx}-${pidx}`

                                    return (
                                        <RenderPart
                                            key={partId}
                                            part={part}
                                            partId={partId}
                                            hasNext={pidx < grp.length - 1}
                                            hasSubsequentContent={hasSubsequentContent(sidx)}
                                            isSingle={isSingle}
                                            isFirstGroup={gidx === 0}
                                            isLastGroup={gidx === groups.length - 1}
                                            groupLength={grp.length}
                                            partIndex={pidx}
                                            getIsOpen={getIsOpen}
                                            openSectionId={openSectionId}
                                            handleAccordionChange={handleAccordionChange}
                                            status={status}
                                            addToolResult={addToolResult}
                                            onQuerySelect={onQuerySelect}
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                )

                if (needsParentCollapsible) {
                    return (
                        <Collapsible
                            key={`${messageId}-seg-${sidx}`}
                            open={isParentOpen}
                            onOpenChange={open => {
                                setParentOpenStates(prev => ({ ...prev, [parentId]: open }))
                            }}
                        >
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center px-1 py-0.5 gap-2 text-sm rounded-lg group"
                                >
                                    <span className="font-medium text-muted-foreground group-hover:text-muted-foreground/70">
                                        Research Process ({totalParts} steps)
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            'h-4 w-4 text-muted-foreground group-hover:text-muted-foreground/70 transition-transform duration-200',
                                            isParentOpen && 'rotate-180'
                                        )}
                                    />
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
                                <div className="pt-2">{segmentContent}</div>
                            </CollapsibleContent>
                        </Collapsible>
                    )
                }

                return <div key={`${messageId}-seg-${sidx}`}>{segmentContent}</div>
            })}
        </div>
    )
}

export default ResearchProcessSection
