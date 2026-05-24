import {
  resolveEntityTableName,
  ENTITY_CAMEL_KEY_TO_TABLE,
  getAllowedEntityTableName,
  quotedEntityTableName,
  assertAllowedEntityTableName,
} from '../entityTypeTables'

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

  it('getAllowedEntityTableName rejects unknown types', () => {
    expect(() => getAllowedEntityTableName('notAnEntity')).toThrow(/Unknown entity type/)
  })

  it('quotedEntityTableName rejects injection-like names', () => {
    expect(() => quotedEntityTableName('requirements; DROP TABLE users')).toThrow(
      /Invalid entity table/
    )
    expect(() => quotedEntityTableName('not_on_whitelist')).toThrow(/Invalid entity table/)
  })

  it('quotedEntityTableName returns double-quoted identifiers for allowed tables', () => {
    expect(quotedEntityTableName('requirements')).toBe('"requirements"')
    expect(getAllowedEntityTableName('successCriteria')).toBe('success_criteria')
    assertAllowedEntityTableName('success_criteria')
  })
})
