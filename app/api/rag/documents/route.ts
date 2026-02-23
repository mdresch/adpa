import { NextRequest, NextResponse } from 'next/server'
import {
    uploadTextDocument,
    uploadMarkdownDocument,
    uploadDocument,
    type RAGDocumentMetadata
} from '@/lib/morphic/services/rag-service'

/**
 * POST /api/rag/documents - Upload a document to a File Search store with metadata
 * 
 * Body (JSON for text/markdown):
 * {
 *   storeName: string,
 *   content: string,
 *   contentType: 'text' | 'markdown',
 *   metadata: {
 *     program?: string,
 *     project?: string,
 *     document: string,
 *     entities?: string,
 *     template?: string,
 *     version?: string,
 *     date?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { storeName, content, contentType, metadata } = body

        // Validate required fields
        if (!storeName) {
            return NextResponse.json(
                { success: false, error: 'storeName is required' },
                { status: 400 }
            )
        }
        if (!content) {
            return NextResponse.json(
                { success: false, error: 'content is required' },
                { status: 400 }
            )
        }
        if (!metadata?.document) {
            return NextResponse.json(
                { success: false, error: 'metadata.document is required' },
                { status: 400 }
            )
        }

        const docMetadata: RAGDocumentMetadata = {
            program: metadata.program,
            project: metadata.project,
            document: metadata.document,
            entities: metadata.entities,
            template: metadata.template,
            version: metadata.version,
            date: metadata.date || new Date().toISOString().split('T')[0]
        }

        let result
        if (contentType === 'markdown') {
            result = await uploadMarkdownDocument(storeName, content, docMetadata)
        } else {
            result = await uploadTextDocument(storeName, content, docMetadata)
        }

        return NextResponse.json({
            success: true,
            file: result.file,
            metadata: result.metadata
        })
    } catch (error: any) {
        console.error('[RAG] Failed to upload document:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to upload document' },
            { status: 500 }
        )
    }
}
