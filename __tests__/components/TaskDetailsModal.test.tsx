/**
 * @jest-environment jsdom
 */

// Import testing helpers at top-level (we don't import React directly here)
// so we don't cause nested test framework hooks later.
import { render, screen } from '@testing-library/react'

// Use deterministic timestamps so tests are stable
const FIXED_CREATED = '2023-01-01T00:00:00.000Z'
const FIXED_UPDATED = '2023-01-01T00:00:00.000Z'

// Top-level module mocks — keep everything in the same Jest module registry so
// @testing-library/react and the components under test use the same React
// instance. This prevents the "invalid hook call" caused by mismatched
// module registries when using isolateModules + top-level testing helpers.
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => (<div data-testid="mock-dialog">{children}</div>),
  DialogContent: ({ children }: any) => (<div>{children}</div>),
  DialogHeader: ({ children }: any) => (<div>{children}</div>),
  DialogTitle: ({ children }: any) => (<div>{children}</div>),
  DialogDescription: ({ children }: any) => (<div>{children}</div>)
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => (<div>{children}</div>),
  TabsContent: ({ children }: any) => (<div>{children}</div>),
  TabsList: ({ children }: any) => (<div>{children}</div>),
  TabsTrigger: ({ children }: any) => (<button>{children}</button>)
}))

jest.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => (<span>{children}</span>) }))
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: ({ children }: any) => (<div>{children}</div>) }))
jest.mock('@/components/ui/alert', () => ({ Alert: ({ children }: any) => (<div>{children}</div>), AlertDescription: ({ children }: any) => (<div>{children}</div>) }))

// Nested component stubs
jest.mock('@/components/project/TaskEditForm', () => ({ TaskEditForm: (props: any) => (<div data-testid="mock-task-edit-form" />) }))
jest.mock('@/components/project/TaskResourcesView', () => ({ TaskResourcesView: (props: any) => (<div data-testid="mock-task-resources" />) }))
jest.mock('@/components/project/TaskDependenciesView', () => ({ TaskDependenciesView: (props: any) => (<div data-testid="mock-task-dependencies" />) }))
jest.mock('@/components/project/TaskHoursView', () => ({ TaskHoursView: (props: any) => (<div data-testid="mock-task-hours" />) }))
jest.mock('@/components/project/TaskSourceView', () => ({ TaskSourceView: (props: any) => (<div data-testid="mock-task-source" />) }))
jest.mock('@/components/project/TaskStatusBadge', () => ({ TaskStatusBadge: (props: any) => (<span data-testid="mock-task-status" />) }))

// Make hook modules jest.fn so tests can override implementations via
// mockImplementation inside each test.
jest.mock('@/hooks/use-tasks', () => ({
  useTask: jest.fn(),
  useTaskMutations: jest.fn()
}))

beforeEach(() => {
  // Clear jest mocks before each test so per-test mockImplementation calls
  // don't leak across tests.
  jest.clearAllMocks()
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('TaskDetailsModal header', () => {
  it('shows a clickable source document link when source_document_title exists', () => {
    // Use the mocked hook module and provide per-test implementations
    const mockedHooks = require('@/hooks/use-tasks')

    mockedHooks.useTask.mockImplementation((id: string | null) => ({
      task: id
        ? {
            id: 't-1',
            project_id: 'proj-1',
            task_number: '2.0',
            wbs_code: '2.0',
            task_name: 'Data Quality Training',
            description: 'WBS 2.0',
            status: 'planned',
            progress_percentage: 0,
            imported_from_wbs: true,
            source_entity_id: '7b5d2a34-ddff-4f07-93d6-e41b322c8833',
            source_document_id: 'doc-45083436-7e90-4ecf-aa42-e4a73c4b64b7',
            source_document_title: 'WBS 2.0 Document',
            created_at: FIXED_CREATED,
            updated_at: FIXED_UPDATED
          }
        : null,
      loading: false,
      error: null,
      refetch: jest.fn()
    }))

    mockedHooks.useTaskMutations.mockImplementation((_projectId: string, _onSave?: () => void) => ({
      updateTask: jest.fn().mockResolvedValue(undefined),
      updating: false
    }))

    const { TaskDetailsModal } = require('@/components/project/TaskDetailsModal')

    render(<TaskDetailsModal taskId="t-1" open={true} onOpenChange={() => {}} />)

    // Expect the document title link in header
    const docLink = screen.getByText(/WBS 2.0 Document/i)
    expect(docLink).toBeInTheDocument()
    expect(docLink.closest('a')).toHaveAttribute('href', '/documents/doc-45083436-7e90-4ecf-aa42-e4a73c4b64b7')
  })

  it('shows the document id fallback when title is absent', () => {
    const mockedHooks = require('@/hooks/use-tasks')

    mockedHooks.useTask.mockImplementation((id: string | null) => ({
      task: id
        ? {
            id: 't-2',
            project_id: 'proj-1',
            task_number: '3.0',
            task_name: 'Training',
            status: 'planned',
            progress_percentage: 0,
            imported_from_wbs: true,
            source_entity_id: 'entity-123',
            source_document_id: 'doc-abc',
            created_at: FIXED_CREATED,
            updated_at: FIXED_UPDATED
          }
        : null,
      loading: false,
      error: null,
      refetch: jest.fn()
    }))

    mockedHooks.useTaskMutations.mockImplementation((_projectId: string, _onSave?: () => void) => ({
      updateTask: jest.fn().mockResolvedValue(undefined),
      updating: false
    }))

    const { TaskDetailsModal } = require('@/components/project/TaskDetailsModal')

    render(<TaskDetailsModal taskId="t-2" open={true} onOpenChange={() => {}} />)

    // Fallback content should expose the raw doc id in the header link
    const docIdText = screen.getByText(/Document ID:/i)
    expect(docIdText).toBeInTheDocument()
    const docIdNode = screen.getByText('doc-abc')
    expect(docIdNode.closest('a')).toHaveAttribute('href', '/documents/doc-abc')
  })
})
