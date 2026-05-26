/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockGet = jest.fn()
const mockPost = jest.fn()

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

jest.mock('@/lib/notify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/components/templates/TemplateRecommendations', () => ({
  TemplateRecommendations: ({ templateId }: { templateId: string }) => (
    <div data-testid="template-recommendations">Recommendations for {templateId}</div>
  ),
}))

import { TemplatePromptSuggestionsPanel } from '@/components/templates/TemplatePromptSuggestionsPanel'

describe('TemplatePromptSuggestionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('generates and applies an audit-derived system prompt suggestion', async () => {
    mockGet.mockResolvedValue({ suggestion: null })
    mockPost.mockImplementation((endpoint: string) => {
      if (endpoint.endsWith('/audit-prompt-suggestion/generate')) {
        return Promise.resolve({
          suggestionId: '11111111-1111-4111-8111-111111111111',
          suggestion: { id: '11111111-1111-4111-8111-111111111111', status: 'pending_review' },
        })
      }
      if (endpoint.endsWith('/11111111-1111-4111-8111-111111111111/apply')) {
        return Promise.resolve({ success: true })
      }
      return Promise.resolve({})
    })

    render(<TemplatePromptSuggestionsPanel templateId="template-1" />)

    await screen.findByTestId('template-recommendations')
    fireEvent.click(screen.getByRole('button', { name: /Generate prompt suggestion from audit/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/quality-audits/template-optimization/audit-prompt-suggestion/generate',
        { templateId: 'template-1' },
      )
    })

    const applyButton = screen.getByRole('button', { name: /Apply improved system prompt to template/i })
    await waitFor(() => expect(applyButton).not.toBeDisabled())

    fireEvent.click(applyButton)

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/quality-audits/template-optimization/11111111-1111-4111-8111-111111111111/apply',
      )
    })
  })
})
