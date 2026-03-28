// Gemini File Search RAG Service

import { genai } from '../utils/gemini-client'

// ─── Types ──────────────────────────────────────────────────────────────

export interface RAGDocumentMetadata {
    program?: string
    project?: string
    document: string
    entities?: string
    template?: string
    version?: string
    date?: string
}

interface FileSearchCustomMetadata {
    key: string
    stringValue?: string
    numericValue?: number
}

// ─── Constants ──────────────────────────────────────────────────────────

const DEFAULT_STORE_DISPLAY_NAME = 'ADPA Knowledge Base'

// Helper to get stores instance lazily
const getStores = () => (genai as any).fileSearchStores

// ─── Store Management ───────────────────────────────────────────────────

/**
 * Creates a new File Search store.
 */
export async function createStore(displayName: string = DEFAULT_STORE_DISPLAY_NAME) {
    const store = await getStores().create({ displayName })
    return store
}

/**
 * Gets an existing File Search store by name.
 */
export async function getStore(storeName: string) {
    const store = await getStores().get({ name: storeName })
    return store
}

/**
 * Lists all File Search stores.
 */
export async function listStores() {
    const result = await getStores().list()
    // The SDK returns a Pager object; collect all items
    const items: any[] = []
    if (result && Symbol.asyncIterator in result) {
        for await (const item of result) {
            items.push(item)
        }
    } else if (Array.isArray(result)) {
        items.push(...result)
    }
    return items
}

/**
 * Deletes a File Search store.
 */
export async function deleteStore(storeName: string) {
    await getStores().delete({ name: storeName })
}

/**
 * Gets or creates the tenant's File Search store.
 */
export async function getOrCreateStore(tenantId: string = 'default') {
    const displayName = `ADPA - ${tenantId}`

    // Check if store exists by listing and filtering
    const allStores = await listStores()
    const existing = allStores.find((s: any) => s.displayName === displayName)

    if (existing) {
        return existing
    }

    return await createStore(displayName)
}

// ─── Document Management ────────────────────────────────────────────────

/**
 * Converts RAGDocumentMetadata to Gemini's custom_metadata format.
 */
function toCustomMetadata(metadata: RAGDocumentMetadata): FileSearchCustomMetadata[] {
    const entries: FileSearchCustomMetadata[] = []

    if (metadata.program) entries.push({ key: 'program', stringValue: metadata.program })
    if (metadata.project) entries.push({ key: 'project', stringValue: metadata.project })
    if (metadata.document) entries.push({ key: 'document', stringValue: metadata.document })
    if (metadata.entities) entries.push({ key: 'entities', stringValue: metadata.entities })
    if (metadata.template) entries.push({ key: 'template', stringValue: metadata.template })
    if (metadata.version) entries.push({ key: 'version', stringValue: metadata.version })
    if (metadata.date) entries.push({ key: 'date', stringValue: metadata.date })

    return entries
}

/**
 * Uploads a file to the File API and imports it into a File Search store with metadata.
 */
export async function uploadDocument(
    storeName: string,
    file: {
        content: string
        mimeType: string
        displayName: string
    },
    metadata: RAGDocumentMetadata
) {
    // Upload the file to the File API
    const uploadedFile = await (genai.files as any).upload({
        file: new Blob([file.content], { type: file.mimeType }),
        config: {
            displayName: file.displayName,
            mimeType: file.mimeType
        }
    })

    if (!uploadedFile.name) {
        throw new Error('File upload failed: no file name returned')
    }

    // Import into the File Search store with metadata
    const operation = await getStores().importFile({
        fileSearchStoreName: storeName,
        fileName: uploadedFile.name,
        config: {
            customMetadata: toCustomMetadata(metadata)
        }
    })

    return {
        file: uploadedFile,
        operation,
        metadata
    }
}

/**
 * Uploads text content directly to a File Search store.
 */
export async function uploadTextDocument(
    storeName: string,
    content: string,
    metadata: RAGDocumentMetadata
) {
    return uploadDocument(
        storeName,
        { content, mimeType: 'text/plain', displayName: metadata.document },
        metadata
    )
}

/**
 * Uploads markdown content directly to a File Search store.
 */
export async function uploadMarkdownDocument(
    storeName: string,
    content: string,
    metadata: RAGDocumentMetadata
) {
    return uploadDocument(
        storeName,
        { content, mimeType: 'text/markdown', displayName: metadata.document },
        metadata
    )
}

// ─── Query Helpers ──────────────────────────────────────────────────────

export interface RAGScope {
    program?: string
    project?: string
    template?: string
    entities?: string
}

/**
 * Builds an AIP-160 metadata filter string from a RAG scope.
 */
export function buildMetadataFilter(scope: RAGScope): string | undefined {
    const filters: string[] = []

    if (scope.program) filters.push(`program="${scope.program}"`)
    if (scope.project) filters.push(`project="${scope.project}"`)
    if (scope.template) filters.push(`template="${scope.template}"`)
    if (scope.entities) filters.push(`entities="${scope.entities}"`)

    return filters.length > 0 ? filters.join(' AND ') : undefined
}

/**
 * Creates the File Search tool configuration for use with generateContent.
 */
export function createFileSearchToolConfig(storeName: string, scope?: RAGScope) {
    const config: any = {
        fileSearch: {
            fileSearchStoreNames: [storeName],
        }
    }

    if (scope) {
        const filter = buildMetadataFilter(scope)
        if (filter) {
            config.fileSearch.metadataFilter = filter
        }
    }

    return config
}
