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

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { TemplateAuditsPanel } from '@/components/templates/TemplateAuditsPanel'

const completedAudit = {
  id: 'audit-1',
  template_id: 'template-1',
  template_version: 4,
  status: 'completed',
  trigger_type: 'manual',
  overall_score: 72,
  governance_score: 65,
  resilience_score: 79,
  verdict: 'flagged',
  governance_findings: [],
  governance_recommendations: [
    {
      severity: 'major',
      framework: 'PMBOK',
      requirement: 'Risk register',
      gap_description: 'Add explicit mitigation owners.',
    },
  ],
  compliance_gaps: [],
  challenger_findings: [],
  challenger_recommendations: [],
  challenged_assumptions: [],
  logical_vulnerabilities: [],
  error_message: null,
  created_at: '2026-05-25T12:00:00.000Z',
  completed_at: '2026-05-25T12:00:05.000Z',
}

describe('TemplateAuditsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders structured governance recommendations in expanded audit details', async () => {
    mockGet.mockResolvedValue({
      audits: [completedAudit],
    })

    render(<TemplateAuditsPanel templateId="template-1" />)

    await screen.findByText('Version 4')
    fireEvent.click(screen.getByText('Version 4'))

    await waitFor(() => {
      expect(
        screen.getByText('PMBOK: Risk register - Add explicit mitigation owners. (major)'),
      ).toBeInTheDocument()
    })
  })

})
