# Startup Dependency Graph & Readiness Gate

## Overview

The Startup Dependency Graph is a deterministic initialization system for server startup that prevents race conditions and provides clear visibility into which dependencies are ready. The production bootstrap binds the HTTP port before dependency initialization so platform health checks can reach the process while the database and other services are still connecting.

### Key Features

- **Parallel Initialization**: All dependencies initialize in parallel for faster startup
- **Timeout Protection**: Each dependency has a configurable timeout
- **Fail-Fast Mode**: Optional mode that stops startup on first critical failure
- **Readiness Gate**: API routes after `/health` return `503` with `Retry-After: 5` until `StartupManager.isReady()` is true
- **Background DB Retry**: If initial dependency startup fails, the server stays alive and retries the database connection before calling `forceReady()`
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

Orchestrates the complete startup sequence using the dependency graph. It registers dependencies in this order:

1. **Security Configuration Validation** (critical: true) - 5s timeout
2. **Database** (critical: true) - 65s timeout
3. **Azure Backend Availability** (critical: false) - 10s timeout
4. **Firebase Auth Provider** (critical outside development) - 10s timeout
5. **Primary Redis** (critical: false) - 10s timeout
6. **Neo4j** (critical: false) - 30s timeout
7. **RabbitMQ** (critical: false) - 30s timeout
8. **AI Providers** (critical: false) - 20s timeout
9. **Workers** (critical: false) - 15s timeout
10. **MongoDB Atlas** (critical: false) - 15s timeout
11. **Pinecone** (critical: false) - 10s timeout
12. **Langfuse** (critical: false) - 5s timeout
13. **Upstash Redis** (critical: false) - 10s timeout
14. **Morphic DB** (critical: false) - 30s timeout

## Configuration

### Fail-Fast Mode

Enable via environment variable:

```bash
FAIL_FAST_MODE=true npm run dev
```

In fail-fast mode, the dependency graph throws as soon as critical initialization fails. In the current production bootstrap, `serverBootstrap.ts` catches that failure after the port is bound, keeps the process alive for liveness checks, and leaves the readiness gate closed while the background database retry loop runs. This is useful for:
- Surfacing critical dependency failures clearly in logs
- Debugging deployment issues
- CI/CD or local runs that exercise the dependency graph directly

### Individual Dependency Timeouts

Edit the timeout in each dependency file:

```typescript
// server/src/startup/dependencies/database.ts
timeout: 65000, // 65 seconds
```

## Usage

### Runtime Flow in serverBootstrap.ts

`server/src/server.ts` delegates boot to `initializeServerWithDependencyGraph` in `server/src/startup/serverBootstrap.ts`. The current flow is:

```typescript
export async function initializeServerWithDependencyGraph(server, io, PORT) {
  const startupManager = new StartupManager()

  initializeDependencyHealthTracking(startupManager.getDependencyNames())
  registerShutdownHandlers(startupManager)

  // Bind HTTP first so Render/Fly-style port checks see a live process.
  await listen(server, PORT)

  try {
    await startupManager.initialize()
  } catch (error) {
    // Do not exit after the port is bound. Keep /health reachable and retry DB.
    startBackgroundDbRetry(startupManager)
    return
  }

  startScheduledJobs()
  startStuckJobMonitor()
}
```

The readiness gate lives in `server/src/server.ts`, after `/health` and `/api/health` are mounted. While `startupManager` is missing or not ready, downstream API routes return:

```json
{
  "error": "Service Unavailable",
  "message": "Server is currently initializing dependencies (e.g. database connection). Please try again in a few seconds."
}
```

The response includes `Retry-After: 5`.

### Cold-Start Recovery

If dependency initialization fails during a database cold start, `serverBootstrap.ts` starts a background retry loop:

1. Waits 30 seconds by default.
2. Calls `connectDatabase()`.
3. On failure, logs and schedules another attempt.
4. On success, calls `startupManager.forceReady()` to open the readiness gate.

This path keeps the process alive for platform liveness checks while preventing normal API traffic from reaching routes that need the database.

## Startup Output Example

