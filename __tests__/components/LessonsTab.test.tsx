/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

import LessonsTab from '@/app/projects/[id]/components/LessonsTab'
import { apiClient } from '@/lib/api'

describe('LessonsTab', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('renders lessons returned by API and allows applying one', async () => {
    const sample = [
      {
        knowledge_entry_id: 'k-1',
        title: 'Lesson: involve legal earlier',
        reasoning: 'Legal review delayed the project by several weeks',
        entry_type: 'lesson_learned',
        source_project_name: 'Alpha Project',
      },
    ]

    ;(apiClient.get as jest.Mock).mockResolvedValue({ success: true, data: sample })
    ;(apiClient.post as jest.Mock).mockResolvedValue({ success: true, data: {} })

    render(<LessonsTab projectId="proj-1" />)

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    expect(screen.getByText('Lessons learned')).toBeInTheDocument()
    expect(screen.getByText('Lesson: involve legal earlier')).toBeInTheDocument()

    const applyBtn = screen.getByRole('button', { name: /apply/i })
    fireEvent.click(applyBtn)

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/knowledge-base/applications', { entry_id: 'k-1', project_id: 'proj-1' }))
  })

  it('handles 404 (no recommendations) gracefully', async () => {
    ;(apiClient.get as jest.Mock).mockRejectedValueOnce({ status: 404, message: 'Not found' })

    render(<LessonsTab projectId="proj-1" />)

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled())

    // When 404, component should show the friendly 'no recommendations' message
    expect(screen.getByText('No lessons learned recommendations available for this project.')).toBeInTheDocument()
  })
})
