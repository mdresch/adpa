// Gemini File Search Tool for Researcher Agent

import { tool } from 'ai'
import { z } from 'zod'
import { genai } from '../utils/gemini-client'
import {
    type RAGScope,
    buildMetadataFilter
} from '../services/rag-service'

/**
 * Creates a File Search tool for the researcher agent.
 * Uses Gemini's native File Search to query ADPA's knowledge base
 * with optional metadata filtering by program/project/template.
 */
export function createFileSearchTool(storeName: string, scope?: RAGScope) {
    return tool({
        description:
            'Search the internal ADPA knowledge base for project documents, risk assessments, project charters, and other organizational knowledge. ' +
            'Use this tool when the user asks questions about their projects, documents, risks, stakeholders, or any internal organizational information. ' +
            'This searches through uploaded project documents using semantic search.',
        inputSchema: z.object({
            query: z.string().describe('The search query to find relevant internal documents.'),
        }),
        execute: async function* ({ query }) {
            yield { state: 'searching' as const, query, source: 'file-search' }

            try {
                // Build the File Search tool config
                const fileSearchConfig: any = {
                    fileSearch: {
                        fileSearchStoreNames: [storeName],
                    }
                }

                // Apply metadata filter if scope is provided
                if (scope) {
                    const filter = buildMetadataFilter(scope)
                    if (filter) {
                        fileSearchConfig.fileSearch.metadataFilter = filter
                    }
                }

                // Use Gemini's generateContent with File Search tool
                const response = await genai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: query,
                    config: {
                        tools: [fileSearchConfig],
                    }
                })

                // Extract grounding metadata and citations
                const groundingMetadata = (response as any).candidates?.[0]?.groundingMetadata
                const chunks = groundingMetadata?.groundingChunks || []
                const supports = groundingMetadata?.groundingSupports || []

                // Build search results from grounding chunks
                const results = chunks.map((chunk: any, index: number) => ({
                    title: chunk.retrievedContext?.title || `Document ${index + 1}`,
                    url: chunk.retrievedContext?.uri || '',
                    content: supports[index]?.segment?.text || '',
                    score: supports[index]?.confidenceScores?.[0] || 0
                }))

                // Get the generated text response
                const text = response.text || ''

                yield {
                    state: 'complete' as const,
                    query,
                    source: 'file-search',
                    answer: text,
                    results,
                    resultCount: results.length
                }

                return {
                    answer: text,
                    results,
                    query,
                    source: 'file-search'
                }
            } catch (error) {
                console.error('[FileSearch] Error:', error)
                yield {
                    state: 'output-error' as const,
                    error: `File Search failed: ${error instanceof Error ? error.message : String(error)}`
                }
                return error
            }
        }
    })
}
