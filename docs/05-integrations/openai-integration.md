# OpenAI Integration Documentation

## Overview

The ADPA Framework now includes a comprehensive OpenAI integration with advanced features including:

- **Failover Logic**: Automatic switching between multiple OpenAI providers
- **Rate Limiting**: Built-in rate limit management and monitoring
- **Enhanced Error Handling**: Robust error handling with retry mechanisms
- **Usage Analytics**: Detailed usage statistics and monitoring
- **Multiple Provider Support**: Support for multiple OpenAI accounts/organizations

## Features

### 🔄 Failover Logic
- Automatic provider switching when rate limits are hit
- Priority-based provider ordering
- Real-time provider health monitoring
- Seamless failover without request loss

### 📊 Rate Limiting
- Per-minute request limits
- Per-minute token limits
- Daily request limits
- Automatic counter resets
- Rate limit violation handling

### 🛡️ Enhanced Error Handling
- Comprehensive error categorization
- Retry logic for transient errors
- Graceful degradation
- Detailed error reporting

### 📈 Usage Analytics
- Real-time usage monitoring
- Historical usage statistics
- Provider performance metrics
- Cost tracking capabilities

## Installation and Setup

### 1. Database Migration

Run the OpenAI enhanced features migration:

```bash
cd server
npm run migrate:openai-enhanced
```

Or manually run:

```bash
tsx src/database/migrate-openai-enhanced.ts
```

### 2. Provider Configuration

Add OpenAI providers through the admin interface or directly via API:

```typescript
// Example provider configuration
const providerConfig = {
  name: "openai-primary",
  provider_type: "openai",
  api_key: "sk-your-api-key-here",
  configuration: {
    organization: "org-your-org-id", // Optional
    timeout: 60000, // Optional, default 60s
    maxRetries: 3 // Optional, default 3
  },
  is_active: true,
  priority: 1, // Lower number = higher priority
  rate_limits: {
    requestsPerMinute: 3500,
    tokensPerMinute: 90000,
    requestsPerDay: 10000
  }
}
```

### 3. Environment Variables

Add to your `.env` file:

```env
# OpenAI Configuration
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
OPENAI_DEFAULT_TEMPERATURE=0.7
OPENAI_DEFAULT_MAX_TOKENS=1000

# Rate Limiting
OPENAI_RATE_LIMIT_WINDOW=60000  # 1 minute in ms
OPENAI_RATE_LIMIT_RESET_INTERVAL=300000  # 5 minutes in ms
```

## API Reference

### Generate Completion (Enhanced)

Generate text using OpenAI with failover support.

**Endpoint:** `POST /api/ai/generate/enhanced`

**Request Body:**
```json
{
  "prompt": "Write a brief summary of AI benefits",
  "provider": "openai-primary",
  "model": "gpt-4",
  "temperature": 0.7,
  "max_tokens": 500,
  "template_id": "uuid-optional",
  "variables": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "content": "Generated text content...",
  "provider": "openai-primary",
  "model": "gpt-4",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 120,
    "total_tokens": 135
  },
  "metadata": {
    "duration_ms": 1250,
    "requested_provider": "openai-primary",
    "actual_provider": "openai-primary",
    "failover_used": false,
    "finish_reason": "stop"
  }
}
```

### Get Provider Statistics

Get detailed statistics for OpenAI providers.

**Endpoint:** `GET /api/ai/openai/stats/:name?`

**Response:**
```json
{
  "stats": {
    "id": "uuid",
    "name": "openai-primary",
    "isActive": true,
    "priority": 1,
    "rateLimits": {
      "requestsPerMinute": 3500,
      "tokensPerMinute": 90000,
      "requestsPerDay": 10000
    },
    "currentUsage": {
      "requestsThisMinute": 45,
      "tokensThisMinute": 12500,
      "requestsToday": 1250,
      "lastReset": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Test Provider Connection

Test connectivity to an OpenAI provider.

**Endpoint:** `POST /api/ai/openai/test/:name`

**Response:**
```json
{
  "provider": "openai-primary",
  "connected": true,
  "tested_at": "2024-01-15T10:30:00Z"
}
```

### Get Available Models

Get list of available models for a provider.

**Endpoint:** `GET /api/ai/openai/models/:name`

**Response:**
```json
{
  "provider": "openai-primary",
  "models": [
    "gpt-4",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k"
  ],
  "fetched_at": "2024-01-15T10:30:00Z"
}
```

## Usage Examples

### Basic Text Generation

```typescript
import { openaiConnector } from './modules/ai/openai'

