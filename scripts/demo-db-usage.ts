#!/usr/bin/env tsx

/**
 * Database Connection Library Usage Demo
 * 
 * This script demonstrates how to use the enhanced database connection library
 * with various features including transactions, health checks, and error handling.
 */

import { db, withTransaction, testConnection, checkPoolHealth } from '../lib/db';

async function demonstrateBasicUsage() {
  console.log('🔍 === Basic Database Usage Demo ===\n');

  try {
    // 1. Basic query using Vercel Postgres
    console.log('1. Basic Query:');
    const basicResult = await db.sql`SELECT NOW() as current_time, 'Hello Database!' as message`;
    console.log('   Result:', basicResult.rows[0]);
    console.log('');

    // 2. Parameterized query
    console.log('2. Parameterized Query:');
    const userId = 123;
    const userName = 'demo-user';
    const paramResult = await db.sql`
      SELECT ${userId} as user_id, ${userName} as user_name, NOW() as query_time
    `;
    console.log('   Result:', paramResult.rows[0]);
    console.log('');

    // 3. Query with retry logic
    console.log('3. Query with Retry:');
    const retryResult = await db.queryWithRetry('SELECT 42 as answer');
    console.log('   Result:', retryResult.rows[0]);
    console.log('');

  } catch (error) {
    console.error('❌ Basic usage error:', error);
  }
}

