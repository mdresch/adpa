type BulkExportFormat = 'pdf' | 'docx' | 'markdown'

function getExtensionFromContentType(contentType: string | null, format: BulkExportFormat): string {
  const normalized = contentType?.toLowerCase() ?? ''

  if (normalized.includes('application/zip')) {
    return 'zip'
  }

  if (format === 'markdown') {
    return 'zip'
  }

  return format
}

function getFilenameFromContentDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const standardMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return standardMatch?.[1] ?? null
}

export function resolveBulkExportDownloadName(
  response: Pick<Response, 'headers'>,
  format: BulkExportFormat,
  timestamp = Date.now(),
): string {
  const contentDisposition = response.headers.get('Content-Disposition')
  const fromHeader = getFilenameFromContentDisposition(contentDisposition)

  if (fromHeader) {
    return fromHeader
  }

  const extension = getExtensionFromContentType(response.headers.get('Content-Type'), format)
  return `documents-export-${timestamp}.${extension}`
}
