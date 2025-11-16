# AI Provider Failover Integration Tests

**Related**: CR-2025-002 (Production Readiness & Feature Polish)  
**Task**: TASK-56  
**File**: `ai-provider-failover.test.ts`

---

## Overview

Comprehensive integration tests for the AI provider failover mechanism. These tests verify that the system correctly handles provider failures, rate limits, insufficient funds, backoff logic, and error scenarios.

---

## Test Coverage

### 1. Basic Failover Scenarios
- ✅ Successfully use primary provider when available
- ✅ Fallback to next provider when primary fails
- ✅ Try all providers in priority order

### 2. Rate Limit Handling
- ✅ Handle rate limit errors and fallback
- ✅ Apply backoff after rate limit

### 3. Insufficient Funds/Credits Handling
- ✅ Auto-disable provider with insufficient funds
- ✅ Handle various insufficient funds error messages

### 4. Backoff Logic
- ✅ Skip providers in backoff period
- ✅ Reset backoff after successful request
- ✅ Calculate exponential backoff correctly

### 5. Provider Priority Ordering
- ✅ Respect provider priority from database
- ✅ Filter out inactive providers

### 6. Error Handling
- ✅ Throw error when all providers fail
- ✅ Handle network errors gracefully
- ✅ Handle timeout errors

### 7. Edge Cases
- ✅ Handle empty provider list
- ✅ Handle requested provider not in active list
- ✅ Handle all providers in backoff

### 8. Provider Recovery
- ✅ Recover provider after backoff period expires

---

## Running the Tests

### Prerequisites

1. **Database Setup**: Tests require a PostgreSQL database with the `ai_providers` table
2. **Test Data**: Tests create temporary providers in the database
3. **Environment Variables**: Ensure test database connection is configured

### Run All Tests

```bash
cd server
npm test -- ai-provider-failover.test.ts
```

### Run Specific Test Suite

```bash
# Basic failover scenarios
npm test -- ai-provider-failover.test.ts -t "Basic Failover Scenarios"

# Rate limit handling
npm test -- ai-provider-failover.test.ts -t "Rate Limit Handling"

# Insufficient funds handling
npm test -- ai-provider-failover.test.ts -t "Insufficient Funds"
```

### Run with Coverage

```bash
npm test -- --coverage ai-provider-failover.test.ts
```

---

## Test Structure

### Setup and Teardown

- **`beforeAll`**: Creates test providers in database
- **`afterAll`**: Cleans up test providers
- **`beforeEach`**: Resets global failure state

### Mocking Strategy

Tests use Jest mocks to simulate provider failures:

```typescript
// Set which providers should fail
(global as any).__FAIL_PROVIDERS = ['openai']

// Set error type for each provider
(global as any).__FAIL_ERROR_TYPE = {
  openai: { message: 'Provider unavailable', statusCode: 503 }
}
```

### Test Providers

Tests create 4 test providers:
- **Test OpenAI** (priority: 1)
- **Test Google** (priority: 2)
- **Test Mistral** (priority: 3)
- **Test Groq** (priority: 4)

---

## Test Scenarios

### Scenario 1: Primary Provider Success

**Setup**: No providers fail  
**Expected**: Uses primary provider (openai)  
**Verification**: `result.providerUsed === 'openai'`

### Scenario 2: Primary Fails, Fallback Succeeds

**Setup**: OpenAI fails, Google succeeds  
**Expected**: Falls back to Google  
**Verification**: `result.providerUsed === 'google'`

### Scenario 3: Multiple Providers Fail

**Setup**: First 3 providers fail, Groq succeeds  
**Expected**: Tries all providers in order, succeeds on Groq  
**Verification**: `result.providerUsed === 'groq'` and `generate` called 4 times

### Scenario 4: Rate Limit Handling

**Setup**: OpenAI hits rate limit (429)  
**Expected**: Falls back to next provider, applies backoff to OpenAI  
**Verification**: Uses fallback provider, backoff state recorded

### Scenario 5: Insufficient Funds Auto-Disable

**Setup**: OpenAI returns 402 (insufficient funds)  
**Expected**: Auto-disables OpenAI in database, uses fallback  
**Verification**: `is_active = false` in database, uses fallback provider

### Scenario 6: Backoff Period Skipping

**Setup**: OpenAI in backoff period (next retry in future)  
**Expected**: Skips OpenAI, uses next available provider  
**Verification**: OpenAI not called, fallback provider used

### Scenario 7: All Providers Fail

**Setup**: All providers fail  
**Expected**: Throws error after trying all providers  
**Verification**: Error thrown, all providers attempted

---

## Expected Test Results

### Success Criteria

- ✅ All test suites pass
- ✅ Test coverage > 80% for failover logic
- ✅ Tests complete in < 30 seconds
- ✅ No database state leaks between tests

### Known Limitations

1. **Mock Limitations**: Tests use mocks which may not perfectly simulate real API behavior
2. **Database Dependencies**: Tests require database access and may fail if database is unavailable
3. **API Keys**: Tests don't use real API keys (expected in test environment)

---

## Troubleshooting

### Tests Fail with Database Errors

**Problem**: Cannot connect to database  
**Solution**: Ensure test database is configured and accessible

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

### Tests Fail with Mock Errors

**Problem**: Mocks not working correctly  
**Solution**: Verify Jest is configured correctly and mocks are properly set up

### Tests Leave Test Data

**Problem**: Test providers remain in database  
**Solution**: Check `afterAll` cleanup is running. Manually clean up:

```sql
DELETE FROM ai_providers WHERE name LIKE 'Test %';
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run AI Provider Failover Tests
  run: |
    cd server
    npm test -- ai-provider-failover.test.ts --coverage
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

### Test Execution Time

- **Full Suite**: ~20-30 seconds
- **Individual Suites**: ~2-5 seconds each

---

## Related Documentation

- **AI Service Implementation**: `server/src/services/aiService.ts`
- **Failover Routes**: `server/src/routes/ai-failover.ts`
- **Change Request**: `docs/roadmap/CR-2025-002_PRODUCTION_READINESS_AND_POLISH.md`

---

## Maintenance

### Adding New Test Cases

1. Add test to appropriate describe block
2. Set up mock state (`__FAIL_PROVIDERS`, `__FAIL_ERROR_TYPE`)
3. Verify expected behavior
4. Clean up in `finally` block

### Updating Test Providers

If provider types change, update `beforeAll` setup:

```typescript
const providers = [
  { name: 'Test NewProvider', type: 'newprovider', priority: 5, apiKey: 'test-key' },
]
```

---

**Last Updated**: October 29, 2025  
**Test Status**: ✅ Complete

