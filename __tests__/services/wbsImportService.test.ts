// Use static string paths for require and jest.mock for cross-platform compatibility
// Fully mock the database connection to avoid real DB calls
jest.mock('../../server/src/database/connection', () => {
  return {
    pool: {
      query: jest.fn(() => Promise.resolve({ rows: [], rowCount: 0 })),
      end: jest.fn(() => Promise.resolve()),
    },
  };
});

// Mock data for extracted entities
const mockEntities = [
  {
    id: '1',
    entityType: 'activity',
    name: 'Develop Feature A',
    description: 'Implement core logic',
    parent_task_id: null,
    status: 'in_progress',
    estimated_hours: 16,
  },
  {
    id: '2',
    entityType: 'milestone',
    name: 'Phase 1 Complete',
    description: 'All core features done',
    parent_task_id: null,
    status: 'not_started',
  },
  {
    id: '3',
    entityType: 'phase',
    name: 'Phase 1',
    description: 'Initial development phase',
    parent_task_id: null,
    status: 'in_progress',
  },
  {
    id: '4',
    entityType: 'work_item',
    name: 'Write Unit Tests',
    description: 'Tests for Feature A',
    parent_task_id: '1',
    status: 'not_started',
    estimated_hours: 4,
  },
  {
    id: '5',
    entityType: 'checklist_item',
    name: 'Code Review',
    description: 'Review Feature A',
    parent_task_id: '1',
    status: 'not_started',
    estimated_hours: 2,
  },
  {
    id: '6',
    entityType: 'deliverable',
    name: 'Release v1',
    description: 'First public release',
    parent_task_id: '3', // child of Phase 1 (should map to created project task id 'task-3')
    status: 'proposed',
  },
];

const { importWBSFromDocument, getExtractedEntities } = require('../../server/src/services/wbsImportService');
const { pool } = require('../../server/src/database/connection');

// Configure the mocked pool.query to return extracted entities for the
// extraction_jobs select, and generic rows for insert queries so the
// import flow runs without a real database.
beforeAll(() => {
  // pool is the mocked object from our jest.mock above
  let insertCounter = 0
  const createdTaskIds: Record<string, string> = {}
  pool.query.mockImplementation(async (sql: string, params: any[]) => {
    const s = typeof sql === 'string' ? sql : ''
    if (s.includes('FROM extraction_jobs')) {
      return { rows: [{ extracted_data: mockEntities }], rowCount: 1 }
    }

    if (s.toLowerCase().includes('insert into project_tasks')) {
      // find source_entity_id like '1' or '6' in params
      const src = (params || []).find((p: any) => typeof p === 'string' && /^\d+$/.test(p))
      const createdId = src ? `task-${src}` : `task-${++insertCounter}`
      if (src) createdTaskIds[src] = createdId
      return { rows: [{ id: createdId }], rowCount: 1 }
    }

    if (s.toLowerCase().includes('insert into checklist_items')) {
      return { rows: [{ id: params?.[0] }], rowCount: 1 }
    }

    // default (inserts/updates) return a fake id
    return { rows: [{ id: 'fake-id', estimated_hours: params?.[0] || 0 }], rowCount: 1 }
  })
});

// ...existing code...

// ...existing code...

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
    // Ensure the DB insert queries include the documentId so tasks are traceable
    expect(pool.query).toHaveBeenCalled()
    const calls = pool.query.mock.calls
    const includesDocId = calls.some((c: any) => Array.isArray(c[1]) && c[1].includes(documentId))
    expect(includesDocId).toBe(true)
    // Ensure the parent_id was written using the created parent task id (phase id 3 -> task-3)
    const insertCalls = calls.filter((c: any) => typeof c[0] === 'string' && c[0].toLowerCase().includes('insert into project_tasks'))
    const hasParentMapping = insertCalls.some((c: any) => Array.isArray(c[1]) && c[1].includes('task-3'))
    expect(hasParentMapping).toBe(true)
  });
});
