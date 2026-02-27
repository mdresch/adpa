'use client'
import { SearchIcon, Check } from 'lucide-react'
import { cn } from '@/lib/morphic/utils'
import { StatusIndicator } from './ui/status-indicator'
import { CollapsibleMessage } from './collapsible-message'
import { SearchSkeleton } from './default-skeleton'
import ProcessHeader from './process-header'
import { SearchResults } from './search-results'
import { SearchResultsImageSection } from './search-results-image'
import { Section } from './section'
import { SourceFavicons } from './source-favicons'
import { createVideoSearchResults, VideoSearchResults } from './video-search-results'
import { useArtifact } from './artifact/artifact-context'

export function SearchSection({ tool, isOpen, onOpenChange, status, borderless, isFirst, isLast }: any) {
    const isLoading = status === 'submitted' || status === 'streaming'
    const isToolLoading = tool.state === 'input-streaming' || tool.state === 'input-available'
    const output = tool.state === 'output-available' ? tool.output : undefined
    const isSearching = output?.state === 'searching'
    const searchResults = output?.state === 'complete' ? output : undefined
    const query = tool.input?.query || output?.query || ''

    const { open } = useArtifact()

    const header = (
        <ProcessHeader isLoading={isLoading && (isToolLoading || isSearching)} ariaExpanded={isOpen} onInspect={() => open(tool)} label={<div className="flex items-center gap-2 min-w-0"><SearchIcon size={16} /> <span className="truncate">{query}</span></div>}
            meta={searchResults ? <div className="flex items-center gap-2"><StatusIndicator icon={Check} iconClassName="text-green-500">{searchResults.results?.length || 0} results</StatusIndicator><SourceFavicons results={searchResults.results || []} /></div> : null}
        />
    )

    return (
        <div className="relative">
            <CollapsibleMessage role="assistant" isCollapsible={true} header={header} isOpen={isOpen} onOpenChange={onOpenChange} showIcon={false} showBorder={!borderless} variant="default" headerClickBehavior="split">
                <div className="flex flex-col gap-4">
                    {searchResults?.images?.length > 0 && <Section><SearchResultsImageSection images={searchResults.images} query={query} /></Section>}
                    {searchResults?.videos?.length > 0 && <Section title="Videos"><VideoSearchResults results={createVideoSearchResults(searchResults, query)} /></Section>}
                    {isToolLoading || isSearching ? <SearchSkeleton /> : (searchResults?.results?.length > 0 && <Section title="Sources"><SearchResults results={searchResults.results} /></Section>)}
                </div>
            </CollapsibleMessage>
        </div>
    )
}
