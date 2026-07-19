import { ENTITY_MAPPINGS, getEntityMapping } from '../../services/gkg/mapping'

describe('GKG mapping for onboarding entities', () => {
  it('maps onboarding_offboarding rows into GKG semantic units', () => {
    const mapping = ENTITY_MAPPINGS.find(({ adpaTable }) => adpaTable === 'onboarding_offboarding')

    expect(mapping).toBeDefined()
    expect(mapping?.gkgEntityType).toBe('OnboardingOffboarding')
    expect(mapping?.summaryColumns).toEqual(['resource_name', 'notes', 'description'])
    expect(mapping?.documentIdColumn).toBe('source_document_id')
  })

  it('returns the onboarding mapping from the helper', () => {
    expect(getEntityMapping('onboarding_offboarding')).toMatchObject({
      adpaTable: 'onboarding_offboarding',
      gkgEntityType: 'OnboardingOffboarding',
      documentIdColumn: 'source_document_id'
    })
  })
})