const request = {
  model: 'gpt-3.5-turbo',
  messages: [
    { role: 'user', content: 'Explain quantum computing in simple terms' }
  ],
  temperature: 0.7,
  max_tokens: 200
}

try {
  const response = await openaiConnector.generateCompletion(request)
  console.log('Generated text:', response.choices[0].message.content)
  console.log('Used provider:', response.provider)
  console.log('Token usage:', response.usage)
} catch (error) {
  console.error('Generation failed:', error.message)
}
```

### Using AI Service with Failover

```typescript
import { aiService } from './services/aiService'

try {
  const result = await aiService.generate({
    prompt: 'Write a product description for a smart watch',
    provider: 'openai-primary', // Will failover if needed
    model: 'gpt-4',
    temperature: 0.8,
    max_tokens: 300
  })

  console.log('Content:', result.content)
  console.log('Provider used:', result.provider)
  console.log('Tokens used:', result.usage?.total_tokens)
} catch (error) {
  console.error('All providers failed:', error.message)
}
```

### Monitoring Provider Health

```typescript
import { aiService } from './services/aiService'

// Get all provider statistics
const allStats = await aiService.getOpenAIProviderStats()
console.log('All providers:', allStats)

// Get specific provider stats
const primaryStats = await aiService.getOpenAIProviderStats('openai-primary')
console.log('Primary provider stats:', primaryStats)

// Test provider connection
const isConnected = await aiService.testOpenAIConnection('openai-primary')
console.log('Provider connected:', isConnected)
```

### Template-based Generation

```typescript
const result = await aiService.generate({
  prompt: 'Generate content using template',
  provider: 'openai-primary',
  template_id: 'business-plan-template',
  variables: {
    company_name: 'TechCorp',
    industry: 'Software Development',
    target_market: 'Small Businesses'
  }
})
```

## Configuration Guide

### Provider Priority Setup

Configure multiple providers with different priorities:

```sql
-- Primary provider (highest priority)
INSERT INTO ai_providers (name, provider_type, api_key_encrypted, priority, rate_limits)
VALUES (
  'openai-primary',
  'openai',
  'base64-encoded-key',
  1,
  '{"requestsPerMinute": 3500, "tokensPerMinute": 90000, "requestsPerDay": 10000}'
);

-- Backup provider (lower priority)
INSERT INTO ai_providers (name, provider_type, api_key_encrypted, priority, rate_limits)
VALUES (
  'openai-backup',
  'openai',
  'base64-encoded-backup-key',
  2,
  '{"requestsPerMinute": 1000, "tokensPerMinute": 30000, "requestsPerDay": 5000}'
);
```

### Rate Limit Configuration

Customize rate limits based on your OpenAI plan:

```json
{
  "requestsPerMinute": 3500,    // Requests per minute
  "tokensPerMinute": 90000,     // Tokens per minute
  "requestsPerDay": 10000       // Requests per day
}
```

### Organization Setup

For OpenAI organizations:

```json
{
  "organization": "org-your-org-id",
  "timeout": 60000,
  "maxRetries": 3,
  "defaultHeaders": {
    "Custom-Header": "value"
  }
}
```

## Monitoring and Analytics

### Usage Statistics

Monitor usage through the database view:

```sql
SELECT * FROM openai_provider_stats;
```

### Real-time Monitoring

```typescript
// Get current usage for all providers
const stats = await aiService.getOpenAIProviderStats()

stats.forEach(provider => {
  const usage = provider.currentUsage
  const limits = provider.rateLimits
  
  console.log(`Provider: ${provider.name}`)
  console.log(`Requests: ${usage.requestsThisMinute}/${limits.requestsPerMinute}`)
  console.log(`Tokens: ${usage.tokensThisMinute}/${limits.tokensPerMinute}`)
  console.log(`Daily: ${usage.requestsToday}/${limits.requestsPerDay}`)
})
```

### Audit Logs

Track all AI generation requests:

```sql
SELECT 
  al.*,
  ap.name as provider_name
