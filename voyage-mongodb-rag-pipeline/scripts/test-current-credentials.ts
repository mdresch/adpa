#!/usr/bin/env node

/**
 * Test Specific Neo4j Credentials
 */

import * as neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSpecificCredentials() {
  console.log('🔍 Testing Specific Neo4j Credentials');
  console.log('======================================\n');
  
  const uri = process.env.NEO4J_URI_DEV;
  const username = process.env.NEO4J_USERNAME_DEV;
  const password = process.env.NEO4J_PASSWORD_DEV;
  
  console.log(`URI: ${uri}`);
  console.log(`Username: ${username}`);
  console.log(`Password: ${password ? password.substring(0, 3) + '***' : 'NOT SET'}`);
  
  if (!uri || !username || !password) {
    console.log('❌ Missing credentials');
    return;
  }
  
  console.log('\n🔌 Testing connection...');
  
  try {
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    const session = driver.session({
      database: process.env.NEO4J_DATABASE_DEV || 'neo4j',
      defaultAccessMode: neo4j.session.READ
    });
    
    const result = await session.run('RETURN 1 as test, "connected" as status');
    const record = result.records[0];
    
    console.log('✅ SUCCESS!');
    console.log(`   Status: ${record.get('status')}`);
    console.log(`   Test Query: ${record.get('test')}`);
    console.log(`   Database: ${process.env.NEO4J_DATABASE_DEV || 'neo4j'}`);
    
    await session.close();
    await driver.close();
    
    console.log('\n🎉 Credentials are working! Ready for GKG bootstrap.');
    
  } catch (error) {
    console.log('❌ FAILED!');
    console.log(`   Error: ${(error as Error).message}`);
    console.log(`   Code: ${(error as any).code || 'Unknown'}`);
    
    if ((error as any).code === 'Neo.ClientError.Security.Unauthorized') {
      console.log('\n💡 This means:');
      console.log('   - Username or password is incorrect');
      console.log('   - Check Neo4j Aura console for exact credentials');
      console.log('   - Try resetting password in Aura console');
    }
  }
}

testSpecificCredentials().catch(console.error);
