'use client'

import type { SearchResults as TypeSearchResults } from '@/lib/morphic/types'
import type { ToolPart } from '@/lib/morphic/types/ai'

import { SearchResults } from '../search-results'
import { SearchResultsImageSection } from '../search-results-image'
import { Section, ToolArgsSection } from '../section'
import {
    createVideoSearchResults,
    VideoSearchResults
} from '../video-search-results'

export function SearchArtifactContent({ tool }: { tool: ToolPart<'search'> }) {
    // Handle streaming output states
    const output = tool.state === 'output-available' ? tool.output : undefined
    const searchResults: TypeSearchResults | undefined =
        output?.state === 'complete' && 'results' in output && 'images' in output
            ? (output as unknown as TypeSearchResults)
            : undefined
    const query = (tool.input as { query?: string } | undefined)?.query

    const hasResults =
        searchResults &&
        ((searchResults.results && searchResults.results.length > 0) ||
            (searchResults.videos && searchResults.videos.length > 0) ||
            (searchResults.images && searchResults.images.length > 0))

    if (!hasResults) {
        return <div className="p-4">No search results</div>
    }

    return (
        <div className="space-y-2">
            <div className="pb-2">
                <ToolArgsSection
                    tool="search"
                    number={
                        (searchResults.results?.length || 0) +
                        (searchResults.videos?.length || 0) +
                        (searchResults.images?.length || 0)
                    }
                >{`${query}`}</ToolArgsSection>
            </div>

            {searchResults.images && searchResults.images.length > 0 && (
                <SearchResultsImageSection
                    images={searchResults.images}
                    query={query}
                    displayMode="full"
                />
            )}

            {searchResults.videos && searchResults.videos.length > 0 && (
                <Section title="Videos">
                    <VideoSearchResults
                        results={createVideoSearchResults(searchResults, query || '')}
                    />
                </Section>
            )}

            {searchResults.results && searchResults.results.length > 0 && (
                <Section title="Sources">
                    <SearchResults results={searchResults.results} displayMode="list" />
                </Section>
            )}
        </div>
    )
}
