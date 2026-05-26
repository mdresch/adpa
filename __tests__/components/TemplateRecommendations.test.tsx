/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockSideBySideDiff = jest.fn()

jest.mock('@/components/drift/SideBySideDiff', () => ({
  SideBySideDiff: (props: { oldContent: string; newContent: string; filename?: string }) => {
    mockSideBySideDiff(props)
    return (
      <div data-testid={`diff-${props.filename}`}>
        <span>{props.oldContent}</span>
        <span>{props.newContent}</span>
      </div>
    )
  },
}))

jest.mock('@/lib/notify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

import { TemplateRecommendations } from '@/components/templates/TemplateRecommendations'

describe('TemplateRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      const requestUrl = String(url)

      if (requestUrl.includes('/template-improvements')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              suggestions: [
                {
                  id: '22222222-2222-4222-8222-222222222222',
                  template_id: 'template-1',
                  common_issues: [],
                  suggested_improvements: [
                    {
                      change_type: 'guidance',
                      section: 'system_prompt',
                      issue_addressed: 'Governance clarity',
                      proposed_change: 'Add explicit PMBOK risk-owner instructions.',
                    },
                  ],
                  priority: 'medium',
                  status: 'pending_review',
                  current_avg_quality: 72,
                  expected_quality_gain: 8,
                  document_count: 1,
                  created_at: '2026-05-25T12:00:00.000Z',
                  updated_at: '2026-05-25T12:00:00.000Z',
                },
              ],
            }),
        } as Response)
      }

      if (requestUrl.includes('/template-optimization/22222222-2222-4222-8222-222222222222')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              suggestion: {
                status: 'pending_review',
                optimization: {
                  is_regular_suggestion: true,
                  current_system_prompt: 'Current system prompt',
                  suggested_system_prompt_for_diff: 'Current system prompt',
                  current_content: 'Current template content',
                  suggested_content_for_diff: 'Current template content',
                  change_explanation: 'Improve governance guidance.',
                  changes_summary: {
                    system_prompt_changes: ['Add explicit PMBOK risk-owner instructions.'],
                    content_changes: [],
                    key_improvements: [],
                  },
                },
              },
            }),
        } as Response)
      }

      return Promise.reject(new Error(`Unexpected fetch URL: ${requestUrl}`))
    }) as jest.Mock
  })

  it('shows proposed regular recommendation changes in the full diff dialog', async () => {
    render(<TemplateRecommendations templateId="template-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /View Full Diff/i }))

    await waitFor(() => {
      expect(mockSideBySideDiff).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'system_prompt.txt',
          oldContent: 'Current system prompt',
          newContent: expect.stringContaining('Add explicit PMBOK risk-owner instructions.'),
        }),
      )
    })

    expect(mockSideBySideDiff.mock.calls[0][0].newContent).not.toBe(
      mockSideBySideDiff.mock.calls[0][0].oldContent,
    )
  })

  it('uses a wide readable container for the side-by-side optimization diff', async () => {
    render(<TemplateRecommendations templateId="template-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /View Full Diff/i }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveClass('w-[96vw]')
    expect(dialog).toHaveClass('max-w-[1800px]')

    await screen.findByTestId('diff-system_prompt.txt')
    expect(screen.getByTestId('optimization-diff-system-prompt')).toHaveClass(
      'optimization-diff-shell',
    )
  })
})
