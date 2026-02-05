#!/usr/bin/env node

/**
 * Neo4j Connection Test Script
 */

import * as neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log('🔍 Testing Neo4j connection...');
  
  // Try different connection methods
  const configs = [
    {
      name: 'Basic Auth with current credentials',
      uri: process.env.NEO4J_URI_DEV,
      username: process.env.NEO4J_USERNAME_DEV,
      password: process.env.NEO4J_PASSWORD_DEV,
      database: process.env.NEO4J_DATABASE_DEV || 'neo4j'
    },
    {
      name: 'Basic Auth with CLIENT_ID/SECRET',
      uri: process.env.NEO4J_URI_DEV,
      username: process.env.CLIENT_ID,
      password: process.env.CLIENT_SECRET,
      database: 'neo4j'
    },
    {
      name: 'Bearer Token Auth',
      uri: process.env.NEO4J_URI_DEV,
      token: process.env.CLIENT_SECRET,
      database: 'neo4j'
    }
  ];

  for (const config of configs) {
    console.log(`\n📋 Testing: ${config.name}`);
    console.log(`   URI: ${config.uri}`);
    console.log(`   Username: ${config.username}`);
    console.log(`   Database: ${config.database}`);
    
    try {
      let driver;
      
      if (config.token) {
        // Bearer token authentication
        driver = neo4j.driver(
          config.uri!,
          neo4j.auth.basic('neo4j', config.token!)
        );
      } else {
        // Basic authentication
        driver = neo4j.driver(
          config.uri!,
          neo4j.auth.basic(config.username!, config.password!)
        );
      }
      
      const session = driver.session({
        database: config.database!,
        defaultAccessMode: neo4j.session.READ
      });
      
      const result = await session.run('RETURN 1 as test');
      console.log(`   ✅ Success: ${result.records.length} records returned`);
      
      await session.close();
      await driver.close();
      
    } catch (error) {
      console.log(`   ❌ Failed: ${(error as Error).message}`);
      console.log(`   Error Code: ${(error as any).code || 'N/A'}`);
    }
  }
  
  console.log('\n🏁 Connection test completed');
}

testConnection().catch(console.error);
