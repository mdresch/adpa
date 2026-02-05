#!/usr/bin/env node

/**
 * Neo4j Database Status Check
 */

import * as neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkDatabaseStatus() {
  console.log('🔍 Checking Neo4j Database Status');
  console.log('===================================\n');
  
  const uri = process.env.NEO4J_URI_DEV;
  console.log(`Database URI: ${uri}`);
  
  if (!uri) {
    console.log('❌ No URI found in environment variables');
    return;
  }
  
  // Try to connect without authentication first to check if database exists
  console.log('\n📡 Testing database connectivity...');
  
  try {
    // Test with a simple connection attempt
    const driver = neo4j.driver(uri);
    
    // Try to get server info without authentication
    try {
      const session = driver.session({
        defaultAccessMode: neo4j.session.READ
      });
      
      await session.run('RETURN 1');
      console.log('✅ Database is accessible without authentication (unusual for Aura)');
      
    } catch (error) {
      console.log('📊 Database Response:');
      console.log(`   Error: ${(error as Error).message}`);
      console.log(`   Code: ${(error as any).code || 'Unknown'}`);
      
      if ((error as any).code === 'Neo.ClientError.Security.Unauthorized') {
        console.log('✅ Database exists but requires authentication');
      } else if ((error as any).code === 'ServiceUnavailable') {
        console.log('❌ Database may be down or URI is incorrect');
      } else {
        console.log('🤔 Unexpected error - database status unclear');
      }
    }
    
    await driver.close();
    
  } catch (error) {
    console.log(`❌ Connection failed: ${(error as Error).message}`);
  }
  
  console.log('\n💡 Recommendations:');
  console.log('1. Open Neo4j Aura Console: https://console.neo4j.io/');
  console.log('2. Find database: 860f2e3e.databases.neo4j.io');
  console.log('3. Check if database is "Active" (not "Suspended" or "Deleted")');
  console.log('4. Go to "Connection" tab and copy credentials');
  console.log('5. Make sure you\'re using the correct database');
}

checkDatabaseStatus().catch(console.error);
