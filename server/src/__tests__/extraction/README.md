# Extraction Tests

This directory contains tests for the modular extraction system.

## Test Structure

```
extraction/
├── fixtures/          # Test fixtures (sample documents, expected outputs)
├── golden/            # Golden file outputs (expected results for parity tests)
├── workItems.parity.test.ts  # Parity tests for work_items entity
└── README.md          # This file
```

## Test Types

### Parity Tests

Parity tests compare the output of the new modular extractor with the legacy extractor to ensure behavior is maintained.

**Location**: `workItems.parity.test.ts`

**What they test**:
- Entity count parity (within tolerance for AI non-determinism)
- Structure consistency
- Source document resolution
- Cache behavior
- Error handling

**Running tests**:
```bash
cd server
npm test -- workItems.parity.test.ts
```

### Golden File Tests

Golden file tests store expected outputs and compare against them. These are useful for:
- Regression detection
- Validating refactor doesn't change behavior
- Documenting expected outputs

**Creating golden files**:
1. Run extraction on test fixtures
2. Save output to `golden/work_items.json`
3. Commit to version control

**Comparing against golden files**:
```typescript
const golden = require('./golden/work_items.json')
const actual = await extractWorkItems(context)
expect(actual.entities).toMatchObject(golden.entities)
```

## Test Fixtures

Test fixtures are sample documents used for testing. They should:
- Be representative of real project documents
- Cover edge cases (empty documents, malformed content, etc.)
- Be deterministic (same input = same output)

**Location**: `fixtures/`

## Running Tests

```bash
# Run all extraction tests
npm test -- extraction

# Run specific test file
npm test -- workItems.parity.test.ts

# Run with coverage
npm test -- extraction --coverage
```

## Adding New Entity Tests

When migrating a new entity, create a parity test following the pattern:

1. Create `{entityType}.parity.test.ts`
2. Add test fixtures in `fixtures/{entityType}/`
3. Add golden file in `golden/{entityType}.json`
4. Compare new vs legacy extractor output

## Tolerance for AI Non-Determinism

AI responses can vary slightly between runs. Parity tests allow for:
- **10% variance** in entity counts
- **Field-level differences** in optional fields
- **Source document resolution** must match exactly

These tolerances ensure the refactor maintains behavior while accounting for AI variability.