```
╔════════════════════════════════════════════════════════════════╗
║                 STARTUP DEPENDENCY SUMMARY                     ║
╠════════════════════════════════════════════════════════════════╣
║ ✅ Security Configuration Validation [CRITICAL]  12    ms ║
║ ✅ Database                          [CRITICAL]  245   ms ║
║ ✅ Primary Redis                     [OPTIONAL]  125   ms ║
║ ✅ Neo4j                             [OPTIONAL]  87    ms ║
║ ⏳ RabbitMQ                          [OPTIONAL]  0     ms ║
║ ✅ AI Providers                      [OPTIONAL]  1250  ms ║
╠════════════════════════════════════════════════════════════════╣
║ Ready: 5/6 | Failed: 1 | Total: 2047ms                       ║
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


## Health Endpoints

### Overview

Comprehensive health check endpoints provide real-time monitoring of server and dependency status. These endpoints are suitable for load balancers, Kubernetes probes, and monitoring dashboards.

### Available Endpoints

`/health` and `/api/health` are registered before the readiness gate, so they are reachable even while dependency initialization is still running. Use `/health` for basic process liveness. Use `/health/ready` when a caller needs the stricter probe implemented in `server/src/routes/health.ts`; it is not the same check as the API readiness gate.

#### 1. Basic Liveness Check
**Endpoint:** \GET /health\ or \GET /api/health\

Used by load balancers and keep-alive pings for basic "is the server up?" checks. It returns 200 if the process can respond; it does not prove the database is ready.

**Response (200 OK):**
\\\json
{
  "status": "healthy",
  "timestamp": "2025-01-26T10:00:00.000Z",
  "uptime": 3600
}
\\\

#### 2. Kubernetes Readiness Probe
**Endpoint:** \GET /health/ready\ or \GET /api/health/ready\

Returns 200 only if the explicit readiness probe passes. The implementation checks tracked entries named `Database`, `Redis`, and `Neo4j`, then runs a quick `SELECT 1` query. This probe can be stricter or differently named than the `StartupManager.isReady()` gate used by normal API routes.

**Response (200 OK - Ready):**
\\\json
{
  "status": "healthy",
  "timestamp": "2025-01-26T10:00:00.000Z",
  "uptime": 3600,
  "message": "Server is ready to receive traffic"
}
\\\

**Response (503 Service Unavailable - Not Ready):**
\\\json
{
  "status": "unhealthy",
  "timestamp": "2025-01-26T10:00:00.000Z",
  "uptime": 3600,
  "message": "Server is not ready",
  "failedDependencies": [
    {
      "name": "database-query",
      "error": "Still initializing/connecting..."
    }
  ]
}
\\\

#### 3. Kubernetes Liveness Probe
**Endpoint:** \GET /health/live\ or \GET /api/health/live\

Returns 200 if server is still running (not hung). Less strict than readiness - used to restart stuck instances.

**Response (200 OK):**
\\\json
{
  "status": "healthy",
  "timestamp": "2025-01-26T10:00:00.000Z",
  "uptime": 3600,
  "message": "Server is alive"
}
\\\

#### 4. Dependency Status
**Endpoint:** \GET /health/dependencies\ or \GET /api/health/dependencies\

Detailed health status of all registered dependencies.

**Response (200 OK):**
\\\json
{
  "status": "healthy",
  "timestamp": "2025-01-26T10:00:00.000Z",
  "uptime": 3600,
  "summary": {
    "total": 10,
    "healthy": 10,
    "unhealthy": 0,
    "unknown": 0
  },
  "dependencies": [
    {
      "name": "Database",
      "status": "healthy",
      "latency": 45,
      "lastCheck": "2025-01-26T10:00:00.000Z"
    },
    {
      "name": "Redis",
      "status": "healthy",
      "latency": 12,
      "lastCheck": "2025-01-26T10:00:00.000Z"
    },
    {
      "name": "Neo4j",
      "status": "healthy",
      "latency": 234,
      "lastCheck": "2025-01-26T10:00:00.000Z"
    }
  ]
}
\\\

#### 5. Comprehensive System Health
**Endpoint:** \GET /health/full\ or \GET /api/health/full\

Most detailed response including system metrics. Best for dashboards and comprehensive monitoring.

**Response (200 OK):**
\\\json
{
  "status": "healthy",
  "timestamp": "2025-01-26T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": [ ... ],
  "systemMetrics": {
    "memoryUsage": 65,
    "uptime": 3600,
    "pid": 12345
  }
}
\\\

### Kubernetes Integration

Use these endpoints in your Kubernetes deployment manifest:

\\\yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: adpa-server
spec:
  template:
    spec:
      containers:
      - name: adpa
        image: your-image:latest
        
        # Readiness probe - checks if ready for traffic
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Liveness probe - checks if process is hung
        livenessProbe:
          httpGet:
            path: /health/live
            port: 5000
          initialDelaySeconds: 60
          periodSeconds: 20
          timeoutSeconds: 5
          failureThreshold: 3
\\\

### Monitoring Integration

#### Prometheus Scraping
Add to your Prometheus \prometheus.yml\:

\\\yaml
scrape_configs:
  - job_name: 'adpa-health'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/health/full'
    scrape_interval: 30s
\\\

#### Load Balancer Health Checks
Configure your load balancer to use:
- **Health Check URL:** \/health\ (basic) or \/health/ready\ (strict)
- **Expected Status:** 200 OK
- **Interval:** 10-30 seconds
- **Timeout:** 5 seconds
- **Unhealthy Threshold:** 3 consecutive failures

### Implementation Details

#### Dependency Health Tracking

Each dependency reports health status during initialization:

| Dependency | Critical | Timeout | Monitored |
|-----------|----------|---------|-----------|
| Security Configuration Validation | Yes | 5s | Production TLS safety check |
| Database | Yes | 65s | Connection and query probe |
| Azure Backend Availability | No | 10s | `/health` HTTP request |
| Firebase Auth Provider | Production only | 10s | Provider handshake |
| Primary Redis | No | 10s | PING command |
| Neo4j | No | 30s | Query execution |
| RabbitMQ | No | 30s | Connection placeholder |
| AI Providers | No | 20s | Provider availability |
| Workers | No | 15s | Worker availability |
| MongoDB Atlas | No | 15s | Connection probe |
| Pinecone | No | 10s | Client availability |
| Langfuse | No | 5s | Client availability |
| Upstash Redis | No | 10s | HTTP/client availability |
| Morphic DB | No | 30s | Connection probe |

#### Status Codes

- **200 OK**: The requested health check passed. For `/health`, this means process liveness; for `/health/ready`, this means readiness checks passed.
- **503 Service Unavailable**: Service is degraded or not ready
- **500 Internal Server Error**: Health check itself failed

### Best Practices

1. **Use readiness probes for traffic routing** - Ensures traffic only goes to healthy instances
2. **Use liveness probes for restart detection** - Restarts hung processes
3. **Monitor dependency health** - Track \/health/dependencies\ for early warning
4. **Set appropriate intervals** - 10-30 seconds typically sufficient
5. **Log health check responses** - Useful for debugging issues

## Troubleshooting

### "Critical dependency failed" error

1. Check logs for which dependency failed
2. Verify environment variables are set (DATABASE_URL, REDIS_URL, etc.)
3. Check external service connectivity
4. If the port is already bound, rely on the readiness gate and background database retry rather than sending traffic to normal API routes.

### Slow startup (long duration in summary)

1. Identify the slowest dependency in the summary
2. Increase its timeout if network is slow
3. Check if service is responsive (ping it manually)
4. Consider moving to another machine/region

### "The port is open, but API routes return 503"

This is expected while the readiness gate is closed. Check `/health/ready` for dependency details, then inspect startup logs for the dependency that is still connecting. For database cold starts, the background retry loop logs each attempt and opens the gate with `forceReady()` after a successful `connectDatabase()` call.

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
- [ ] General retry logic for non-database dependencies
- [ ] Integration with Kubernetes readiness/liveness probes



