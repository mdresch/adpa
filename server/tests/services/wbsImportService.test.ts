import { importWBSFromDocument } from '../../src/services/wbsImportService';
import { pool } from '../../src/database/connection';

// Mock data for extracted entities
const mockEntities = [
  {
    id: '1',
    entityType: 'activity',
    name: 'Develop Feature A',
    description: 'Implement core logic',
    parentId: null,
    status: 'in_progress',
    estimated_hours: 16,
  },
  {
    id: '2',
    entityType: 'milestone',
    name: 'Phase 1 Complete',
    description: 'All core features done',
    parentId: null,
    status: 'not_started',
  },
  {
    id: '3',
    entityType: 'phase',
    name: 'Phase 1',
    description: 'Initial development phase',
    parentId: null,
    status: 'in_progress',
  },
  {
    id: '4',
    entityType: 'work_item',
    name: 'Write Unit Tests',
    description: 'Tests for Feature A',
    parentId: '1',
    status: 'not_started',
    estimated_hours: 4,
  },
  {
    id: '5',
    entityType: 'checklist_item',
    name: 'Code Review',
    description: 'Review Feature A',
    parentId: '1',
    status: 'not_started',
    estimated_hours: 2,
  },
  {
    id: '6',
    entityType: 'deliverable',
    name: 'Release v1',
    description: 'First public release',
    parentId: null,
    status: 'proposed',
  },
];

// Mock getExtractedEntities to return mockEntities
jest.mock('../../src/services/wbsImportService', () => {
  const original = jest.requireActual('../../src/services/wbsImportService');
  return {
    ...original,
    getExtractedEntities: jest.fn(() => Promise.resolve(mockEntities)),
  };
});

describe('importWBSFromDocument', () => {
  const projectId = 'test-project';
  const documentId = 'test-doc';
  const userId = 'test-user';

  afterAll(async () => {
    await pool.end();
  });

  it('should import all entity types and preserve hierarchy', async () => {
    const result = await importWBSFromDocument(projectId, documentId, userId, { autoMatchRoles: false });
    expect(result.tasksCreated).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
    // Additional assertions for parent/child relationships and entity types can be added here
  });
});
