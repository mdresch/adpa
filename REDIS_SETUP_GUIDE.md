# Redis Setup for Real-Time Collaboration

## Why Redis for ADPA?

Redis will power the following features in the upcoming real-time collaboration stage:

### 🚀 Real-Time Features
- **Live Document Editing**: Multiple users editing simultaneously
- **User Presence**: See who's viewing/editing documents
- **Real-Time Notifications**: Instant updates on document changes
- **Collaborative Cursors**: See where other users are working
- **Session Management**: Handle concurrent user sessions

### ⚡ Performance Features
- **Caching**: Store frequently accessed data (projects, templates, user profiles)
- **Job Queues**: Background processing for AI generation, exports
- **Rate Limiting**: Prevent API abuse
- **WebSocket State**: Manage Socket.io connections

---

## Option 1: Upstash Redis (Recommended - FREE)

### Step 1: Create Upstash Account

1. Go to: https://upstash.com/
2. Sign up with GitHub, Google, or Email
3. Free tier includes:
   - 10,000 commands/day
   - 256 MB storage
   - TLS encryption
   - Perfect for development and small production apps

### Step 2: Create Redis Database

1. Click **"Create Database"**
2. Configure:
   - **Name**: `adpa-production`
   - **Region**: Choose closest to your Railway deployment (e.g., `us-east-1` or `eu-west-1`)
   - **Type**: `Regional` (free tier)
   - **Eviction**: `allkeys-lru` (recommended)
   - **TLS**: ✅ Enabled (default)

3. Click **"Create"**

### Step 3: Get Redis URL

After creation, you'll see:
- **UPSTASH_REDIS_REST_URL**: For REST API access
- **Redis Connection String**: For standard Redis clients

**Copy the Redis Connection String** (format: `redis://default:PASSWORD@HOST:PORT`)

Example:
```
redis://default:AbC123XyZ...@us1-mighty-owl-12345.upstash.io:6379
```

### Step 4: Configure Railway

Run these commands in your terminal:

```powershell
# Set Redis URL in Railway
railway variables --set "REDIS_URL=redis://default:YOUR_PASSWORD@your-host.upstash.io:6379"

# Optionally set individual variables for backwards compatibility
railway variables --set "REDIS_HOST=your-host.upstash.io"
railway variables --set "REDIS_PORT=6379"
railway variables --set "REDIS_PASSWORD=YOUR_PASSWORD"
railway variables --set "REDIS_TLS=true"
```

### Step 5: Verify Connection

After Railway redeploys (automatic), check logs:
```powershell
railway logs --tail 50
```

Look for:
```
✅ Redis connected successfully
```

---

## Option 2: Railway Redis (Paid Add-on)

### Cost
- $5/month minimum
- 256 MB RAM
- Auto-scaling available

### Setup

1. Go to Railway Dashboard:
   https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3

2. Click **"+ New Service"**

3. Select **"Database" → "Add Redis"**

4. Railway automatically sets `REDIS_URL` environment variable

5. Restart your ADPA service to pick up the new variable

---

## Option 3: Local Redis (Development Only)

For local development, use Docker:

```powershell
# Start Redis locally
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Verify running
docker ps | Select-String redis

# Set local .env
echo "REDIS_URL=redis://localhost:6379" >> server/.env
```

---

## Verifying Redis Connection

### Test Health Endpoint

```powershell
# After Redis is configured and deployed
Invoke-WebRequest -Uri "https://adpa-production.up.railway.app/health"
```

### Check Railway Logs

```powershell
railway logs --tail 100 | Select-String -Pattern "Redis"
```

Expected output:
```
💾 Connecting to Redis...
✅ Redis connected successfully
```

---

## Redis Configuration in Code

Your ADPA backend already has Redis integration configured in:

### `/server/src/utils/redis.ts`
- Connection pooling
- Automatic reconnection
- Timeout handling
- Multiple connection method fallbacks

### `/server/src/server.ts`
- Socket.io integration
- Real-time event handling
- Room-based collaboration

### Usage Example

```typescript
import { cache } from './utils/redis'

// Cache user profile
await cache.set('user:123', userData, 3600) // TTL: 1 hour

// Get cached data
const user = await cache.get('user:123')

// Pub/Sub for real-time
redis.publish('document:update', JSON.stringify({
  documentId: 'abc',
  userId: '123',
  changes: [...]
}))
```

