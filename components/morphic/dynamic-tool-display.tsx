'use client'

import React from 'react'
import type { DynamicToolPart } from '@/lib/morphic/types/dynamic-tools'

interface DynamicToolDisplayProps {
    part: DynamicToolPart
}

export function DynamicToolDisplay({ part }: DynamicToolDisplayProps) {
    const getToolType = (toolName: string) => {
        if (toolName.startsWith('mcp__')) {
            return 'MCP Tool'
        } else if (toolName.startsWith('dynamic__')) {
            return 'Dynamic Tool'
        }
        return 'Custom Tool'
    }

    const getDisplayName = (toolName: string) => {
        if (toolName.startsWith('mcp__')) {
            return toolName.substring(5).replace(/__/g, '.')
        } else if (toolName.startsWith('dynamic__')) {
            return toolName.substring(9)
        }
        return toolName
    }

    const toolType = getToolType(part.toolName)
    const displayName = getDisplayName(part.toolName)

    return (
        <div className="dynamic-tool-container rounded-lg border p-4 my-2">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                    {toolType}
                </span>
                <span className="text-sm font-semibold">{displayName}</span>
            </div>

            {(part.state === 'input-streaming' ||
                part.state === 'input-available' ||
                part.state === 'output-available' ||
                part.state === 'output-error') && (
                    <div className="mb-2">
                        <div className="text-xs text-muted-foreground mb-1">Input:</div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                            <code>{JSON.stringify(part.input, null, 2)}</code>
                        </pre>
                    </div>
                )}

            {part.state === 'output-available' && (
                <div className="mb-2">
                    <div className="text-xs text-muted-foreground mb-1">Output:</div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        <code>{JSON.stringify(part.output, null, 2)}</code>
                    </pre>
                </div>
            )}

            {part.state === 'output-error' && (
                <div className="mb-2">
                    <div className="text-xs text-destructive mb-1">Error:</div>
                    <div className="text-xs bg-destructive/10 text-destructive p-2 rounded">
                        {part.errorText}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 mt-2">
                <div
                    className={`h-2 w-2 rounded-full ${part.state === 'input-streaming'
                            ? 'bg-blue-500 animate-pulse'
                            : part.state === 'input-available'
                                ? 'bg-blue-500'
                                : part.state === 'output-available'
                                    ? 'bg-green-500'
                                    : part.state === 'output-error'
                                        ? 'bg-red-500'
                                        : 'bg-zinc-300'
                        }`}
                />
                <span className="text-xs text-muted-foreground">
                    {part.state === 'input-streaming'
                        ? 'Streaming...'
                        : part.state === 'input-available'
                            ? 'Processing...'
                            : part.state === 'output-available'
                                ? 'Complete'
                                : part.state === 'output-error'
                                    ? 'Failed'
                                    : 'Unknown'}
                </span>
            </div>
        </div>
    )
}
