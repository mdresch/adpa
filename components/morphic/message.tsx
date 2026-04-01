'use client'

import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { Streamdown } from 'streamdown'

import type { SearchResultItem } from '@/lib/morphic/types'
import { cn } from '@/lib/morphic/utils'
import { processCitations } from '@/lib/morphic/utils/citation'

import { CitationProvider } from './citation-context'
import { Citing } from './custom-link'

import 'katex/dist/katex.min.css'

import { motion } from 'framer-motion'

export function MarkdownMessage({
    message,
    className,
    citationMaps
}: {
    message: string
    className?: string
    citationMaps?: Record<string, Record<number, SearchResultItem>>
}) {
    // Process citations to replace [number](#toolCallId) with [number](actual-url)
    const processedMessage = processCitations(message || '', citationMaps || {})

    // Define custom components for links
    const customComponents = {
        a: Citing
    }

    return (
        <CitationProvider citationMaps={citationMaps}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn(
                    'prose-sm prose-neutral prose-a:text-accent-foreground/50 glass-morphic p-4 rounded-3xl animate-rising',
                    className
                )}
            >
                <Streamdown
                    rehypePlugins={[
                        [rehypeExternalLinks, { target: '_blank' }],
                        [rehypeKatex]
                    ]}
                    remarkPlugins={[remarkGfm, remarkMath]}
                    components={customComponents}
                >
                    {processedMessage}
                </Streamdown>
            </motion.div>
        </CitationProvider>
    )
}
