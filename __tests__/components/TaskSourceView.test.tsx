import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock next/link so tests just render a normal anchor
import React from 'react'
jest.mock('next/link', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('a', { href: props.href }, props.children),
}))

import { TaskSourceView } from '@/components/project/TaskSourceView'

describe('TaskSourceView', () => {
  it('renders entity and view document links when source_document_id present', () => {
    const task = {
      id: 'task-1',
      task_number: 'T-100',
      imported_from_wbs: true,
      wbs_code: '1.2.3',
      source_entity_id: 'entity-abc',
      source_document_id: 'doc-123',
      source_document_title: 'Project Charter',
      created_at: new Date().toISOString(),
    }

    render(<TaskSourceView task={task as any} />)

    // Badge for Entity should be a link to /documents/doc-123#entity-entity-abc
    const entityLink = screen.getByText(/Entity: entity-abc/i)
    expect(entityLink.closest('a')?.getAttribute('href')).toBe('/documents/doc-123#entity-entity-abc')

    // The small Entity ID code block should also be a link with the same href
    const entityIdCode = screen.getByText(/Entity ID: entity-abc/i)
    expect(entityIdCode.closest('a')?.getAttribute('href')).toBe('/documents/doc-123#entity-entity-abc')

    // Document ID should be visible
    expect(screen.getByText('Document ID:')).toBeTruthy()
    expect(screen.getByText('doc-123')).toBeTruthy()

    // View Source Document button should link to the document root
    const viewDocLink = screen.getByRole('link', { name: /View Source Document/i })
    expect(viewDocLink).toHaveAttribute('href', '/documents/doc-123')
  })

  it('renders a non-clickable entity when no source_document_id present', () => {
    const task = {
      id: 'task-2',
      task_number: 'T-101',
      imported_from_wbs: true,
      source_entity_id: 'entity-xyz',
      // no source_document_id
    }

    render(<TaskSourceView task={task as any} />)

    // Entity badge should be present and not wrapped in a link
    const badge = screen.getByText(/Entity: entity-xyz/i)
    expect(badge.closest('a')).toBeNull()
  })
})
