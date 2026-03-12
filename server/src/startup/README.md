# Startup Dependency Graph & Fail-Fast Mode

## Overview

The Startup Dependency Graph is a deterministic initialization system for server startup that prevents race conditions and provides clear visibility into which dependencies are ready.

### Key Features

- **Parallel Initialization**: All dependencies initialize in parallel for faster startup
- **Timeout Protection**: Each dependency has a configurable timeout
- **Fail-Fast Mode**: Optional mode that stops startup on first critical failure
- **Health Checks**: Built-in validation for each dependency
- **Graceful Shutdown**: Proper cleanup of all dependencies on server stop
- **Startup Summary**: Formatted console output showing initialization status

## Architecture

### Core Components

#### DependencyGraph (`server/src/startup/dependencyGraph.ts`)

The core graph engine that manages dependency lifecycle:

```typescript
export interface Dependency {
  name: string
  critical: boolean            // true = required for server operation
  timeout: number              // milliseconds
  init: () => Promise<void>    // initialization logic
  validate: () => Promise<boolean> // validation after init
  shutdown?: () => Promise<void>   // cleanup on shutdown
}
```

#### StartupManager (`server/src/startup/startupManager.ts`)

Orchestrates the complete startup sequence using the dependency graph. Registers all 6 dependencies in order of criticality:

1. **Database** (critical: true) - 30s timeout
2. **Redis** (critical: false) - 10s timeout
3. **Neo4j** (critical: false) - 10s timeout
4. **RabbitMQ** (critical: false) - 10s timeout (placeholder)
5. **AI Providers** (critical: false) - 20s timeout
6. **Workers** (critical: false) - 15s timeout

## Configuration

### Fail-Fast Mode

Enable via environment variable:

```bash
FAIL_FAST_MODE=true npm run dev
```

In fail-fast mode, the server refuses to boot if ANY critical dependency fails. This is useful for:
- Production deployments where all dependencies must be available
- Debugging deployment issues
- CI/CD pipelines

### Individual Dependency Timeouts

Edit the timeout in each dependency file:

```typescript
// server/src/startup/dependencies/database.ts
timeout: 30000, // 30 seconds
```

## Usage

### In server.ts

Import and use the StartupManager:

```typescript
import { StartupManager } from "./startup/startupManager"

async function startServer() {
  const startupManager = new StartupManager()
  
  try {
    await startupManager.initialize()
    // All dependencies ready - continue with server setup
    
    server.listen(PORT, () => {
      console.log("✅ Server running")
    })
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await startupManager.shutdown()
      process.exit(0)
    })
  } catch (error) {
    console.error("❌ Startup failed:", error)
    process.exit(1)
  }
}
```

## Startup Output Example

```
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
║ Ready: 5/6 | Failed: 1 | Total: 2047ms                         ║
╚════════════════════════════════════════════════════════════════╝
```

## Adding a New Dependency

1. Create a new file in `server/src/startup/dependencies/myDep.ts`:

```typescript
import { Dependency } from "../dependencyGraph"
import { logger } from "../../utils/logger"

export const myDependency: Dependency = {
  name: "My Service",
  critical: false,
  timeout: 15000,
  init: async () => {
    // Initialize your service
  },
  validate: async () => {
    // Validate service is ready
    return true // or false if validation fails
  },
  shutdown: async () => {
    // Optional cleanup
  },
}
```

2. Export it from `server/src/startup/dependencies/index.ts`:

```typescript
export { myDependency } from "./myDep"
```

3. Register it in `StartupManager`:

```typescript
import { myDependency } from "./dependencies"

// In StartupManager.registerDependencies()
this.graph.register(myDependency)
```

## Testing

Run the dependency graph tests:

```bash
npm run test -- __tests__/startup/dependencyGraph.test.ts
```

Tests cover:
- Dependency registration and initialization
- Timeout handling
- Error scenarios
- Fail-fast mode behavior
- Parallel initialization
- Health checks
- Shutdown procedures

## Troubleshooting

### "Critical dependency failed" error

1. Check logs for which dependency failed
2. Verify environment variables are set (DATABASE_URL, REDIS_URL, etc.)
3. Check external service connectivity
4. Disable fail-fast mode to allow partial startup: `FAIL_FAST_MODE=false`

### Slow startup (long duration in summary)

1. Identify the slowest dependency in the summary
2. Increase its timeout if network is slow
3. Check if service is responsive (ping it manually)
4. Consider moving to another machine/region

### "npm run dev completes without 'waiting...' logs"

This is the goal! The dependency graph prevents the old "waiting for services" logs by ensuring deterministic initialization order. All services should be initialized before the server starts listening.

## Security Validation

### TLS Certificate Verification

The startup process includes a critical security validation dependency that ensures production environments cannot bypass TLS verification.

**Security Validation Dependency** (server/src/startup/dependencies/validateConfig.ts):
- **Purpose**: Prevent insecure TLS configurations in production
- **Check**: NODE_ENV === 'production' AND NODE_TLS_REJECT_UNAUTHORIZED === '0'
- **Action**: Logs error and throws exception if both conditions are true
- **Execution**: First critical dependency in startup sequence

#### Configuration

**Development (default - optional for self-signed certs):**
`ash
# .env.development
# NODE_TLS_REJECT_UNAUTHORIZED=0  # ONLY for local development with self-signed certs
`

**Production (required - TLS always enforced):**
`ash
# .env.production
# NODE_TLS_REJECT_UNAUTHORIZED must NOT be set to "0"
# Default behavior: TLS verification is enabled
`

#### Error Handling

If production startup attempts with insecure TLS:
`
? CRITICAL SECURITY WARNING: NODE_TLS_REJECT_UNAUTHORIZED=0 is set in production. 
This bypasses TLS verification and is highly unsafe. Startup aborted.
`

#### Testing Security Validation

`ash
# This will FAIL (correct behavior):
NODE_ENV=production NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

# This will SUCCEED:
NODE_ENV=production npm run dev

# This will SUCCEED (development allows it):
NODE_ENV=development NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
`

## Related Issues

- GitHub Issue #607: Security Hardening - TLS & Config Validation
- GitHub Issue #607: Security Hardening - TLS & Config Validation
- GitHub Issue #606: Phase 1.1 Startup Dependency Graph & Fail-Fast Mode

## Future Enhancements

- [ ] Dependency ordering constraints (A depends on B)
- [ ] Metrics collection and reporting
- [ ] Health check intervals during operation
- [ ] Automatic retry logic with exponential backoff
- [ ] Integration with Kubernetes readiness/liveness probes


