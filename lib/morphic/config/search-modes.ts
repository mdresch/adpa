import { Search } from 'lucide-react'
import { SearchMode } from '../types/search'
import { IconLogoOutline } from '../../../components/morphic/ui/icons'

export interface SearchModeConfig {
    value: SearchMode
    label: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    color: string
}

export const SEARCH_MODE_CONFIGS: SearchModeConfig[] = [
    {
        value: 'quick',
        label: 'Quick',
        description: 'Streamlined search for fast, concise responses',
        icon: Search,
        color: 'text-amber-500'
    },
    {
        value: 'adaptive',
        label: 'Adaptive',
        description: 'Adaptive agentic search with intelligent query understanding',
        icon: IconLogoOutline,
        color: 'text-violet-500'
    }
]

export function getSearchModeConfig(
    mode: SearchMode
): SearchModeConfig | undefined {
    return SEARCH_MODE_CONFIGS.find(config => config.value === mode)
}
