'use client'

import { useEffect, useState } from 'react'
import { BookOpen, ChevronDown, Globe, Building2, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/morphic/utils'
import { getCookie, setCookie } from '@/lib/morphic/utils/cookies'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './ui/dropdown-menu'

export interface RAGScopeValue {
    program?: string
    project?: string
}

const SCOPE_COOKIE = 'ragScope'

function parseScopeCookie(): RAGScopeValue {
    try {
        const raw = getCookie(SCOPE_COOKIE)
        if (raw) return JSON.parse(raw)
    } catch { }
    return {}
}

function saveScopeCookie(scope: RAGScopeValue) {
    setCookie(SCOPE_COOKIE, JSON.stringify(scope))
}

export function getScopeFromCookie(): RAGScopeValue {
    return parseScopeCookie()
}

interface ScopeOption {
    label: string
    value: RAGScopeValue
    icon: typeof Globe
    description: string
}

const DEFAULT_OPTIONS: ScopeOption[] = [
    {
        label: 'All Knowledge',
        value: {},
        icon: Globe,
        description: 'Search across all programs and projects'
    }
]

export function RAGScopeSelector() {
    const [scope, setScope] = useState<RAGScopeValue>({})
    const [dropdownOpen, setDropdownOpen] = useState(false)

    useEffect(() => {
        setScope(parseScopeCookie())
    }, [])

    const handleSelect = (value: RAGScopeValue) => {
        setScope(value)
        saveScopeCookie(value)
        setDropdownOpen(false)
    }

    const getLabel = (): string => {
        if (scope.project) return scope.project
        if (scope.program) return scope.program
        return 'All'
    }

    const getIcon = () => {
        if (scope.project) return FolderOpen
        if (scope.program) return Building2
        return BookOpen
    }

    const Icon = getIcon()

    return (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="text-sm rounded-full shadow-none gap-1.5 transition-all max-w-[160px]"
                    type="button"
                >
                    <Icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-medium truncate">
                        {getLabel()}
                    </span>
                    <ChevronDown
                        className={cn(
                            'h-3 w-3 ml-0.5 opacity-50 transition-transform duration-200 shrink-0',
                            dropdownOpen && 'rotate-180'
                        )}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64" sideOffset={5}>
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Knowledge Scope
                </div>

                {/* All Knowledge option */}
                <DropdownMenuItem
                    onClick={() => handleSelect({})}
                    className="flex items-start gap-2 py-2 cursor-pointer"
                >
                    <Globe className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">All Knowledge</span>
                        <span className="text-xs text-muted-foreground">
                            Search across all programs and projects
                        </span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
