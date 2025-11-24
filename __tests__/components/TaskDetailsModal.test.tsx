import React from 'react'
import { render, screen } from '@testing-library/react'

// Use deterministic timestamps so tests are stable
const FIXED_CREATED = '2023-01-01T00:00:00.000Z'
const FIXED_UPDATED = '2023-01-01T00:00:00.000Z'

afterEach(() => {
  // Reset module registry and mocks so per-test jest.doMock works correctly and doesn't leak state
  jest.resetModules()
  jest.clearAllMocks()
})

describe('TaskDetailsModal header', () => {
  it('shows a clickable source document link when source_document_title exists', () => {
    // Mock the hook specifically for this test
    jest.doMock('@/hooks/use-tasks', () => ({
      useTask: (id: string | null) => ({
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
      })
    }))

    // Require component after mock is set
    const { TaskDetailsModal } = require('@/components/project/TaskDetailsModal')

    render(<TaskDetailsModal taskId="t-1" open={true} onOpenChange={() => {}} />)

    // Expect the document title link in header
    const docLink = screen.getByText(/WBS 2.0 Document/i)
    expect(docLink).toBeInTheDocument()
    expect(docLink.closest('a')).toHaveAttribute('href', '/documents/doc-45083436-7e90-4ecf-aa42-e4a73c4b64b7')
  })

  it('shows the document id fallback when title is absent', () => {
    jest.doMock('@/hooks/use-tasks', () => ({
      useTask: (id: string | null) => ({
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
      })
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
