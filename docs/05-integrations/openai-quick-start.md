# OpenAI Integration Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Run Database Migration

```bash
cd server
tsx src/database/migrate-openai-enhanced.ts
```

### 2. Add Your First OpenAI Provider

Via API:
```bash
curl -X POST http://localhost:3001/api/ai/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-openai",
    "provider_type": "openai",
    "api_key": "sk-your-api-key-here",
    "configuration": {},
    "is_active": true
  }'
```

Or via SQL:
```sql
INSERT INTO ai_providers (name, provider_type, api_key_encrypted, is_active, priority)
VALUES (
  'my-openai',
  'openai', 
  encode('sk-your-api-key-here', 'base64'),
  true,
  1
);
```

### 3. Test Your Setup

```bash
# Test connection
curl -X POST http://localhost:3001/api/ai/openai/test/my-openai

# Generate text
curl -X POST http://localhost:3001/api/ai/generate/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, world!",
    "provider": "my-openai",
    "model": "gpt-3.5-turbo"
  }'
```

## 📊 Monitor Usage

```bash
# Get provider statistics
curl http://localhost:3001/api/ai/openai/stats/my-openai

# Get all providers
curl http://localhost:3001/api/ai/openai/stats
```

## 🔄 Add Failover Provider

```sql
INSERT INTO ai_providers (name, provider_type, api_key_encrypted, is_active, priority)
VALUES (
  'backup-openai',
  'openai', 
  encode('sk-backup-api-key', 'base64'),
  true,
  2  -- Lower priority (higher number)
);
```

## ⚡ Usage in Code

```typescript
import { aiService } from './services/aiService'

// Simple generation with automatic failover
const result = await aiService.generate({
  prompt: 'Explain quantum computing',
  provider: 'my-openai',
  model: 'gpt-4'
})

console.log(result.content)
```

## 🛠️ Common Configurations

### High-Volume Setup
```json
{
  "rate_limits": {
    "requestsPerMinute": 10000,
    "tokensPerMinute": 300000,
    "requestsPerDay": 50000
  }
}
```

### Development Setup
```json
{
  "rate_limits": {
    "requestsPerMinute": 100,
    "tokensPerMinute": 10000,
    "requestsPerDay": 1000
  }
}
```

## 🚨 Troubleshooting

### Rate Limit Hit?
```bash
# Check current usage
curl http://localhost:3001/api/ai/openai/stats/my-openai
```

### Connection Issues?
```bash
# Test connection
curl -X POST http://localhost:3001/api/ai/openai/test/my-openai
```

### No Response?
1. Check if provider is active
2. Verify API key is correct
3. Check rate limits
4. Review audit logs

## 📚 Next Steps

- Read the [full documentation](./openai-integration.md)
- Set up monitoring and alerts
- Configure multiple providers for redundancy
- Implement caching for better performance

## 🎯 Key Features Enabled

✅ **Automatic Failover** - Switches providers when rate limits hit  
✅ **Rate Limiting** - Prevents API quota exhaustion  
✅ **Usage Monitoring** - Track tokens and requests  
✅ **Error Handling** - Robust error recovery  
✅ **Multiple Models** - Support for GPT-4, GPT-3.5, etc.  
✅ **Template Support** - Use with existing templates  

You're now ready to use the enhanced OpenAI integration! 🎉