import type { SearchResultItem, SearchResults } from '@/lib/morphic/types'
import type { UIMessage } from '@/lib/morphic/types/ai'
import { displayUrlName } from './domain'

function isValidUrl(url: string): boolean {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

export function extractCitationMaps(
    message: UIMessage
): Record<string, Record<number, SearchResultItem>> {
    const citationMaps: Record<string, Record<number, SearchResultItem>> = {}

    if (!message.parts) return citationMaps

    message.parts.forEach((part: any) => {
        if (
            part.type === 'tool-search' &&
            part.state === 'output-available' &&
            part.output &&
            part.toolCallId
        ) {
            const searchResults = part.output as SearchResults
            if (searchResults.citationMap) {
                citationMaps[part.toolCallId] = searchResults.citationMap
            }
        }
    })

    return citationMaps
}

export function extractCitationMapsFromMessages(
    messages: UIMessage[]
): Record<string, Record<number, SearchResultItem>> {
    const combinedCitationMaps: Record<
        string,
        Record<number, SearchResultItem>
    > = {}

    messages.forEach(message => {
        const messageCitationMaps = extractCitationMaps(message)
        Object.assign(combinedCitationMaps, messageCitationMaps)
    })

    return combinedCitationMaps
}

export function processCitations(
    content: string,
    citationMaps: Record<string, Record<number, SearchResultItem>>
): string {
    if (!citationMaps || !content || Object.keys(citationMaps).length === 0) {
        return content || ''
    }

    return content.replace(
        /\[\s*(\d+)\s*\]\(#([^)]+)\)/g,
        (_match, num, toolCallId) => {
            const citationNum = parseInt(num, 10)

            if (isNaN(citationNum) || citationNum < 1 || citationNum > 100) {
                return ''
            }

            const citationMap = citationMaps[toolCallId]
            if (!citationMap) {
                return ''
            }

            const citation = citationMap[citationNum]
            if (!citation || !isValidUrl(citation.url)) {
                return ''
            }

            const domainName = displayUrlName(citation.url)
            return `[${domainName}](${encodeURI(citation.url)})`
        }
    )
}
