# Vercel Integration Tests

This directory contains integration tests for Vercel Postgres and Vercel KV services.

## Test Categories

### Database Tests
- Connection establishment
- Basic CRUD operations
- Transaction handling
- Connection pooling
- Error handling

### KV Tests
- Basic set/get operations
- TTL functionality
- Session management
- Rate limiting
- Error handling

### Authentication Tests
- User login flow
- Session creation
- Session validation
- Session expiry
- Token refresh

### Integration Tests
- End-to-end user flow
- Database + cache coordination
- Error recovery scenarios
- Performance under load

## Running Tests

To run the integration tests:

```bash
# Run all tests
npm test

# Run only Vercel integration tests
npm run test:vercel
```

## Test Environment Setup

The tests require the following environment variables to be set:

```
# Vercel Postgres
POSTGRES_URL=postgres://username:password@host:5432/database
POSTGRES_PRISMA_URL=postgres://username:password@host:5432/database?pgbouncer=true&connect_timeout=15
POSTGRES_URL_NON_POOLING=postgres://username:password@host:5432/database
POSTGRES_USER=username
POSTGRES_HOST=host
POSTGRES_PASSWORD=password
POSTGRES_DATABASE=database

# Vercel KV
KV_URL=redis://username:password@host:port
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...

# JWT
JWT_SECRET=your-jwt-secret
```

For local development, you can use a local PostgreSQL and Redis instance. The tests will automatically use the local instances if the Vercel environment variables are not set.

## Test Data

The tests create temporary test data that is cleaned up after the tests complete. However, if a test fails, some test data might remain in the database or KV store.

## Performance Benchmarks

The tests include basic performance benchmarks for:
- Database query response times
- Cache hit/miss ratios
- Authentication latency

These benchmarks are not meant to be exhaustive but provide a basic understanding of the performance characteristics of the Vercel services.