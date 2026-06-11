import { buildMongoChunkDocument, mongoProjectFilter } from '../../lib/mongoChunkSchema';
import { mongoPortfolioFilter, mongoProgramFilter } from '../../lib/mongoRagHierarchy';

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
    expect(doc.source_type).toBe('document');
    expect(doc.entity_id).toBeNull();
    expect(doc.template_id).toBeNull();
  });

  it('buildMongoChunkDocument honors project and entity source types', () => {
    const projectChunk = buildMongoChunkDocument(
      {
        documentId: 'proj-1',
        content: 'Project summary',
        embedding: [],
        projectId: 'proj-1',
        sourceType: 'project',
      },
      'chunk-p'
    );
    expect(projectChunk.source_type).toBe('project');

    const entityChunk = buildMongoChunkDocument(
      {
        documentId: 'ent-1',
        content: '[risk] Delay',
        embedding: [],
        projectId: 'proj-1',
        sourceType: 'entity',
        entityId: 'ent-1',
      },
      'chunk-e'
    );
    expect(entityChunk.source_type).toBe('entity');
    expect(entityChunk.entity_id).toBe('ent-1');
  });

  it('mongoProjectFilter matches both project_id and metadata.projectId', () => {
    expect(mongoProjectFilter('proj-1')).toEqual({
      $or: [{ project_id: 'proj-1' }, { 'metadata.projectId': 'proj-1' }],
    });
  });

  it('buildMongoChunkDocument stores portfolio and program lineage', () => {
    const doc = buildMongoChunkDocument(
      {
        documentId: 'doc-1',
        content: 'section text',
        embedding: [],
        projectId: 'proj-1',
        programId: 'prog-1',
        portfolioId: 'port-1',
        sourceType: 'document',
      },
      'chunk-1'
    );

    expect(doc.portfolio_id).toBe('port-1');
    expect(doc.program_id).toBe('prog-1');
    expect(doc.metadata.portfolioId).toBe('port-1');
    expect(doc.metadata.programId).toBe('prog-1');
  });

  it('mongoPortfolioFilter and mongoProgramFilter match lineage fields', () => {
    expect(mongoPortfolioFilter('port-1')).toEqual({
      $or: [{ portfolio_id: 'port-1' }, { 'metadata.portfolioId': 'port-1' }],
    });
    expect(mongoProgramFilter('prog-1')).toEqual({
      $or: [{ program_id: 'prog-1' }, { 'metadata.programId': 'prog-1' }],
    });
  });
});
