# Database Connection Library

This library provides utilities for connecting to and interacting with Vercel Postgres databases in both serverless and traditional environments.

## Features

- **Serverless-optimized connections** using `@vercel/postgres`
- **Connection pooling** for traditional usage
- **Transaction management** with automatic rollback on errors
- **Error handling with retries** for transient database errors
- **Connection health checks** for monitoring
- **TypeScript type safety** for all database operations

## Installation

Make sure you have the required dependencies installed:

```bash
npm install @vercel/postgres pg
npm install --save-dev @types/pg
```

## Environment Variables

The library requires the following environment variables:

```
POSTGRES_URL=postgres://username:password@host:5432/database
```

For production environments, additional variables may be needed:

```
POSTGRES_PRISMA_URL=postgres://username:password@host:5432/database?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgres://username:password@host:5432/database
POSTGRES_USER=username
POSTGRES_HOST=host
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=database
```

## Usage

### Serverless Functions (Recommended)

For serverless functions, use the `sql` client from `@vercel/postgres`:

```typescript
import { sql } from '@/lib/db';

export async function getUsers() {
  const { rows } = await sql`
    SELECT id, name, email FROM users LIMIT 10
  `;
  return rows;
}
```

### Connection Pooling

For traditional connection pooling:

```typescript
import { executeQuery } from '@/lib/db';

export async function getUsers() {
  return await executeQuery(
    'SELECT id, name, email FROM users LIMIT 10'
  );
}
```

### Transactions

For operations that require transactions:

```typescript
import { withTransaction } from '@/lib/db';

export async function createUserWithSettings(userData) {
  return await withTransaction(async (client) => {
    // Create user
    const { rows: [user] } = await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      [userData.name, userData.email]
    );
    
    // Create settings
    await client.query(
      'INSERT INTO user_settings (user_id, theme) VALUES ($1, $2)',
      [user.id, 'light']
    );
    
    return user;
  });
}
```

### Error Handling with Retries

For operations that need retry logic:

```typescript
import { withRetry } from '@/lib/db';

export async function getUserWithRetry(userId) {
  return await withRetry(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  });
}
```

### Health Checks

To check database connection health:

```typescript
import { checkDatabaseHealth } from '@/lib/db';

export async function getDatabaseStatus() {
  return await checkDatabaseHealth();
}
```

## Testing

Run the tests with:

```bash
npm test
```

## Examples

See the `examples/db-example.ts` file for more usage examples.