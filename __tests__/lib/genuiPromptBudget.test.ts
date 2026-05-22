import {
  compactLayoutPlanForExecutor,
  estimateGenuiChatPayloadChars,
  GENUI_LAYOUT_PLAN_MAX_SOURCE_CHARS,
  GENUI_SYSTEM_DOCUMENT_MAX_CHARS,
  trimTextForGenuiPrompt,
} from '@/lib/llm/genuiPromptBudget'
import type { LayoutPlan } from '@/lib/openui/layoutPlanTypes'

describe('genuiPromptBudget', () => {
  test('trimTextForGenuiPrompt leaves short text unchanged', () => {
    const result = trimTextForGenuiPrompt('hello')
    expect(result.truncated).toBe(false)
    expect(result.text).toBe('hello')
  })

  test('trimTextForGenuiPrompt truncates long text', () => {
    const long = 'x'.repeat(GENUI_SYSTEM_DOCUMENT_MAX_CHARS + 500)
    const result = trimTextForGenuiPrompt(long)
    expect(result.truncated).toBe(true)
    expect(result.text.length).toBe(GENUI_SYSTEM_DOCUMENT_MAX_CHARS)
    expect(result.originalChars).toBe(GENUI_SYSTEM_DOCUMENT_MAX_CHARS + 500)
  })

  test('estimateGenuiChatPayloadChars sums system and messages', () => {
    expect(
      estimateGenuiChatPayloadChars('sys', [{ content: 'ab' }, { content: 'cde' }])
    ).toBe(8)
  })

  test('compactLayoutPlanForExecutor caps huge nested sourceText', () => {
    const big = 'x'.repeat(50_000)
    const plan: LayoutPlan = {
      shell: 'charter',
      root: 'Stack',
      intentPrimary: 'TextContent',
      confidence: 0.9,
      nodes: [
        {
          id: 'card-1',
          component: 'Card',
          mapping: 'widget',
          sourceText: big,
          label: 'Chapter 1',
          children: [
            {
              id: 'body-1',
              component: 'TextContent',
              mapping: 'typography-fallback',
              sourceText: big,
            },
          ],
        },
      ],
      sourceCoverage: { segmentCount: 1, totalChars: big.length * 2 },
    }
    const capped = compactLayoutPlanForExecutor(plan)
    expect(capped.sourceCoverage.totalChars).toBeLessThanOrEqual(
      GENUI_LAYOUT_PLAN_MAX_SOURCE_CHARS
    )
    expect(capped.nodes[0]?.sourceText.length).toBeLessThan(1000)
  })
})
