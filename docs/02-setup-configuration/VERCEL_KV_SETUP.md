# Vercel KV Setup Guide

This guide explains how to set up and use Vercel KV, a Redis-compatible key-value store that's fully managed by Vercel.

## What is Vercel KV?

Vercel KV is a fully-managed, Redis-compatible key-value database that's optimized for serverless environments. It provides:

- Global distribution for low-latency access
- Automatic scaling
- No connection management overhead
- Simple API for common Redis operations

## Setup Instructions

### Step 1: Create a Vercel KV Database

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → "KV"
4. Choose your preferred region (closest to your users)
5. Wait for the database to be created

### Step 2: Environment Variables

After creating the database, Vercel will automatically add the following environment variables to your project:

```env
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

For local development, you'll need to add these variables to your `.env.local` file:

1. In your Vercel project dashboard, go to "Settings" → "Environment Variables"
2. Copy the KV environment variables
3. Create or update your `.env.local` file with these variables

### Step 3: Install Dependencies

The Vercel KV client is available as an npm package:

```bash
npm install @vercel/kv
# or
yarn add @vercel/kv
# or
pnpm add @vercel/kv
```

## Usage

We've created a `CacheService` utility class in `lib/kv.ts` that provides convenient methods for working with Vercel KV:

```typescript
import { CacheService } from '@/lib/kv';

// Basic operations
await CacheService.set('key', 'value');
await CacheService.set('key-with-ttl', 'value', 60); // 60 second TTL
const value = await CacheService.get('key');
await CacheService.del('key');

// Session management
await CacheService.setSession('user-session-id', { userId: '123', role: 'admin' });
const session = await CacheService.getSession('user-session-id');

// Rate limiting
const allowed = await CacheService.rateLimit('rate:limit:key', 5, 60); // 5 requests per minute
```

For more advanced use cases, you can import the `kv` client directly:

```typescript
import { kv } from '@/lib/kv';

// Advanced operations
await kv.incr('counter');
await kv.hset('hash', { field1: 'value1', field2: 'value2' });
await kv.lpush('list', 'item1', 'item2');
```

## Testing

We've included a test script at `test-vercel-kv.js` that verifies:

- Basic set/get operations
- TTL functionality
- Error handling
- Session management
- Rate limiting

To run the tests:

```bash
node test-vercel-kv.js
```

## Best Practices

1. **Use TTLs**: Always set appropriate TTLs for cached data to prevent stale data and manage memory usage.

2. **Error Handling**: The `CacheService` methods include error handling, but you should still handle potential errors in your application code.

3. **Key Naming**: Use consistent key naming conventions, such as:
   - `user:123` for user data
   - `session:abc` for session data
   - `cache:products` for cached product lists

4. **Data Size**: Keep values small when possible. For large objects, consider storing them elsewhere and caching only the references.

5. **Monitoring**: Monitor your KV usage through the Vercel dashboard to ensure you stay within your plan limits.

## Limitations

- Maximum key size: 512MB
- Maximum value size: 512MB
- Maximum connections: Managed by Vercel
- Rate limits: Depends on your Vercel plan

## Troubleshooting

If you encounter issues with Vercel KV:

1. **Connection Issues**: Verify your environment variables are correctly set.

2. **Performance Issues**: Check if you're making too many requests or storing very large values.

3. **Missing Data**: Ensure you're not setting TTLs that are too short for your use case.

4. **Errors in Logs**: Look for "KV error" messages in your application logs.

For more help, refer to the [Vercel KV documentation](https://vercel.com/docs/storage/vercel-kv).