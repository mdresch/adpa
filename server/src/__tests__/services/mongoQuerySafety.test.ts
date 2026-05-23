import {
    ragChunkByDocumentIdFilter,
    ragDocumentIdFilter,
    ragDocumentIdReplaceFilter,
    toMongoEqualityId,
    toMongoIndexName,
} from '../../lib/mongoQuerySafety';

describe('mongoQuerySafety', () => {
    describe('toMongoEqualityId', () => {
        it('accepts UUID document ids', () => {
            const id = '550e8400-e29b-41d4-a716-446655440000';
            expect(toMongoEqualityId(id)).toBe(id);
        });

        it('rejects operator injection payloads', () => {
            expect(() => toMongoEqualityId({ $gt: '' } as unknown as string)).toThrow();
            expect(() => toMongoEqualityId('{"$gt":""}')).toThrow();
            expect(() => toMongoEqualityId('id.with.dot')).toThrow();
        });
    });

    describe('ragDocumentIdFilter', () => {
        it('uses $eq for document id lookups', () => {
            const id = '550e8400-e29b-41d4-a716-446655440000';
            expect(ragDocumentIdFilter(id)).toEqual({ id: { $eq: id } });
        });
    });

    describe('ragDocumentIdReplaceFilter', () => {
        it('returns filter and id for replaceOne', () => {
            const id = '550e8400-e29b-41d4-a716-446655440000';
            expect(ragDocumentIdReplaceFilter(id)).toEqual({
                filter: { id: { $eq: id } },
                id,
            });
        });
    });

    describe('ragChunkByDocumentIdFilter', () => {
        it('uses $eq on both document id fields', () => {
            const id = '550e8400-e29b-41d4-a716-446655440000';
            expect(ragChunkByDocumentIdFilter(id)).toEqual({
                $or: [{ documentId: { $eq: id } }, { document_id: { $eq: id } }],
            });
        });
    });

    describe('toMongoIndexName', () => {
        it('accepts default vector index name', () => {
            expect(toMongoIndexName('vector_search_index')).toBe('vector_search_index');
        });

        it('rejects invalid index names', () => {
            expect(() => toMongoIndexName('bad index')).toThrow();
            expect(() => toMongoIndexName('index$name')).toThrow();
        });
    });
});
