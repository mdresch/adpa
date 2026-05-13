import { resolveBulkExportDownloadName } from '@/lib/documents/bulk-export'

describe('resolveBulkExportDownloadName', () => {
  it('prefers the filename from content-disposition', () => {
    const response = new Response(null, {
      headers: {
        'Content-Disposition': 'attachment; filename="bulk-docx-123.zip"',
        'Content-Type': 'application/zip',
      },
    })

    expect(resolveBulkExportDownloadName(response, 'docx', 123)).toBe('bulk-docx-123.zip')
  })

  it('falls back to zip when the response content type is a zip archive', () => {
    const response = new Response(null, {
      headers: {
        'Content-Type': 'application/zip',
      },
    })

    expect(resolveBulkExportDownloadName(response, 'docx', 456)).toBe('documents-export-456.zip')
  })

  it('uses the requested extension when the response is not a zip archive', () => {
    const response = new Response(null, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    })

    expect(resolveBulkExportDownloadName(response, 'docx', 789)).toBe('documents-export-789.docx')
  })
})