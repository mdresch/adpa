# Integration Guide: Startup Dependency Graph

## Overview

The new Startup Dependency Graph system has been fully implemented. This guide explains how to integrate it into `server/src/server.ts`.

## Files Created

### Core Implementation
- `server/src/startup/dependencyGraph.ts` - Core graph engine
- `server/src/startup/startupManager.ts` - Orchestration manager
- `server/src/startup/serverBootstrap.ts` - Updated server bootstrap function

### Dependencies
- `server/src/startup/dependencies/database.ts`
- `server/src/startup/dependencies/redis.ts`
- `server/src/startup/dependencies/neo4j.ts`
- `server/src/startup/dependencies/rabbitmq.ts`
- `server/src/startup/dependencies/aiProviders.ts`
- `server/src/startup/dependencies/workers.ts`
- `server/src/startup/dependencies/index.ts` - Barrel export

### Tests
- `server/__tests__/startup/dependencyGraph.test.ts` - Comprehensive test suite

### Documentation
- `server/src/startup/README.md` - Full documentation

## Integration Steps

### Step 1: Update server.ts imports

Add the StartupManager import at the top of `server/src/server.ts`:

```typescript
import { StartupManager } from "./startup/startupManager"
```

### Step 2: Replace startServer() function

Replace the existing `startServer()` function with the new implementation. The key changes:

**Before:**
```typescript
async function startServer() {
  try {
    console.log("🚀 Starting server initialization...")
    
    // Sequential initialization of database, redis, neo4j, etc.
    try {
      await connectDatabase()
      // ... more sequential calls
    } catch (dbError) {
      // error handling
    }
    
    try {
      await connectRedis()
      // ... more sequential calls
    } catch (redisError) {
      // error handling
    }
    
    // etc...
  }
}
```

**After:**
```typescript
async function startServer() {
  let startupManager: StartupManager
  
  try {
    // Initialize all dependencies in parallel using the dependency graph
    startupManager = new StartupManager()
    await startupManager.initialize()
    
    // Rest of server setup...
    
    // Add graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('\n🛑 SIGTERM received, shutting down gracefully...')
      if (startupManager) {
        await startupManager.shutdown()
      }
      process.exit(0)
    })
    
    process.on('SIGINT', async () => {
      console.log('\n🛑 SIGINT received, shutting down gracefully...')
      if (startupManager) {
        await startupManager.shutdown()
      }
      process.exit(0)
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    if (startupManager) {
      try {
        await startupManager.shutdown()
      } catch (shutdownError) {
        console.error("❌ Error during shutdown:", shutdownError)
      }
    }
    process.exit(1)
  }
}
```

### Step 3: Remove old initialization code

Delete the old sequential initialization code:
- Remove individual `connectDatabase()` calls
- Remove individual `connectRedis()` calls
- Remove individual `connectNeo4j()` calls
- Remove individual `aiService.initializeProviders()` calls
- Remove individual try-catch blocks for each service

All of these are now handled by the DependencyGraph through StartupManager.

### Step 4: Test the integration

Run the server and verify:

```bash
npm run dev
```

You should see:
1. "🚀 Starting server initialization with dependency graph..." message
2. The STARTUP DEPENDENCY SUMMARY table
3. All dependencies initialized with their timing
4. Server listening on the port
5. No "waiting..." logs for dependencies

### Step 5: Enable Fail-Fast Mode (Optional)

For production or strict environments:

```bash
FAIL_FAST_MODE=true npm start
```

This will make the server refuse to start if any critical dependency fails.

## Expected Behavior

### Normal Operation

```
🚀 Starting server initialization with dependency graph...
✅ Database initialized successfully (245ms)
✅ Redis initialized successfully (125ms)
✅ Neo4j initialized successfully (87ms)
⏳ RabbitMQ initialized successfully (0ms)
✅ AI Providers initialized successfully (1250ms)
✅ Workers initialized successfully (340ms)

╔════════════════════════════════════════════════════════════════╗
║                 STARTUP DEPENDENCY SUMMARY                     ║
╠════════════════════════════════════════════════════════════════╣
║ ✅ Database                    [CRITICAL]  245   ms ║
║ ✅ Redis                       [OPTIONAL]  125   ms ║
║ ✅ Neo4j                       [OPTIONAL]  87    ms ║
║ ⏳ RabbitMQ                    [OPTIONAL]  0     ms ║
║ ✅ AI Providers                [OPTIONAL]  1250  ms ║
║ ✅ Workers                     [OPTIONAL]  340   ms ║
╠════════════════════════════════════════════════════════════════╣
║ Ready: 6/6 | Failed: 0 | Total: 2047ms                         ║
╚════════════════════════════════════════════════════════════════╝

✅ All dependencies initialized successfully
🌐 Starting server on port 5000 at 0.0.0.0...
✅ Server running on port 5000
```

### With Missing Critical Dependency

```
❌ Database failed: connect ECONNREFUSED (30001ms)

╔════════════════════════════════════════════════════════════════╗
║                 STARTUP DEPENDENCY SUMMARY                     ║
╠════════════════════════════════════════════════════════════════╣
║ ❌ Database                    [CRITICAL]  30000 ms ║
║ ✅ Redis                       [OPTIONAL]  125   ms ║
╠════════════════════════════════════════════════════════════════╣
║ Ready: 1/2 | Failed: 1 | Total: 30125ms                        ║
╚════════════════════════════════════════════════════════════════╝

❌ Startup initialization failed: Server startup failed: Critical dependencies failed: Database
❌ Failed to start server: Error: Server startup failed...
```

## Verification Checklist

- [ ] All dependencies appear in startup summary
- [ ] No "waiting..." messages for dependencies
- [ ] Startup summary shows correct timing for each dependency
- [ ] Server listens on correct port after all deps are ready
- [ ] Graceful shutdown handlers are registered
- [ ] Fail-fast mode can be enabled via FAIL_FAST_MODE env var
- [ ] Tests pass: `npm test -- __tests__/startup/dependencyGraph.test.ts`
- [ ] No breaking changes to API or routes
- [ ] Database migrations still work (document_summaries, risks.is_curated)
- [ ] Resource monitoring still starts after dependencies

## Rollback (if needed)

If you need to revert to the old system:

1. Keep the old `startServer()` implementation in a backup
2. Simply restore it and remove the StartupManager import
3. Delete the new files:
   - `server/src/startup/`
   - `server/__tests__/startup/`

## Performance Impact

- **Startup speed**: Faster (parallel vs sequential)
- **Memory**: Negligible increase (just the graph structures)
- **Runtime**: No impact (initialization only)

## Questions?

See `server/src/startup/README.md` for full documentation.
