import { templateValidationSchemas } from '../validation'

describe('document template validation', () => {
  it('accepts prompt_version on create and update payloads', () => {
    const createResult = templateValidationSchemas.createTemplate.validate({
      name: 'Business Case',
      framework: 'BABOK v3',
      content: { blocks: [] },
      prompt_version: 3,
    })

    const updateResult = templateValidationSchemas.updateTemplate.validate({
      prompt_version: 4,
    })

    expect(createResult.error).toBeUndefined()
    expect(updateResult.error).toBeUndefined()
  })
})