---

## Real-Time Collaboration Architecture

### With Redis

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   User A    │◄───────►│   Backend   │◄───────►│   User B    │
│  (Browser)  │  WS     │  + Redis    │  WS     │  (Browser)  │
└─────────────┘         └─────────────┘         └─────────────┘
                              ▲
                              │ Pub/Sub
                              ▼
                        ┌─────────────┐
                        │    Redis    │
                        │  (Upstash)  │
                        └─────────────┘
```

### Features Enabled
1. **User A** edits document
2. **Backend** publishes change to Redis
3. **Redis** broadcasts to all subscribers
4. **User B** receives update via WebSocket
5. **Real-time sync** across all connected clients

---

## Environment Variables Summary

After setup, you should have these in Railway:

```env
# Database (Already configured ✅)
DATABASE_URL=postgresql://...
DB_HOST=ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech
DB_NAME=adpa_db
DB_USER=neondb_owner
DB_PASSWORD=***
DB_PORT=5432
DB_SSL=true

# Redis (To be configured)
REDIS_URL=redis://default:***@your-host.upstash.io:6379
REDIS_TLS=true

# Application
PORT=5000
NODE_ENV=production
JWT_SECRET=your-secret-key

# AI Providers (Optional for now)
OPENAI_API_KEY=sk-***
GOOGLE_AI_API_KEY=***
```

---

## Testing Real-Time Features

Once Redis is configured, test with:

### 1. WebSocket Connection Test

```javascript
// Frontend test
import { io } from 'socket.io-client'

const socket = io('https://adpa-production.up.railway.app', {
  auth: { token: 'your-jwt-token' }
})

socket.on('connect', () => {
  console.log('✅ Connected to backend')
  socket.emit('join', 'project:123')
})

socket.on('document:update', (data) => {
  console.log('📝 Document updated:', data)
})
```

### 2. Cache Test

```powershell
# Test caching via API
Invoke-RestMethod -Uri "https://adpa-production.up.railway.app/api/projects" `
  -Headers @{Authorization="Bearer YOUR_TOKEN"}

# Check logs for cache hit/miss
railway logs --tail 50 | Select-String "cache"
```

---

## Monitoring Redis

### Upstash Dashboard
- Real-time metrics
- Command statistics
- Memory usage
- Connection count

### Railway Logs
```powershell
# Watch Redis activity
railway logs --tail 100 | Select-String -Pattern "Redis|cache|pub/sub"
```

---

## Next Steps

1. ✅ Create Upstash Redis database
2. ✅ Configure Railway with `REDIS_URL`
3. ✅ Verify connection in logs
4. 🚀 Ready for real-time collaboration implementation!

---

## Troubleshooting

### Connection Timeout

**Issue**: Redis connection times out

**Solution**:
```typescript
// Already implemented in server/src/utils/redis.ts
const connectionTimeout = 5000 // 5 seconds
await Promise.race([
  testClient.connect(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timeout')), connectionTimeout)
  )
])
```

### TLS/SSL Errors

**Issue**: Certificate verification failed

**Solution**: Upstash uses TLS by default. Ensure `REDIS_TLS=true` is set.

### Memory Limit

**Issue**: Upstash free tier limit reached

**Solution**:
- Monitor usage in Upstash dashboard
- Implement TTL on cached data
- Consider upgrading to paid tier ($10/month for 1GB)

---

## Cost Comparison

| Provider | Cost | Storage | Commands/Day | Notes |
|----------|------|---------|--------------|-------|
| **Upstash** | FREE | 256 MB | 10,000 | Perfect for MVP |
| Upstash Pro | $10/mo | 1 GB | 1M | Production scale |
| Railway | $5/mo | 256 MB | Unlimited | Integrated billing |
| Self-hosted | $0 | Unlimited | Unlimited | Requires management |

**Recommendation**: Start with **Upstash Free** tier for development and MVP. Upgrade when needed.

---

## Ready for Real-Time?

Once Redis is configured:
- ✅ WebSocket connections will be stateful
- ✅ Pub/Sub for document updates
- ✅ Session management across replicas
- ✅ Caching for performance
- ✅ Job queues for AI processing

**Let's set it up now!** 🚀

