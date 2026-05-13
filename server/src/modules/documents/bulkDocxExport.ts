type BulkDocxSourceDocument = {
    id: string
    name?: string | null
    content?: unknown
    metadata?: Record<string, unknown> | null
}

type CombinedDocxExport = {
    title: string
    fileName: string
    markdownContent: string
    metadata: Record<string, unknown>
}

function normalizeDocumentContent(content: unknown): string {
    if (typeof content === 'string') {
        return content
    }

    if (content && typeof content === 'object') {
        const typedContent = content as Record<string, unknown>
        const markdown = typedContent.markdown
        const text = typedContent.text

        if (typeof markdown === 'string') {
            return markdown
        }

        if (typeof text === 'string') {
            return text
        }

        return JSON.stringify(content, null, 2)
    }

    return ''
}

export function buildCombinedDocxExport(documents: BulkDocxSourceDocument[]): CombinedDocxExport {
    const title = 'Combined Project Documents'
    const fileName = 'combined-project-documents.docx'

    const markdownSections = documents.map((doc) => {
        const documentTitle = doc.name?.trim() || 'Untitled Document'
        const documentContent = normalizeDocumentContent(doc.content)

        return [`# ${documentTitle}`, documentContent].filter(Boolean).join('\n\n')
    })

    return {
        title,
        fileName,
        markdownContent: markdownSections.join('\n\n---\n\n'),
        metadata: {
            document_count: documents.length,
            exported_at: new Date().toISOString(),
        },
    }
}
