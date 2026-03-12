# GitHub Issue #608: Health Endpoints - Quick Reference

## What Was Implemented

Five comprehensive health check endpoints for server monitoring and Kubernetes orchestration, now tracking all 10+ system dependencies:

| Endpoint | Purpose | Status Code |
|----------|---------|------------|
| `GET /health` | Basic liveness (load balancer) | 200 always |
| `GET /health/ready` | Readiness probe (Kubernetes) | 200/503 (Strict) |
| `GET /health/live` | Liveness probe (Kubernetes) | 200/status: "live" |
| `GET /health/dependencies` | Dependency status | 200 always |
| `GET /health/full` | Comprehensive health + metrics | 200/503 |

All endpoints available at both `/health` and `/api/health` paths.

## Quick Start

### Test Locally
```bash
# Basic check
curl http://localhost:5000/health

# Readiness (with dependency check)
curl http://localhost:5000/health/ready

# See all dependencies
curl http://localhost:5000/health/dependencies

# Full system health
curl http://localhost:5000/health/full
```

### Use in Kubernetes
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

livenessProbe:
  httpGet:
    path: /health/live
    port: 5000
  initialDelaySeconds: 60
  periodSeconds: 20
```

### Configure Load Balancer
- **URL**: `/health`
- **Interval**: 10-30 seconds
- **Timeout**: 5 seconds
- **Unhealthy after**: 3 consecutive failures

## Response Examples

### Healthy Response (200 OK)
```json
{
  "status": "healthy",
  "timestamp": "2026-03-12T10:00:00.000Z",
  "uptime": 3600
}
```

### Liveness Response (200 OK)
```json
{
  "status": "live",
  "timestamp": "2026-03-12T10:00:00.000Z",
  "message": "Server is alive"
}
```

### Not Ready Response (503)
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-26T10:00:00.000Z",
  "message": "Server is not ready",
  "failedDependencies": ["database"]
}
```

### Dependencies Response (200 OK)
```json
{
  "status": "healthy",
  "summary": {
    "total": 10,
    "healthy": 10,
    "unhealthy": 0
  },
  "dependencies": [
    { "name": "Database", "status": "healthy", "latency": 45 },
    { "name": "Redis", "status": "healthy", "latency": 12 },
    { "name": "Neo4j", "status": "healthy", "latency": 234 },
    { "name": "Pinecone", "status": "healthy", "latency": 89 },
    { "name": "MongoDB Atlas", "status": "healthy", "latency": 156 },
    { "name": "AI Providers", "status": "healthy", "latency": 120 },
    { "name": "Workers", "status": "healthy", "latency": 0 },
    { "name": "Langfuse", "status": "healthy", "latency": 0 },
    { "name": "RabbitMQ", "status": "healthy", "latency": 0 }
  ]
}
```

## Architecture

### Components
1. **Health Routes** (`server/src/routes/health.ts`)
   - 5 endpoints with different checks
   - Dependency tracking system
   - Real-time latency measurement

2. **Startup Integration**
   - Registers dependencies at startup
   - Updates health status during init
   - Tracks all dependency statuses

3. **Dependency Reporting**
   - Database, Redis, Neo4j track their health (Critical)
   - MongoDB, Pinecone, AI Providers, Workers, Langfuse, RabbitMQ track their health (Service-level)
   - Report latency with each status
   - Include error messages when unhealthy

## Key Features

✅ **5 Purpose-Built Endpoints**
- Liveness, readiness, liveness, dependency status, full health

✅ **Real-Time Dependency Tracking**
- 10+ dependencies monitored (Database, Redis, Neo4j, Pinecone, etc.)
- Latency measured for each check
- Status updated during operation

✅ **System Metrics**
- Memory usage percentage
- Process uptime
- Process ID

✅ **Kubernetes Ready**
- Readiness probe support
- Liveness probe support
- Standard HTTP status codes

✅ **Load Balancer Compatible**
- Simple heartbeat endpoint
- Consistent response format
- Predictable status codes

## Files Modified

| File | Changes |
|------|---------|
| `server/src/routes/health.ts` | NEW - Health endpoints router |
| `server/src/server.ts` | Imported and registered health routes |
| `server/src/startup/startupManager.ts` | Added getDependencyNames() method |
| `server/src/startup/serverBootstrap.ts` | Initialize health tracking |
| `server/src/startup/dependencies/database.ts` | Add health reporting |
| `server/src/startup/dependencies/redis.ts` | Add health reporting |
| `server/src/startup/dependencies/neo4j.ts` | Add health reporting |
| `server/src/startup/dependencies/pinecone.ts` | Add health reporting |
| `server/src/startup/dependencies/mongodb.ts` | Add health reporting |
| `server/src/startup/dependencies/aiProviders.ts` | Add health reporting |
| `server/src/startup/dependencies/workers.ts` | Add health reporting |
| `server/src/startup/dependencies/langfuse.ts` | Add health reporting |
| `server/src/startup/dependencies/rabbitmq.ts` | Add health reporting |
| `server/src/startup/README.md` | Comprehensive documentation |
| `server/src/routes/__tests__/health_logic.test.ts` | NEW - Automated verification tests |

## Status Codes Reference

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Healthy/Ready | Normal operation |
| 503 | Unavailable | Critical dependency failed |
| 500 | Internal Error | Health check itself failed |

## Best Practices

1. **Load Balancers** → Use `/health` endpoint
2. **Kubernetes** → Use `/health/ready` + `/health/live`
3. **Monitoring** → Scrape `/health/full` endpoint
4. **Dashboards** → Poll `/health/dependencies`
5. **Alerting** → Watch for status changes

## Monitoring Commands

```bash
# Watch health status
watch -n 2 'curl -s http://localhost:5000/health/dependencies | jq .'

# Check specific dependency
curl http://localhost:5000/health/dependencies | jq '.dependencies[] | select(.name=="Database")'

# Get memory usage
curl http://localhost:5000/health/full | jq '.systemMetrics'

# Continuous readiness check
watch -n 5 'curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5000/health/ready'
```

## Troubleshooting

### `readiness check failed` - Critical dependency down
- Check `/health/dependencies` for which one
- Verify database/redis connectivity
- Check dependency logs

### `liveness check failed` - Process hung
- Check system resources (CPU, memory)
- Look for stuck threads in logs
- Restart container (Kubernetes will do this)

### Latency too high
- Monitor in `/health/dependencies`
- Check `latency` field for each dependency
- Investigate slow database queries, network issues

## Integration with Issue #607

Security validation runs **before** health checks:
1. Security config validated at startup
2. Health endpoints initialized after all deps ready
3. Health reflects current dependency status

## Related Documentation

- Startup README: `server/src/startup/README.md` → "Health Endpoints" section
- Implementation Details: `GITHUB_ISSUE_608_IMPLEMENTATION_SUMMARY.md`
- Kubernetes Integration: See "Kubernetes Deployment" in startup README

---

**Ready to Deploy!** All health endpoints are production-ready with full dependency tracking and verified via automated Jest tests.
