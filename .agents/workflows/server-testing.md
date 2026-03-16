---
description: How to set up and run server integration tests correctly
---

// turbo-all
1. Check if Docker is running and healthy.
2. Initialize the test environment configuration:
   ```bash
   cd server
   if (!(Test-Path .env.test)) { Copy-Item .env.example .env.test }
   ```
3. Spin up the test database:
   ```bash
   docker-compose -f docker-compose.test.yml up -d
   ```
4. Verify database connectivity:
   ```bash
   npx ts-node -r tsconfig-paths/register scripts/check-database-schema.js
   ```
5. Run tests with the recommended flags to avoid discovery hangs and race conditions:
   ```bash
   npx jest src/modules/auth/__tests__/auth.test.ts --no-cache --verbose --runInBand
   ```
6. When finished, clean up the environment:
   ```bash
   docker-compose -f docker-compose.test.yml down
   ```
