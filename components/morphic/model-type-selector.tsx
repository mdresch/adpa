'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { ModelType } from '@/lib/morphic/types/model-type'
import { getCookie, setCookie } from '@/lib/morphic/utils/cookies'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './ui/dropdown-menu'

const MODEL_TYPE_OPTIONS: { value: ModelType; label: string }[] = [
    { value: 'speed', label: 'Speed' },
    { value: 'quality', label: 'Quality' }
]

interface ModelConfigResponse {
    models: {
        byMode: Record<string, Partial<Record<ModelType, { name: string }>>>
    }
}

export function ModelTypeSelector({
    disabled = false
}: {
    disabled?: boolean
}) {
    const [value, setValue] = useState<ModelType>('speed')
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [modelMapping, setModelMapping] = useState<Record<ModelType, string>>({
        speed: '',
        quality: '',
        related_questions: ''
    })

    useEffect(() => {
        if (disabled) {
            setValue('speed')
            setCookie('modelType', 'speed')
            return
        }
        const savedType = getCookie('modelType')
        if (savedType && ['speed', 'quality'].includes(savedType)) {
            setValue(savedType as ModelType)
        }

        const fetchMapping = async () => {
            try {
                const searchMode = (getCookie('searchMode') || 'quick') as string
                const res = await fetch('/api/morphic/config/models')
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
                
                const data: ModelConfigResponse = await res.json()
                const modeConfig = data?.models?.byMode?.[searchMode] || data?.models?.byMode?.quick
                
                if (modeConfig) {
                    setModelMapping({
                        speed: modeConfig.speed?.name || '',
                        quality: modeConfig.quality?.name || '',
                        related_questions: '' // related_questions is handled separately in static config
                    })
                }
            } catch (err) {
                console.warn('[ModelTypeSelector] Failed to fetch model config:', err)
                // Fallback automatically happens by keeping modelMapping empty
            }
        }

        fetchMapping()
    }, [disabled, dropdownOpen]) // Refresh on dropdown open to stay in sync with search mode

    const handleTypeSelect = (type: ModelType) => {
        if (disabled) return
        setValue(type)
        setCookie('modelType', type)
        setDropdownOpen(false)
    }

    const selectedOption = MODEL_TYPE_OPTIONS.find(opt => opt.value === value)
    const currentModelName = modelMapping[value]

    return (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="text-sm rounded-full shadow-none gap-1 transition-all px-3 py-2 h-auto bg-muted border-none"
                    disabled={disabled}
                >
                    <span className="text-xs font-medium">
                        {selectedOption?.label}
                        {currentModelName && (
                            <span className="ml-1 opacity-60 hidden sm:inline">
                                ({currentModelName})
                            </span>
                        )}
                    </span>
                    <ChevronDown
                        className={`h-3 w-3 ml-0.5 opacity-50 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''
                            }`}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="min-w-[180px]"
                sideOffset={5}
            >
                {MODEL_TYPE_OPTIONS.map(option => {
                    const isSelected = value === option.value
                    const modelName = modelMapping[option.value]
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleTypeSelect(option.value)}
                            className="relative flex flex-col items-start cursor-pointer py-2 px-3 focus:bg-accent focus:text-accent-foreground"
                        >
                            <div className="flex items-center w-full">
                                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                                    {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <span className="text-sm font-medium">{option.label}</span>
                            </div>
                            {modelName && (
                                <div className="pl-6 text-[10px] opacity-50 truncate w-full">
                                    {modelName}
                                </div>
                            )}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
