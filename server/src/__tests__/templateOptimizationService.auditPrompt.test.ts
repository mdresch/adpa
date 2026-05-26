import { pool } from '../database/connection'
import { aiService } from '../services/aiService'
import { templateOptimizationService } from '../services/templateOptimizationService'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'audit-prompt-suggestion-id'),
}))

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}))

jest.mock('../services/aiService', () => ({
  aiService: {
    generateWithFallback: jest.fn(),
  },
}))

describe('TemplateOptimizationService audit prompt suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a pending system-prompt-only optimization from latest completed audit', async () => {
    const query = pool.query as jest.Mock
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'template-1',
            name: 'Risk Management Plan',
            framework: 'PMBOK',
            category: 'Planning',
            content: { blocks: [] },
            system_prompt: 'Current system prompt',
            prompt_version: 4,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'audit-1',
            overall_score: 68,
            governance_score: 64,
            resilience_score: 72,
            verdict: 'flagged',
            governance_findings: ['Finding'],
            governance_recommendations: [{ framework: 'PMBOK', requirement: 'Risk', gap_description: 'Clarify owners', severity: 'major' }],
            compliance_gaps: [{ framework: 'PMBOK', requirement: 'Risk register', gap_description: 'Missing escalation path', severity: 'major' }],
            challenger_findings: ['Loophole'],
            challenger_recommendations: ['Sharpen constraints'],
            logical_vulnerabilities: [],
            challenged_assumptions: [],
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ provider_type: 'openai', default_model: 'gpt-4o' }],
      })
      .mockResolvedValueOnce({ rows: [] })

    ;(aiService.generateWithFallback as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        suggested_system_prompt: 'Improved system prompt',
        change_explanation: 'Adds audit-driven governance constraints.',
        expected_quality_gain: 12,
        changes_summary: {
          system_prompt_changes: ['Clarify risk ownership'],
          content_changes: [],
          key_improvements: ['Better PMBOK compliance'],
        },
      }),
      usage: { totalTokens: 1000 },
      providerUsed: 'openai',
      model: 'gpt-4o',
    })

    const suggestionId = await templateOptimizationService.generatePromptSuggestionFromLatestAudit('template-1')

    expect(suggestionId).toBe('audit-prompt-suggestion-id')
    expect(aiService.generateWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4o',
        system_prompt: expect.stringContaining('audit-driven system prompt optimization'),
        prompt: expect.stringContaining('Current system prompt'),
      }),
      expect.any(Array),
    )
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO template_improvement_suggestions'),
      expect.arrayContaining([
        'audit-prompt-suggestion-id',
        'template-1',
        'pending_review',
        'high',
        12,
        68,
      ]),
    )

    const insertParams = query.mock.calls[query.mock.calls.length - 1]?.[1]
    const suggestedImprovements = JSON.parse(insertParams[8])
    expect(suggestedImprovements[0]).toMatchObject({
      change_type: 'template_optimization',
      section: 'system_prompt',
      system_prompt: 'Improved system prompt',
      template_content: { blocks: [] },
      metadata: {
        optimization_type: 'ai_generated',
        trigger: 'template_audit',
        audit_id: 'audit-1',
        original_system_prompt: 'Current system prompt',
      },
    })
  })

  it('returns the latest pending audit prompt suggestion for a template', async () => {
    ;(pool.query as jest.Mock).mockResolvedValueOnce({
      rows: [{ id: 'suggestion-1', status: 'pending_review' }],
    })

    await expect(templateOptimizationService.getLatestAuditPromptSuggestion('template-1')).resolves.toEqual({
      id: 'suggestion-1',
      status: 'pending_review',
    })

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("imp->'metadata'->>'trigger' = 'template_audit'"),
      ['template-1'],
    )
  })
})
