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


## Health Endpoints

### Overview

Comprehensive health check endpoints provide real-time monitoring of server and dependency status. These endpoints are suitable for load balancers, Kubernetes probes, and monitoring dashboards.

### Available Endpoints

#### 1. Basic Liveness Check
**Endpoint:** \GET /health\ or \GET /api/health\

Used by load balancers for basic "is the server up?" checks.

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

Returns 200 only if server is ready to receive traffic. Checks critical dependencies (database, redis).

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
  "failedDependencies": ["database"]
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
| Database | Yes | 30s | ? Ping query |
| Redis | No | 10s | ? PING command |
| Neo4j | No | 10s | ? Query execution |
| RabbitMQ | No | 10s | ? Partial |
| AI Providers | No | 20s | ? Partial |
| Workers | No | 15s | ? Partial |

#### Status Codes

- **200 OK**: Service is healthy and ready
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