async function demonstrateTransactions() {
  console.log('🔄 === Transaction Management Demo ===\n');

  try {
    // Successful transaction
    console.log('1. Successful Transaction:');
    const transactionResult = await withTransaction(async (client) => {
      // Create a temporary table
      await client.query(`
        CREATE TEMPORARY TABLE demo_users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Insert multiple records
      await client.query(
        'INSERT INTO demo_users (name, email) VALUES ($1, $2)',
        ['Alice Demo', 'alice@demo.com']
      );

      await client.query(
        'INSERT INTO demo_users (name, email) VALUES ($1, $2)',
        ['Bob Demo', 'bob@demo.com']
      );

      // Query the results
      const result = await client.query('SELECT * FROM demo_users ORDER BY id');
      return result.rows;
    });

    console.log('   Transaction completed successfully!');
    console.log('   Inserted users:', transactionResult);
    console.log('');

    // Demonstrate rollback (this will fail intentionally)
    console.log('2. Transaction Rollback Demo:');
    try {
      await withTransaction(async (client) => {
        await client.query(`
          CREATE TEMPORARY TABLE demo_rollback (
            id SERIAL PRIMARY KEY,
            required_field VARCHAR(100) NOT NULL
          )
        `);

        // This will succeed
        await client.query(
          'INSERT INTO demo_rollback (required_field) VALUES ($1)',
          ['valid-value']
        );

        // This will fail and cause rollback
        await client.query(
          'INSERT INTO demo_rollback (required_field) VALUES ($1)',
          [null]
        );

        return 'should-not-reach-here';
      });
    } catch (error) {
      console.log('   ✅ Transaction rolled back as expected');
      console.log('   Error:', (error as Error).message);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Transaction demo error:', error);
  }
}

async function demonstrateHealthChecks() {
  console.log('🏥 === Health Check Demo ===\n');

  try {
    // Test Vercel Postgres connection
    console.log('1. Vercel Postgres Health Check:');
    const vercelHealth = await testConnection();
    console.log('   Status:', vercelHealth.isHealthy ? '✅ Healthy' : '❌ Unhealthy');
    console.log('   Latency:', `${vercelHealth.latency}ms`);
    console.log('   Timestamp:', vercelHealth.timestamp.toISOString());
    if (vercelHealth.error) {
      console.log('   Error:', vercelHealth.error);
    }
    console.log('');

    // Test connection pool health
    console.log('2. Connection Pool Health Check:');
    const poolHealth = await checkPoolHealth();
    console.log('   Status:', poolHealth.isHealthy ? '✅ Healthy' : '❌ Unhealthy');
    console.log('   Latency:', `${poolHealth.latency}ms`);
    if (poolHealth.error) {
      console.log('   Error:', poolHealth.error);
    }
    console.log('');

    // Pool statistics
    console.log('3. Pool Statistics:');
    const stats = db.getPoolStats();
    console.log('   Total connections:', stats.totalCount);
    console.log('   Idle connections:', stats.idleCount);
    console.log('   Waiting connections:', stats.waitingCount);
    console.log('   Max connections:', stats.config.max);
    console.log('   Idle timeout:', `${stats.config.idleTimeoutMillis}ms`);
    console.log('');

  } catch (error) {
    console.error('❌ Health check demo error:', error);
  }
}

async function demonstrateErrorHandling() {
  console.log('⚠️ === Error Handling Demo ===\n');

  try {
    // Demonstrate retry logic
    console.log('1. Query Retry Logic:');
    try {
      // This will likely succeed, but demonstrates retry capability
      const result = await db.queryWithRetry(
        'SELECT 1 as test_retry',
        undefined,
        3 // 3 retry attempts
      );
      console.log('   ✅ Query succeeded:', result.rows[0]);
    } catch (error) {
      console.log('   ❌ Query failed after retries:', (error as Error).message);
    }
    console.log('');

    // Demonstrate SQL error handling
    console.log('2. SQL Error Handling:');
    try {
      await db.sql`INVALID SQL STATEMENT`;
    } catch (error) {
      console.log('   ✅ SQL error caught gracefully');
      console.log('   Error type:', (error as Error).constructor.name);
      console.log('   Error message:', (error as Error).message.substring(0, 100) + '...');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error handling demo error:', error);
  }
}

async function demonstrateAdvancedFeatures() {
  console.log('🚀 === Advanced Features Demo ===\n');

  try {
    // Concurrent queries
    console.log('1. Concurrent Query Execution:');
    const startTime = Date.now();
    
    const promises = [
      db.sql`SELECT 1 as query_1, pg_sleep(0.1)`,
      db.sql`SELECT 2 as query_2, pg_sleep(0.1)`,
      db.sql`SELECT 3 as query_3, pg_sleep(0.1)`,
    ];

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    console.log('   ✅ All queries completed');
    console.log('   Results:', results.map(r => r.rows[0]));
    console.log('   Total duration:', `${duration}ms`);
    console.log('   (Should be ~100ms due to concurrency, not ~300ms)');
    console.log('');

    // Database information
    console.log('2. Database Information:');
    const dbInfo = await db.sql`
      SELECT 
        version() as db_version,
        current_database() as db_name,
        current_user as db_user,
        inet_server_addr() as server_ip
    `;
    console.log('   Database version:', dbInfo.rows[0].db_version.substring(0, 50) + '...');
    console.log('   Database name:', dbInfo.rows[0].db_name);
    console.log('   Current user:', dbInfo.rows[0].db_user);
    console.log('   Server IP:', dbInfo.rows[0].server_ip || 'Not available');
    console.log('');

  } catch (error) {
    console.error('❌ Advanced features demo error:', error);
  }
}

async function runDemo() {
  console.log('🎯 Database Connection Library Demo\n');
  console.log('This demo showcases the enhanced database connection library features.\n');

  try {
    await demonstrateBasicUsage();
    await demonstrateTransactions();
    await demonstrateHealthChecks();
    await demonstrateErrorHandling();
    await demonstrateAdvancedFeatures();

    console.log('🎉 === Demo Completed Successfully ===');
    console.log('\nThe database connection library is working correctly!');
    console.log('You can now use these features in your application.\n');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  } finally {
    // Clean up
    try {
      await db.closePool();
      console.log('✅ Database connections closed gracefully');
    } catch (error) {
      console.error('⚠️ Error closing connections:', error);
    }
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runDemo };
