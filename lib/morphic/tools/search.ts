import { tool, UIToolInvocation } from 'ai'

import { getSearchSchemaForModel } from '@/lib/morphic/schema/search'
import { SearchResultItem, SearchResults } from '@/lib/morphic/types'
import {
    getGeneralSearchProviderType,
    getSearchToolDescription
} from '@/lib/morphic/utils/search-config'
import { getBaseUrlString } from '@/lib/morphic/utils/url'

import {
    createSearchProvider,
    DEFAULT_PROVIDER,
    SearchProviderType
} from './search/providers'

/**
 * Creates a search tool with the appropriate schema for the given model.
 */
export function createSearchTool(fullModel: string) {
    return tool({
        description: getSearchToolDescription(),
        inputSchema: getSearchSchemaForModel(fullModel),
        execute: async function* (options, context) {
            const {
                query,
                type = 'optimized',
                content_types = ['web'],
                max_results = 20,
                search_depth = 'basic',
                include_domains = [],
                exclude_domains = []
            } = options as any

            yield {
                state: 'searching',
                query
            }

            // Ensure max_results is at least 10
            const minResults = 10
            const effectiveMaxResults = Math.max(
                max_results || minResults,
                minResults
            )
            const effectiveSearchDepth = search_depth as 'basic' | 'advanced'

            const filledQuery = query
            let searchResult: SearchResults

            // Determine which provider to use based on type
            let searchAPI: SearchProviderType
            if (type === 'general') {
                const generalProvider = getGeneralSearchProviderType()
                if (generalProvider) {
                    searchAPI = generalProvider
                } else {
                    searchAPI =
                        (process.env.SEARCH_API as SearchProviderType) || DEFAULT_PROVIDER
                }
            } else {
                searchAPI =
                    (process.env.SEARCH_API as SearchProviderType) || DEFAULT_PROVIDER
            }

            const effectiveSearchDepthForAPI =
                searchAPI === 'searxng' &&
                    process.env.SEARXNG_DEFAULT_DEPTH === 'advanced'
                    ? 'advanced'
                    : effectiveSearchDepth || 'basic'

            try {
                if (
                    searchAPI === 'searxng' &&
                    effectiveSearchDepthForAPI === 'advanced'
                ) {
                    const baseUrl = await getBaseUrlString()
                    const response = await fetch(`${baseUrl}/api/advanced-search`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: filledQuery,
                            maxResults: effectiveMaxResults,
                            searchDepth: effectiveSearchDepthForAPI,
                            includeDomains: include_domains,
                            excludeDomains: exclude_domains
                        })
                    })
                    if (!response.ok) {
                        throw new Error(
                            `Advanced search API error: ${response.status} ${response.statusText}`
                        )
                    }
                    searchResult = await response.json()
                } else {
                    const searchProvider = createSearchProvider(searchAPI)
                    if (searchAPI === 'brave') {
                        searchResult = await searchProvider.search(
                            filledQuery,
                            effectiveMaxResults,
                            effectiveSearchDepthForAPI,
                            include_domains,
                            exclude_domains,
                            {
                                type: type as 'general' | 'optimized',
                                content_types: content_types as Array<
                                    'web' | 'video' | 'image' | 'news'
                                >
                            }
                        )
                    } else {
                        searchResult = await searchProvider.search(
                            filledQuery,
                            effectiveMaxResults,
                            effectiveSearchDepthForAPI,
                            include_domains,
                            exclude_domains
                        )
                    }
                }
            } catch (error) {
                console.error('Search API error:', error)
                throw error instanceof Error ? error : new Error('Unknown search error')
            }

            if (searchResult.results && searchResult.results.length > 0) {
                const citationMap: Record<number, SearchResultItem> = {}
                searchResult.results.forEach((result, index) => {
                    citationMap[index + 1] = result
                })
                searchResult.citationMap = citationMap
            }

            if (context?.toolCallId) {
                searchResult.toolCallId = context.toolCallId
            }

            yield {
                state: 'complete' as const,
                ...searchResult
            }
            // Return a simplified string version of results to the LLM to prevent context overflow or JSON schema parsing errors
            if (searchResult.results?.length) {
                return JSON.stringify({
                    query: searchResult.query,
                    results: searchResult.results.map(r => ({ title: r.title, content: r.content, url: r.url }))
                })
            }
            return 'No results found.'
        }
    })
}

// Default export for backward compatibility, using a default model
export const searchTool = createSearchTool('openai:gpt-4o-mini')

// Export type for UI tool invocation
export type SearchUIToolInvocation = UIToolInvocation<any>

export async function search(
    query: string,
    maxResults: number = 10,
    searchDepth: 'basic' | 'advanced' = 'basic',
    includeDomains: string[] = [],
    excludeDomains: string[] = []
): Promise<SearchResults> {
    const generator = (searchTool as any).execute?.(
        {
            query,
            type: 'general',
            content_types: ['web'],
            max_results: maxResults,
            search_depth: searchDepth,
            include_domains: includeDomains,
            exclude_domains: excludeDomains
        },
        {
            toolCallId: 'search',
            messages: []
        }
    )

    if (!generator) {
        return { results: [], images: [], query, number_of_results: 0 }
    }

    let finalResult: any = null

    // Consume the generator to get the final 'complete' state
    if (Symbol.asyncIterator in generator) {
        for await (const partial of generator) {
            if (partial && typeof partial === 'object' && 'state' in partial && partial.state === 'complete') {
                finalResult = partial
            }
        }
    } else {
        // Fallback for cases where it might return a promise instead of a generator
        finalResult = await generator
    }

    if (!finalResult) {
        return { results: [], images: [], query, number_of_results: 0 }
    }

    const { state, ...rest } = finalResult
    return rest as SearchResults
}