FROM audit_logs al
JOIN ai_providers ap ON al.resource_id::uuid = ap.id
WHERE al.action IN ('ai_generate_enhanced', 'ai_generate_enhanced_failed')
ORDER BY al.created_at DESC;
```

## Troubleshooting

### Common Issues

#### 1. Rate Limit Exceeded
```
Error: All OpenAI providers failed. Last error: Rate limit exceeded
```

**Solution:**
- Check provider rate limits: `GET /api/ai/openai/stats`
- Add additional providers with different API keys
- Increase rate limits if you have a higher-tier plan

#### 2. Authentication Failed
```
Error: Authentication failed
```

**Solution:**
- Verify API key is correct and active
- Check if API key has proper permissions
- Test connection: `POST /api/ai/openai/test/:name`

#### 3. No Available Providers
```
Error: No available OpenAI providers
```

**Solution:**
- Ensure at least one provider is active
- Check provider configuration in database
- Verify rate limits haven't been exceeded

#### 4. Failover Not Working
```
Error: Provider not failing over as expected
```

**Solution:**
- Check provider priorities in database
- Verify backup providers are active
- Review rate limit configurations

### Debug Mode

Enable debug logging:

```typescript
import { logger } from './utils/logger'

// Set log level to debug
logger.level = 'debug'

// Monitor OpenAI connector activity
const result = await openaiConnector.generateCompletion(request)
```

### Health Checks

Regular health check script:

```typescript
async function healthCheck() {
  const providers = await aiService.getOpenAIProviderStats()
  
  for (const provider of providers) {
    const isConnected = await aiService.testOpenAIConnection(provider.name)
    console.log(`${provider.name}: ${isConnected ? 'OK' : 'FAILED'}`)
  }
}

// Run every 5 minutes
setInterval(healthCheck, 5 * 60 * 1000)
```

## Migration Guide

### From Legacy OpenAI Integration

If you're upgrading from the basic OpenAI integration:

1. **Run the migration:**
   ```bash
   tsx src/database/migrate-openai-enhanced.ts
   ```

2. **Update existing providers:**
   ```sql
   UPDATE ai_providers 
   SET 
     priority = 1,
     rate_limits = '{"requestsPerMinute": 3500, "tokensPerMinute": 90000, "requestsPerDay": 10000}'
   WHERE provider_type = 'openai';
   ```

3. **Update application code:**
   ```typescript
   // Old way
   const result = await aiService.generate({
     prompt: 'test',
     provider: 'openai-provider'
   })

   // New way (same API, enhanced features)
   const result = await aiService.generate({
     prompt: 'test',
     provider: 'openai-provider' // Now includes failover and rate limiting
   })
   ```

### Breaking Changes

- None! The new integration is backward compatible
- Existing API endpoints continue to work
- New enhanced endpoints provide additional features

## Performance Optimization

### Best Practices

1. **Use appropriate models:**
   - `gpt-3.5-turbo` for general tasks
   - `gpt-4` for complex reasoning
   - `gpt-4-turbo` for longer contexts

2. **Optimize token usage:**
   - Set appropriate `max_tokens` limits
   - Use system messages efficiently
   - Monitor token consumption

3. **Configure rate limits properly:**
   - Match your OpenAI plan limits
   - Leave buffer for burst traffic
   - Monitor usage patterns

4. **Use multiple providers:**
   - Distribute load across providers
   - Set up proper failover chains
   - Monitor provider health

### Caching

Implement response caching for repeated requests:

```typescript
import { kv } from './lib/kv'

async function generateWithCache(request: OpenAIRequest) {
  const cacheKey = `openai:${JSON.stringify(request)}`
  
  // Check cache first
  const cached = await kv.get(cacheKey)
  if (cached) {
    return cached
  }
  
  // Generate new response
  const response = await openaiConnector.generateCompletion(request)
  
  // Cache for 1 hour
  await kv.setex(cacheKey, 3600, response)
  
  return response
}
```

## Security Considerations

### API Key Management

- Store API keys encrypted in database
- Use environment variables for sensitive configuration
- Rotate API keys regularly
- Monitor for unauthorized usage

### Rate Limiting

- Implement application-level rate limiting
- Monitor for abuse patterns
- Set up alerts for unusual usage

### Access Control

- Restrict access to OpenAI endpoints
- Implement proper authentication
- Log all AI generation requests

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the audit logs for error details
3. Test provider connections using the test endpoints
4. Monitor provider statistics for usage patterns

## Changelog

### v1.0.0 (Current)
- Initial OpenAI integration with failover logic
- Rate limiting and usage monitoring
- Enhanced error handling
- Multiple provider support
- Comprehensive API endpoints
- Database migration for enhanced features