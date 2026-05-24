import type { Collection, Document, Filter, WithId } from 'mongodb';

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Alphanumeric ids (e.g. crypto.randomUUID() output without hyphens is not matched — use UUID). */
const LITERAL_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

const INDEX_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Coerce a value to a safe MongoDB equality filter string (prevents operator injection).
 */
export function toMongoEqualityId(value: unknown, label = 'id'): string {
    if (typeof value !== 'string') {
        throw new Error(`Invalid ${label}: must be a string`);
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 128) {
        throw new Error(`Invalid ${label}`);
    }

    if (trimmed.includes('$') || trimmed.includes('.') || trimmed.includes('\0')) {
        throw new Error(`Invalid ${label}`);
    }

    if (!UUID_PATTERN.test(trimmed) && !LITERAL_ID_PATTERN.test(trimmed)) {
        throw new Error(`Invalid ${label}`);
    }

    return trimmed;
}

/** Equality filter for RAG `documents.id` — uses `$eq` so SAST treats input as a literal. */
export function ragDocumentIdFilter(value: unknown): { id: { $eq: string } } {
    return { id: { $eq: toMongoEqualityId(value, 'documentId') } };
}

/** Chunk lookup by document id (camelCase or snake_case field). */
export function ragChunkByDocumentIdFilter(value: unknown): {
    $or: [{ documentId: { $eq: string } }, { document_id: { $eq: string } }];
} {
    const safe = toMongoEqualityId(value, 'documentId');
    return {
        $or: [{ documentId: { $eq: safe } }, { document_id: { $eq: safe } }],
    };
}

/** findOne with validated `$eq` filter — keeps NoSQL-safe queries in one module for SAST. */
export async function findOneByRagDocumentId<T extends Document>(
    collection: Collection<T>,
    documentId: unknown
): Promise<WithId<T> | null> {
    return collection.findOne(ragDocumentIdFilter(documentId) as Filter<T>);
}

/** replaceOne filter with validated `$eq` document id. */
export function ragDocumentIdReplaceFilter(
    documentId: unknown
): { filter: { id: { $eq: string } }; id: string } {
    const filter = ragDocumentIdFilter(documentId);
    return { filter, id: filter.id.$eq };
}

/** Atlas search index names from config — literal string only. */
export function toMongoIndexName(value: unknown, label = 'indexName'): string {
    if (typeof value !== 'string') {
        throw new Error(`Invalid ${label}: must be a string`);
    }

    const trimmed = value.trim();
    if (!INDEX_NAME_PATTERN.test(trimmed)) {
        throw new Error(`Invalid ${label}`);
    }

    return trimmed;
}
