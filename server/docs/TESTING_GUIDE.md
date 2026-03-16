# 🧪 ADPA Server Testing Guide

This guide describes how to set up, run, and maintain tests for the ADPA server.

## 🚀 Quick Start

### 1. Set Up the Test Environment
Ensure Docker is running, then start the test database:
```bash
cd server
docker-compose -f docker-compose.test.yml up -d
```

### 2. Run All Tests
```bash
npm test
```

### 3. Run Integration Tests
```bash
npm run test:integration
```

---

## 🛠 Test Environment Architecture

### Configuration
- **Entry point**: `src/__tests__/setup.ts` (runs before all tests).
- **Environment**: `.env.test`.
- **Database**: PostgreSQL on port `5433` (mapped from `5432` in Docker).

### Side-Effect Isolation (Crucial)
Several core services (`queueService.ts`, `registry.ts`, `serverBootstrap.ts`) have top-level async side effects. To prevent Jest discovery hangs:
1. **Guards**: Most core services are guarded with `if (process.env.NODE_ENV !== 'test')`.
2. **Mocking**: In your test file, always mock these services *before* importing `app`.

```typescript
jest.mock('../../../services/queueService', () => ({
  initializeQueues: jest.fn().mockResolvedValue(undefined),
  // ... other mocks
}));

import { app } from '../../../server';
```

---

## 📋 Test Command Reference

| Command | Description |
| :--- | :--- |
| `npm run test` | Runs all Jest tests. |
| `npm run test:integration` | Spins up Docker, runs integration tests, and cleans up. |
| `npm run test:unit` | Runs tests using only 50% workers (recommended for CI). |
| `npx jest path/to/test --runInBand` | Runs a single test suite sequentially (prevents race conditions). |

---

## 🔍 Troubleshooting

### "0 tests found" or Hangs
- **Cause**: An imported module is executing a long-running sync/async operation at the top level.
- **Fix**: Identify the module and add it to the `jest.mock()` list or wrap its side-effect in a `NODE_ENV` guard.

### `ReferenceError: ... is not defined`
- **Cause**: A background operation is continuing after Jest has torn down the environment.
- **Fix**: Use `--runInBand` to isolate the test or ensure all async operations are awaited/guarded.

### Database Connection Failures
- **Check**: `docker ps` to ensure `server-postgres-test-1` is healthy.
- **Check**: `server/.env.test` matches the ports/credentials in `docker-compose.test.yml`.
