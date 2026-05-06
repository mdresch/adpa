import { tool } from 'ai'
import { z } from 'zod'

import { SearchResultItem, SearchResults } from '@/lib/morphic/types'

import { createSearchProvider, SearchProviderType } from './search/providers'

/**
 * Deduplicates search results by URL, preserving the first occurrence.
 */
function deduplicateByUrl(results: SearchResultItem[]): SearchResultItem[] {
    const seen = new Set<string>()
    return results.filter(r => {
        if (seen.has(r.url)) return false
        seen.add(r.url)
        return true
    })
}

/**
 * Returns the list of search providers that are currently configured
 * (i.e. have an API key set in the environment).
 */
function getAvailableProviders(): SearchProviderType[] {
    const providers: SearchProviderType[] = []
    if (process.env.TAVILY_API_KEY) providers.push('tavily')
    if (process.env.EXA_API_KEY) providers.push('exa')
    if (process.env.BRAVE_SEARCH_API_KEY) providers.push('brave')
    // Do not add a fallback here: if no provider is configured, the tool
    // surfaces a clear error rather than crashing with a missing-key error
    // inside the Tavily provider constructor.
    return providers
}

/**
 * Creates a search tool that fans out to all configured providers in parallel,
 * merges the results, and deduplicates by URL.
 *
 * This tool is intended for Deep Research mode where breadth of coverage matters
 * more than latency. If a provider fails its result is silently skipped so the
 * tool never throws unless ALL providers fail.
 */
export function createParallelSearchTool() {
    return tool({
        description:
            'Search the web using multiple providers simultaneously for maximum result diversity and coverage. Use this for deep research that requires cross-source verification. Results from all configured providers (Tavily, Exa, Brave) are merged and deduplicated.',
        inputSchema: z.object({
            query: z.string().describe('The search query.'),
            max_results_per_provider: z
                .number()
                .optional()
                .default(10)
                .describe('Maximum results to request from each individual provider.')
        }),
        execute: async function* ({ query, max_results_per_provider }, context) {
            yield { state: 'searching' as const, query }

            const providers = getAvailableProviders()

            if (providers.length === 0) {
                yield { state: 'output-error' as const, error: 'No search providers are configured. Set at least one of TAVILY_API_KEY, EXA_API_KEY, or BRAVE_SEARCH_API_KEY.' }
                return 'No results found: no search providers configured.'
            }

            const outcomes = await Promise.allSettled(
                providers.map(providerType =>
                    createSearchProvider(providerType).search(
                        query,
                        max_results_per_provider,
                        'advanced',
                        [],
                        []
                    )
                )
            )

            const allResults: SearchResultItem[] = []
            const allImages: SearchResults['images'] = []
            let successCount = 0

            for (let i = 0; i < outcomes.length; i++) {
                const outcome = outcomes[i]
                if (outcome.status === 'fulfilled' && outcome.value) {
                    allResults.push(...(outcome.value.results ?? []))
                    allImages.push(...(outcome.value.images ?? []))
                    successCount++
                } else if (outcome.status === 'rejected') {
                    console.warn(
                        `[ParallelSearch] Provider '${providers[i]}' failed:`,
                        (outcome.reason as Error)?.message ?? outcome.reason
                    )
                }
            }

            if (successCount === 0) {
                yield { state: 'output-error' as const, error: 'All search providers failed.' }
                return 'No results found.'
            }

            const dedupedResults = deduplicateByUrl(allResults)

            const citationMap: Record<number, SearchResultItem> = {}
            dedupedResults.forEach((r, idx) => {
                citationMap[idx + 1] = r
            })

            const mergedResults: SearchResults = {
                results: dedupedResults,
                images: allImages,
                query,
                number_of_results: dedupedResults.length,
                toolCallId: context?.toolCallId,
                citationMap
            }

            yield { state: 'complete' as const, ...mergedResults }

            if (dedupedResults.length > 0) {
                return JSON.stringify({
                    query,
                    results: dedupedResults.map(r => ({
                        title: r.title,
                        content: r.content,
                        url: r.url
                    }))
                })
            }
            return 'No results found.'
        }
    })
}
