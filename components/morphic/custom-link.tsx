import { AnchorHTMLAttributes, DetailedHTMLProps } from 'react'
import type { SearchResultItem } from '@/lib/morphic/types'
import { useCitation } from './citation-context'
import { CitationLink } from './citation-link'

type CustomLinkProps = Omit<
    DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>,
    'ref'
>

export function Citing({
    href,
    children,
    className,
    ...props
}: CustomLinkProps) {
    const { citationMaps } = useCitation()
    const childrenText = children?.toString() || ''
    const isCitation = /^[\w-]+$/.test(childrenText)

    let citationData: SearchResultItem | undefined = undefined

    if (isCitation && citationMaps && href) {
        const decodedHref = decodeURI(href)

        for (const toolCallId in citationMaps) {
            const citationMap = citationMaps[toolCallId]
            for (const citationNum in citationMap) {
                if (citationMap[citationNum].url === decodedHref) {
                    citationData = citationMap[citationNum]
                    break
                }
            }
            if (citationData) break
        }
    }

    return (
        <CitationLink
            href={href || '#'}
            className={className}
            citationData={citationData}
            {...props}
        >
            {children}
        </CitationLink>
    )
}
