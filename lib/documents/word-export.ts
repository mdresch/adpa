/**
 * Types for Document Library → Export to Word (bulk) dialog and API payload.
 */

export type WordBulkExportMode = 'combined' | 'per_document_zip'

export type WordDocumentSeparator = 'horizontal_rule' | 'page_break'

export interface WordBulkExportBranding {
  companyName?: string
  tagline?: string
  /**
   * Optional logo as a data URL: `data:image/png;base64,...` (jpeg/gif also supported).
   * The server rejects oversized payloads for safety.
   */
  logoDataUrl?: string
}

/** Visual cover layout before body content (combined and per-document ZIP). */
export type WordCoverTemplate = 'minimal' | 'corporate' | 'bold'

export interface WordBulkExportLayout {
  /** How to separate documents in combined mode */
  documentSeparator?: WordDocumentSeparator
  bodyFontPt?: 11 | 12
  /** Cover page design (default in UI: minimal). */
  coverTemplate?: WordCoverTemplate
  /** Primary brand color, e.g. `#2563eb` (headings / accents). */
  primaryColor?: string
  /** Secondary accent color, e.g. `#64748b`. */
  secondaryColor?: string
  /**
   * Insert a Word TOC field after the cover. Word fills entries from heading styles when the user
   * updates fields (e.g. Ctrl+A, F9, or “Update table” on the TOC).
   */
  includeTableOfContents?: boolean
}

export interface WordBulkExportRequest {
  document_ids: string[]
  mode: WordBulkExportMode
  branding?: WordBulkExportBranding
  layout?: WordBulkExportLayout
}

/** Options from the export dialog (caller supplies document_ids). */
export type WordBulkExportDialogValues = Omit<WordBulkExportRequest, 'document_ids'>;