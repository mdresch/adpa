import { resolveEntityTableName, ENTITY_CAMEL_KEY_TO_TABLE } from '../entityTypeTables'

describe('entityTypeTables', () => {
  it('maps camelCase frontend keys to database tables', () => {
    expect(resolveEntityTableName('requirements')).toBe('requirements')
    expect(resolveEntityTableName('successCriteria')).toBe('success_criteria')
    expect(resolveEntityTableName('earnedValueMetrics')).toBe('earned_value_metrics')
    expect(resolveEntityTableName('scopeBaselines')).toBe('scope_baselines')
  })

  it('accepts snake_case table names', () => {
    expect(resolveEntityTableName('success_criteria')).toBe('success_criteria')
  })

  it('rejects unknown types', () => {
    expect(resolveEntityTableName('notAnEntity')).toBeNull()
  })

  it('covers all extraction entity tables', () => {
    expect(Object.keys(ENTITY_CAMEL_KEY_TO_TABLE).length).toBeGreaterThanOrEqual(60)
  })
})
