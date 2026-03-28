import { SearchMode } from '../types/search'
// Remove React dependency for backend compatibility

export interface SearchModeConfig {
    value: SearchMode
    label: string
    description: string
    icon: 'search' | 'logo'
    color: string
}

export const SEARCH_MODE_CONFIGS: SearchModeConfig[] = [
    {
        value: 'quick',
        label: 'Quick',
        description: 'Streamlined search for fast, concise responses',
        icon: 'search',
        color: 'text-amber-500'
    },
    {
        value: 'adaptive',
        label: 'Adaptive',
        description: 'Adaptive agentic search with intelligent query understanding',
        icon: 'logo',
        color: 'text-violet-500'
    }
]

export function getSearchModeConfig(
    mode: SearchMode
): SearchModeConfig | undefined {
    return SEARCH_MODE_CONFIGS.find(config => config.value === mode)
}
