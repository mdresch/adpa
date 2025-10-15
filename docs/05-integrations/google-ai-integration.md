# Google AI Integration Guide

This document provides comprehensive information about the Google AI (Gemini) integration in the ADPA Framework.

## Overview

The Google AI integration provides access to Google's Gemini Pro models through a robust connector that includes:

- **Multi-provider support** with automatic failover
- **Rate limiting** and quota management
- **Usage tracking** and statistics
- **Error handling** with retry logic
- **OpenAI-compatible interface** for easy migration

## Features

### Supported Models

- `gemini-pro` - General purpose text generation
- `gemini-pro-vision` - Multimodal model with vision capabilities
- `gemini-1.5-pro` - Latest generation model
- `gemini-1.5-flash` - Fast, efficient model
- `gemini-1.0-pro` - Stable production model

### Key Capabilities

1. **Provider Management**
   - Multiple Google AI providers with priority-based failover
   - Automatic provider health monitoring
   - Dynamic rate limit management

2. **Request Processing**
   - OpenAI-compatible message format
   - Automatic prompt conversion for Google AI
   - Support for temperature, max_tokens, top_p, top_k parameters

3. **Error Handling**
   - Comprehensive error parsing and classification
   - Automatic retry for transient errors
   - Safety filter detection and handling

4. **Usage Tracking**
   - Real-time token usage monitoring
   - Database persistence of usage statistics
   - Rate limit enforcement

## Configuration

### Database Setup

Google AI providers are stored in the `ai_providers` table with `provider_type = 'google'`:

```sql
INSERT INTO ai_providers (
  name, 
  provider_type, 
  api_key_encrypted, 
  configuration, 
  is_active, 
  priority,
  rate_limits
) VALUES (
  'google-primary',
  'google',
  encode('your-api-key', 'base64'),
  '{"timeout": 30000}',
  true,
  1,
  '{
    "requestsPerMinute": 60,
    "tokensPerMinute": 32000,
    "requestsPerDay": 1500
  }'
);
```

### Environment Variables

```bash
# Google AI API Key (if using environment-based configuration)
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## Usage Examples

### Basic Text Generation

```typescript
import { googleConnector, GoogleRequest } from './modules/ai/google'

const request: GoogleRequest = {
  model: 'gemini-pro',
  messages: [
    { role: 'user', content: 'Explain quantum computing in simple terms' }
  ],
  temperature: 0.7,
  max_tokens: 500
}

const response = await googleConnector.generateCompletion(request)
console.log(response.choices[0].message.content)
```

### Multi-turn Conversation

```typescript
const conversationRequest: GoogleRequest = {
  model: 'gemini-pro',
  messages: [
    { role: 'system', content: 'You are a helpful AI assistant.' },
    { role: 'user', content: 'What is machine learning?' },
    { role: 'assistant', content: 'Machine learning is a subset of artificial intelligence...' },
    { role: 'user', content: 'Can you give me a practical example?' }
  ],
  temperature: 0.8,
  max_tokens: 300
}

const response = await googleConnector.generateCompletion(conversationRequest)
```

### Using with AI Service

```typescript
import { aiService } from './services/aiService'

const request = {
  provider: 'google-primary',
  model: 'gemini-pro',
  prompt: 'Write a short story about AI',
  temperature: 0.9,
  max_tokens: 1000
}

