import { withRagLineage } from '../../lib/mongoRagHierarchy';

describe('mongoRagHierarchy', () => {
  it('withRagLineage merges portfolio, program, project, and document ids onto chunks', () => {
    const chunk = withRagLineage(
      {
        documentId: 'ent-1',
        content: '[risk] Delay',
        embedding: [],
        sourceType: 'entity',
        entityId: 'ent-1',
      },
      {
        portfolioId: 'port-1',
        programId: 'prog-1',
        projectId: 'proj-1',
        documentId: 'doc-1',
      }
    );

    expect(chunk.portfolioId).toBe('port-1');
    expect(chunk.programId).toBe('prog-1');
    expect(chunk.projectId).toBe('proj-1');
    expect(chunk.metadata?.portfolioId).toBe('port-1');
    expect(chunk.metadata?.programId).toBe('prog-1');
    expect(chunk.metadata?.documentId).toBe('doc-1');
  });
});
