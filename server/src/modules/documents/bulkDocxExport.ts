type BulkDocxSourceDocument = {
    id: string
    name?: string | null
    content?: unknown
    metadata?: Record<string, unknown> | null
}

export type BulkDocxDocumentSeparator = 'horizontal_rule' | 'page_break'

export type BuildCombinedDocxOptions = {
    branding?: {
        companyName?: string
        tagline?: string
    }
    layout?: {
        documentSeparator?: BulkDocxDocumentSeparator
        bodyFontPt?: 11 | 12
    }
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

function slugFilePart(name: string): string {
    const s = name.trim().replace(/[^a-z0-9._-]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    return s.slice(0, 80) || 'documents'
}

export function buildCombinedDocxExport(
    documents: BulkDocxSourceDocument[],
    options?: BuildCombinedDocxOptions
): CombinedDocxExport {
    const company = options?.branding?.companyName?.trim()
    const title = company ? `${company} — Documents` : 'Combined Project Documents'
    const fileBase = company ? slugFilePart(company) : 'combined-project-documents'
    const fileName = `${fileBase}.docx`

    const separator =
        options?.layout?.documentSeparator === 'page_break'
            ? '\n\n<!--docx-pagebreak-->\n\n'
            : '\n\n---\n\n'

    const markdownSections = documents.map((doc) => {
        const documentTitle = doc.name?.trim() || 'Untitled Document'
        const documentContent = normalizeDocumentContent(doc.content)

        return [`# ${documentTitle}`, documentContent].filter(Boolean).join('\n\n')
    })

    const metadata: Record<string, unknown> = {
        document_count: documents.length,
        exported_at: new Date().toISOString(),
    }
    if (options?.branding?.tagline?.trim()) {
        metadata.Tagline = options.branding.tagline.trim()
    }
    if (company) {
        metadata.Organization = company
    }

    return {
        title,
        fileName,
        markdownContent: markdownSections.join(separator),
        metadata,
    }
}
