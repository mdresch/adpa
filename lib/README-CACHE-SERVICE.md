# Cache Service Library

This document provides information about the Cache Service Library implementation using Vercel KV.

## Overview

The Cache Service Library (`lib/kv.ts`) provides a set of utilities for interacting with Vercel KV (Redis) cache. It includes methods for basic cache operations, session management, and rate limiting.

## Installation

1. Install the Vercel KV dependency:
   ```bash
   npm install @vercel/kv
   ```

2. Set up Vercel KV in your project:
   - Go to your Vercel project dashboard
   - Navigate to "Storage" tab
   - Click "Create Database" → "KV"
   - Choose your region
   - Connection details will be provided as environment variables

3. Add the environment variables to your project:
   ```env
   KV_URL="redis://..."
   KV_REST_API_URL="https://..."
   KV_REST_API_TOKEN="..."
   KV_REST_API_READ_ONLY_TOKEN="..."
   ```

## Usage

### Basic Operations

```typescript
import { CacheService } from '@/lib/kv';

// Store a value in the cache
await CacheService.set('user:123', { name: 'John Doe', role: 'admin' });

// Store a value with TTL (time to live) in seconds
await CacheService.set('temporary:key', { value: 'expires soon' }, 300); // 5 minutes

// Retrieve a value from the cache
const user = await CacheService.get<{ name: string, role: string }>('user:123');

// Delete a value from the cache
await CacheService.del('user:123');
```

### Session Management

```typescript
import { CacheService } from '@/lib/kv';

// Store session data (default TTL is 24 hours)
const sessionId = 'user-session-123';
await CacheService.setSession(sessionId, { 
  userId: '123', 
  name: 'John Doe', 
  permissions: ['read', 'write'] 
});

// Store session with custom TTL (in seconds)
await CacheService.setSession(sessionId, sessionData, 3600); // 1 hour

// Retrieve session data
const session = await CacheService.getSession(sessionId);
```

### Rate Limiting

```typescript
import { CacheService } from '@/lib/kv';

// Check if a request is allowed based on rate limits
const key = `rate-limit:${userId}:login`;
const limit = 5; // 5 requests
const window = 60; // 60 seconds window

const isAllowed = await CacheService.rateLimit(key, limit, window);

if (isAllowed) {
  // Process the request
} else {
  // Return rate limit exceeded error
}
```

## API Reference

### `CacheService.get<T>(key: string): Promise<T | null>`

Retrieves a value from the cache by key.

- **Parameters:**
  - `key`: The cache key to retrieve
- **Returns:** The cached value or null if not found or on error
- **Type Parameter:** `T` - The expected type of the cached value

### `CacheService.set(key: string, value: any, ttl?: number): Promise<void>`

Stores a value in the cache with an optional TTL (time to live).

- **Parameters:**
  - `key`: The cache key
  - `value`: The value to store
  - `ttl`: Optional time to live in seconds

### `CacheService.del(key: string): Promise<void>`

Deletes a value from the cache by key.

- **Parameters:**
  - `key`: The cache key to delete

### `CacheService.setSession(sessionId: string, data: any, ttl = 86400): Promise<void>`

Stores session data with automatic expiry.

- **Parameters:**
  - `sessionId`: The session identifier
  - `data`: The session data to store
  - `ttl`: Time to live in seconds (defaults to 24 hours)

### `CacheService.getSession<T>(sessionId: string): Promise<T | null>`

Retrieves session data by session ID.

- **Parameters:**
  - `sessionId`: The session identifier
- **Returns:** The session data or null if not found
- **Type Parameter:** `T` - The expected type of the session data

### `CacheService.rateLimit(key: string, limit: number, window: number): Promise<boolean>`

Implements rate limiting with a sliding window approach.

- **Parameters:**
  - `key`: The rate limit key (usually includes user identifier or IP)
  - `limit`: Maximum number of requests allowed in the time window
  - `window`: Time window in seconds
- **Returns:** Boolean indicating if the request is allowed (true) or rate limited (false)

## Error Handling

All methods in the CacheService include error handling to prevent exceptions from propagating to the calling code. Errors are logged to the console, and appropriate fallback values are returned.

## Testing

A test script is provided to verify the functionality of the CacheService:

```bash
node test-cache-service.js
```

The test script verifies:
- Basic KV operations (get/set/delete)
- TTL functionality
- Session management
- Rate limiting with sliding window
- Error handling