const response = await aiService.generate(request)
console.log(response.content)
```

## API Reference

### GoogleConnector Class

#### Methods

##### `initializeProviders(): Promise<void>`
Initializes all Google AI providers from the database.

##### `addProvider(provider: GoogleProvider): Promise<void>`
Adds a new Google AI provider with validation.

##### `generateCompletion(request: GoogleRequest, preferredProvider?: string): Promise<GoogleResponse>`
Generates text completion with automatic failover.

##### `getAvailableModels(providerName?: string): Promise<string[]>`
Returns list of available models for the provider.

##### `testConnection(providerName: string): Promise<boolean>`
Tests connectivity to a specific provider.

##### `getProviderStats(providerName: string): GoogleProvider | null`
Returns statistics for a specific provider.

##### `getAllProviderStats(): GoogleProvider[]`
Returns statistics for all providers.

### Interfaces

#### GoogleRequest
```typescript
interface GoogleRequest {
  model: string
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  temperature?: number
  max_tokens?: number
  top_p?: number
  top_k?: number
  stop?: string | string[]
  stream?: boolean
}
```

#### GoogleResponse
```typescript
interface GoogleResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  provider: string
  metadata?: any
}
```

#### GoogleError
```typescript
interface GoogleError {
  type: "rate_limit" | "authentication" | "api_error" | "network_error" | "timeout" | "safety_error"
  message: string
  code?: string
  statusCode?: number
  retryAfter?: number
}
```

## Rate Limiting

### Default Limits

- **Requests per minute**: 60
- **Tokens per minute**: 32,000
- **Requests per day**: 1,500

### Rate Limit Handling

The connector automatically:
1. Tracks usage in real-time
2. Prevents requests when limits are exceeded
3. Implements exponential backoff for rate limit errors
4. Temporarily disables providers that hit limits
5. Automatically re-enables providers after cooldown

## Error Handling

### Error Types

1. **Rate Limit Errors**: Automatic retry with backoff
2. **Authentication Errors**: Immediate failure, check API key
3. **Safety Errors**: Content blocked by Google's safety filters
4. **API Errors**: Server-side issues, automatic retry
5. **Network Errors**: Connection issues, automatic retry
6. **Timeout Errors**: Request timeout, automatic retry

### Retry Logic

- **Retryable errors**: rate_limit, api_error, network_error, timeout
- **Non-retryable errors**: authentication, safety_error
- **Max retries**: Configured per provider
- **Backoff strategy**: Exponential with jitter

## Monitoring and Debugging

### Logging

The connector provides detailed logging for:
- Provider initialization
- Request/response timing
- Error conditions
- Rate limit events
- Failover operations

### Usage Statistics

Track usage through:
```typescript
// Get stats for specific provider
const stats = googleConnector.getProviderStats('google-primary')

// Get stats for all providers
const allStats = googleConnector.getAllProviderStats()
```

### Connection Testing

```typescript
// Test specific provider
const isHealthy = await googleConnector.testConnection('google-primary')

// Test through AI service
const isHealthy = await aiService.testGoogleAIConnection('google-primary')
```

## Best Practices

### 1. Provider Configuration

- Use multiple providers for high availability
- Set appropriate rate limits based on your quota
- Configure priority levels for failover order

### 2. Request Optimization

- Use appropriate temperature values (0.0-1.0)
- Set reasonable max_tokens limits
- Implement request caching where appropriate

### 3. Error Handling

- Always handle potential errors in your application
- Implement circuit breaker patterns for critical paths
- Monitor error rates and adjust accordingly

### 4. Security

- Store API keys encrypted in the database
- Use environment variables for sensitive configuration
- Implement proper access controls

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify API key is correct and active
   - Check Google AI Console for key status

2. **Rate Limits Exceeded**
   - Monitor usage statistics
   - Adjust rate limits in provider configuration
   - Consider upgrading Google AI quota

3. **Safety Filter Blocks**
   - Review content for policy violations
   - Adjust prompts to avoid triggering filters
   - Use different models if appropriate

4. **Connection Timeouts**
   - Check network connectivity
   - Increase timeout values in configuration
   - Monitor Google AI service status

### Debug Mode

Enable detailed logging by setting log level to debug:

```typescript
import { logger } from './utils/logger'
logger.level = 'debug'
```

## Migration from Legacy Implementation

If migrating from a legacy Google AI implementation:

1. **Update imports**:
   ```typescript
   // Old
   import { GoogleGenerativeAI } from "@google/generative-ai"
   
   // New
   import { googleConnector, GoogleRequest } from './modules/ai/google'
   ```

2. **Update request format**:
   ```typescript
   // Old
   const result = await model.generateContent(prompt)
   
   // New
   const request: GoogleRequest = {
     model: 'gemini-pro',
     messages: [{ role: 'user', content: prompt }]
   }
   const response = await googleConnector.generateCompletion(request)
   ```

3. **Update response handling**:
   ```typescript
   // Old
   const content = result.response.text()
   
   // New
   const content = response.choices[0].message.content
   ```

## Support

For issues related to Google AI integration:

1. Check the logs for detailed error information
2. Verify provider configuration in database
3. Test connectivity using the built-in test methods
4. Review Google AI API documentation for model-specific requirements

## Related Documentation

- [OpenAI Integration Guide](./openai-integration.md)
- [AI Service Overview](./ai-service.md)
- [Database Schema](./database-schema.md)