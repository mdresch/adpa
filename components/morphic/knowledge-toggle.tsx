'use client'

import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'
import { cn } from '@/lib/morphic/utils'
import { getCookie, setCookie } from '@/lib/morphic/utils/cookies'
import { Switch } from './ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export function KnowledgeToggle() {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        const savedValue = getCookie('knowledgeEnabled')
        setEnabled(savedValue === 'true')
    }, [])

    const handleToggle = (val: boolean) => {
        setEnabled(val)
        setCookie('knowledgeEnabled', val ? 'true' : 'false')
    }

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-background border hover:bg-muted/50 transition-colors cursor-pointer group">
                        <Database className={cn(
                            "size-3.5 transition-colors",
                            enabled ? "text-green-500" : "text-muted-foreground group-hover:text-foreground"
                        )} />
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none">Knowledge</span>
                            <Switch
                                checked={enabled}
                                onCheckedChange={handleToggle}
                                className="scale-[0.6] origin-right data-[state=checked]:bg-green-500"
                            />
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {enabled
                        ? "Searching internal knowledge base and system data enabled."
                        : "Enable to search internal research documents and system information."}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
