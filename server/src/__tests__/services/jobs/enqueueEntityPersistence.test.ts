import { hasInlineH8EntityTags } from '../../../services/inlineEntityParserService'

describe('enqueueEntityPersistence routing', () => {
  it('routes H8-marked documents away from LLM extract-project-data', () => {
    const withH8 = [
      '# Plan',
      'Body text',
      '######## stakeholders: {"name":"Sponsor","role":"Executive"}',
    ].join('\n')
    const withoutH8 = '# Plan\nNo entity tags here.'

    expect(hasInlineH8EntityTags(withH8)).toBe(true)
    expect(hasInlineH8EntityTags(withoutH8)).toBe(false)
  })
})
