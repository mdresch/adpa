import { buildMongoChunkDocument, mongoProjectFilter } from '../../lib/mongoChunkSchema';

describe('mongoChunkSchema', () => {
  it('buildMongoChunkDocument includes camelCase and snake_case fields', () => {
    const doc = buildMongoChunkDocument(
      {
        documentId: 'doc-1',
        content: 'hello world',
        embedding: [0.1, 0.2],
        projectId: 'proj-1',
        metadata: { chunkIndex: 2, section: 'intro' },
        chunkIndex: 2,
      },
      'chunk-1'
    );

    expect(doc.id).toBe('chunk-1');
    expect(doc.documentId).toBe('doc-1');
    expect(doc.document_id).toBe('doc-1');
    expect(doc.project_id).toBe('proj-1');
    expect(doc.metadata.projectId).toBe('proj-1');
    expect(doc.chunk_index).toBe(2);
  });

  it('mongoProjectFilter matches both project_id and metadata.projectId', () => {
    expect(mongoProjectFilter('proj-1')).toEqual({
      $or: [{ project_id: 'proj-1' }, { 'metadata.projectId': 'proj-1' }],
    });
  });
});
