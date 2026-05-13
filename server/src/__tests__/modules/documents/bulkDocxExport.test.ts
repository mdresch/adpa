import { buildCombinedDocxExport } from '../../../modules/documents/bulkDocxExport'

describe('buildCombinedDocxExport', () => {
    it('combines selected documents into one markdown payload for DOCX generation', () => {
        const result = buildCombinedDocxExport([
            {
                id: 'doc-1',
                name: 'First Document',
                content: '# Alpha',
                metadata: { framework: 'PMBOK' },
            },
            {
                id: 'doc-2',
                name: 'Second Document',
                content: { markdown: '## Beta' },
                metadata: { framework: 'BABOK' },
            },
        ])

        expect(result.title).toBe('Combined Project Documents')
        expect(result.fileName).toBe('combined-project-documents.docx')
        expect(result.metadata).toEqual(expect.objectContaining({ document_count: 2 }))
        expect(result.markdownContent).toContain('# First Document')
        expect(result.markdownContent).toContain('# Second Document')
        expect(result.markdownContent).toContain('# Alpha')
        expect(result.markdownContent).toContain('## Beta')
    })
})