# Vercel Postgres Setup Guide

This guide explains how to set up and configure Vercel Postgres for your ADPA Admin project.

## Prerequisites

- A Vercel account
- Your project deployed on Vercel (or ready to be deployed)
- Access to the Vercel dashboard

## Step 1: Create a Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → "Postgres"
4. Choose the region closest to your users
5. Click "Create" and wait for the database to be provisioned

## Step 2: Configure Environment Variables

After creating the database, Vercel will automatically add the following environment variables to your project:

```
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
```

For local development:

1. Copy the `.env.local.example` file to `.env.local`
2. Fill in the values from your Vercel dashboard
3. Make sure not to commit this file to your repository

## Step 3: Run Database Migration

To set up your database schema:

```bash
# Install dependencies if you haven't already
npm install

# Run the migration script
npm run migrate:vercel
```

This will create all the necessary tables and seed an admin user.

## Step 4: Test the Connection

To verify that your database connection is working:

```bash
npm run test:db
```

If successful, you should see a message confirming the connection.

## Connection Pooling

Vercel Postgres automatically handles connection pooling for you. The `POSTGRES_PRISMA_URL` environment variable includes the necessary configuration for connection pooling.

For serverless functions, we recommend using the `sql` client from `@vercel/postgres` which is optimized for serverless environments.

## Usage in Code

### Serverless Functions (Recommended)

```typescript
import { sql } from '@vercel/postgres';

export async function getUsers() {
  const { rows } = await sql`SELECT * FROM users`;
  return rows;
}
```

### Connection Pooling (If Needed)

```typescript
import { pool } from '@/lib/db';

export async function getUsers() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users');
    return result.rows;
  } finally {
    client.release();
  }
}
```

### Transactions

```typescript
import { withTransaction } from '@/lib/db';

export async function createUserWithProfile(userData, profileData) {
  return await withTransaction(async (client) => {
    const userResult = await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id',
      [userData.name, userData.email]
    );
    
    const userId = userResult.rows[0].id;
    
    await client.query(
      'INSERT INTO profiles (user_id, bio) VALUES ($1, $2)',
      [userId, profileData.bio]
    );
    
    return userId;
  });
}
```

## Troubleshooting

If you encounter connection issues:

1. Verify that all environment variables are correctly set
2. Check that your IP address is allowed in the Vercel dashboard
3. Ensure your database is not in a paused state
4. Check for any rate limiting or connection limits

For more help, refer to the [Vercel Postgres documentation](https://vercel.com/docs/storage/vercel-postgres).