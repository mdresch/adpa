# Entity Types Test Suite

This directory contains comprehensive automated tests for all 14 entity types in the ADPA baseline and drift detection system.

## Test Files

### 1. `baseline-entity-types.test.ts`

Tests baseline creation and management for all entity types.

**Coverage:**
- ✅ Table existence validation (14 entity types)
- ✅ Column validation (id, project_id, created_at)
- ✅ Entity CRUD operations (Create, Read)
- ✅ Baseline service integration
- ✅ Empty entity handling
- ✅ Entity count verification (14 types)

**Test Count:** 50+ test cases

### 2. `drift-detection-entity-types.test.ts`

Tests drift detection functionality across all entity types.

**Coverage:**
- ✅ Entity addition detection (14 types)
- ✅ Entity removal detection (14 types)
- ✅ Entity modification detection (9 modifiable types)
- ✅ Cross-entity type drift scenarios
- ✅ Sample data validation

**Test Count:** 40+ test cases

## All 14 Entity Types

1. **scope_items** - Project scope definitions
2. **deliverables** - Project deliverables and outputs
3. **requirements** - Functional and non-functional requirements
4. **milestones** - Key project milestones and dates
5. **phases** - Project phases and timeframes
6. **activities** - Project activities and tasks
7. **resources** - Team members and resource allocations
8. **technologies** - Technology stack and tools
9. **stakeholders** - Project stakeholders and their roles
10. **constraints** - Project constraints and limitations
11. **risks** - Project risks and mitigations
12. **success_criteria** - Success metrics and KPIs
13. **quality_standards** - Quality standards and benchmarks
14. **best_practices** - Best practices and guidelines

## Running Tests

```bash
# Run all service tests
npm test

# Run baseline entity types tests only
npm test -- baseline-entity-types.test.ts

# Run drift detection tests only
npm test -- drift-detection-entity-types.test.ts

# Run with coverage
npm test -- --coverage
```

## Prerequisites

- PostgreSQL database connection configured
- All migration tables created
- Test environment configured (`.env.test`)
- Dependencies installed (`npm install`)

## Test Patterns

### Pattern 1: Table Existence
```typescript
test.each(ALL_ENTITY_TYPES)(
  'should have table for %s entity type',
  async (entityType) => {
    // Verify table exists in database
  }
)
```

### Pattern 2: Entity Creation
```typescript
test.each([...entityData])(
  'should create and retrieve %s entity',
  async (tableName, entityData) => {
    // Create entity, verify it exists, clean up
  }
)
```

### Pattern 3: Drift Detection
```typescript
test.each(ALL_ENTITY_TYPES)(
  'should detect when new %s entities are added',
  async (entityType) => {
    // Create baseline, add entity, verify drift detected
  }
)
```

## Sample Data

Each entity type has sample test data defined in `SAMPLE_ENTITY_DATA`:

```typescript
const SAMPLE_ENTITY_DATA = {
  stakeholders: { 
    name: 'Baseline Stakeholder', 
    role: 'Original Role', 
    influence_level: 'high', 
    interest_level: 'high' 
  },
  risks: { 
    title: 'Baseline Risk', 
    category: 'technical', 
    probability: 'medium', 
    impact: 'medium', 
    mitigation: 'Original mitigation' 
  },
  // ... 12 more entity types
}
```

## Related Documentation

- **Testing Plan**: `/docs/testing/ENTITY_TYPES_TESTING_PLAN.md`
- **Drift Resolution Guide**: `/docs/testing/DRIFT_RESOLUTION_TESTING_GUIDE.md`
- **Feature Spec**: `/docs/roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md`
- **Baseline Service**: `/server/src/services/baselineService.ts`

## Contributing

When adding a new entity type:

1. Add table name to `ALL_ENTITY_TYPES` array in both test files
2. Add sample data to `SAMPLE_ENTITY_DATA` object
3. Run tests to ensure all patterns work with new entity type
4. Update documentation to reflect new entity count

## Notes

- Tests are **integration tests** requiring actual database connection
- Tests use dynamic SQL to work with all entity types
- Tests clean up after themselves (delete test data)
- Entity count was corrected from 13 to 14 (added `best_practices`)

---

**Created**: 2025-11-04  
**Task**: TASK-722 - Test all entity types  
**Status**: ✅ Implemented
