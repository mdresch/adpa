// Mock DB connection to avoid hitting a real database
jest.mock('../../server/src/database/connection', () => {
  return {
    pool: {
      query: jest.fn(() => Promise.resolve({ rows: [], rowCount: 0 })),
      end: jest.fn(() => Promise.resolve()),
    }
  }
})

const { importWBSFromProjectEntities } = require('../../server/src/services/wbsImportService')
const { pool } = require('../../server/src/database/connection')

describe('importWBSFromProjectEntities', () => {
  const projectId = 'proj-1'
  const userId = 'user-1'

  beforeAll(() => {
    let insertCounter = 0
    const createdTaskIds: Record<string, string> = {}

    pool.query.mockImplementation(async (sql: string, params: any[]) => {
      const s = typeof sql === 'string' ? sql : ''

      if (s.includes('FROM activities')) {
        return {
          rows: [
            { id: 'a1', activity_name: 'Act 1', description: 'Do thing', extracted_from_document_id: 'doc-alpha' },
            { id: 'a2', activity_name: 'Act 2', description: 'Do thing 2', extracted_from_document_id: null },
          ],
          rowCount: 2,
        }
      }

      if (s.includes('FROM deliverables')) {
        return {
          rows: [
            { id: 'd1', name: 'Del 1', description: 'Deliverable', extracted_from_document_id: 'doc-alpha' },
            // d2 is a child of d1, parent_id should be mapped to created task id 'task-d1'
            { id: 'd2', name: 'Del 2', description: 'Deliverable 2', extracted_from_document_id: 'doc-beta', parent_id: 'd1' },
          ],
          rowCount: 2,
        }
      }

      if (s.includes('FROM phases')) {
        return {
          rows: [
            { id: 'p1', name: 'Phase 1', description: 'Phase one', extracted_from_document_id: 'doc-alpha' },
          ],
          rowCount: 1,
        }
      }

      if (s.includes('FROM milestones')) {
        return {
          rows: [
            { id: 'm1', name: 'Milestone 1', description: 'Milestone one', extracted_from_document_id: 'doc-beta' },
          ],
          rowCount: 1,
        }
      }

      if (s.includes('FROM work_items')) {
        return {
          rows: [
            { id: 'w1', name: 'Work Item 1', description: 'Work item', parent_id: 'a1', extracted_from_document_id: 'doc-alpha' },
          ],
          rowCount: 1,
        }
      }

      // For inserts into project_tasks, return a created id based on the source entity id when present so we can assert mapping
      if (s.toLowerCase().includes('insert into project_tasks')) {
        const src = (params || []).find((p: any) => typeof p === 'string' && /^(a|d|p|m)\d+$/.test(p))
        const createdId = src ? `task-${src}` : `task-${++insertCounter}`
        if (src) createdTaskIds[src] = createdId
        return { rows: [{ id: createdId }], rowCount: 1 }
      }

      // For checklist_items insert, return the item id and allow assertion on the params
      if (s.toLowerCase().includes('insert into checklist_items')) {
        return { rows: [{ id: params?.[0] }], rowCount: 1 }
      }

      // default (inserts/updates) return a fake id
      return { rows: [{ id: 'fake-id' }], rowCount: 1 }
    })
  })

  afterAll(async () => {
    await pool.end()
  })

  it('persists extracted_from_document_id as source_document_id for created tasks', async () => {
    const result = await importWBSFromProjectEntities(projectId, userId, { autoMatchRoles: false })
    expect(result.tasksCreated).toBeGreaterThan(0)
    expect(result.errors.length).toBe(0)

    // Ensure pool.query was called with document ids for some insert calls
    const calls = pool.query.mock.calls
    const docPresent = calls.some((c: any) => Array.isArray(c[1]) && (c[1].includes('doc-alpha') || c[1].includes('doc-beta')))
    expect(docPresent).toBe(true)

    // Ensure checklist_items insertion used the created task id mapping (work item parent a1 -> task-a1)
    const checklistCall = calls.find((c: any) => typeof c[0] === 'string' && c[0].includes('INSERT INTO checklist_items'))
    expect(checklistCall).toBeDefined()
    // task_id is second param
    expect(checklistCall[1][1]).toBe('task-a1')

    // ensure that one of the project_tasks inserts used the mapping for parent_id (d1 -> task-d1)
    const insertCalls = pool.query.mock.calls.filter((c: any) => typeof c[0] === 'string' && c[0].toLowerCase().includes('insert into project_tasks'))
    const hasDeliverableParent = insertCalls.some((c: any) => Array.isArray(c[1]) && c[1].includes('task-d1'))
    expect(hasDeliverableParent).toBe(true)
  })
})
