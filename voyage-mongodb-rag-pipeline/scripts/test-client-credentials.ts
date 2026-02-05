#!/usr/bin/env node

/**
 * Test Neo4j Aura API Authentication with Client ID/Secret
 */

import * as neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

async function testClientCredentials() {
  console.log('🔍 Testing Neo4j Aura API Authentication');
  console.log('==========================================\n');
  
  const uri = process.env.NEO4J_URI_DEV;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const clientName = process.env.CLIENT_NAME;
  
  console.log(`URI: ${uri}`);
  console.log(`Client ID: ${clientId}`);
  console.log(`Client Secret: ${clientSecret ? clientSecret.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`Client Name: ${clientName}`);
  
  if (!uri || !clientId || !clientSecret) {
    console.log('❌ Missing Client ID or Client Secret');
    return;
  }
  
  console.log('\n🔌 Testing different authentication methods...');
  
  // Method 1: Try Client ID as username, Client Secret as password
  console.log('\n1️⃣ Testing Client ID as username, Client Secret as password:');
  await testAuth('Client ID/Secret as Basic Auth', uri, clientId, clientSecret);
  
  // Method 2: Try Client Name as username, Client Secret as password  
  console.log('\n2️⃣ Testing Client Name as username, Client Secret as password:');
  if (clientName) {
    await testAuth('Client Name/Secret as Basic Auth', uri, clientName, clientSecret);
  }
  
  // Method 3: Try Bearer token authentication (if supported)
  console.log('\n3️⃣ Testing Bearer token authentication:');
  await testBearerToken('Bearer Token Auth', uri, clientSecret);
  
  console.log('\n💡 If all methods fail:');
  console.log('1. Check if Client ID/Secret are for Aura API (not database)');
  console.log('2. Try generating database credentials in Aura console');
  console.log('3. Look for "Programmatic Access" or "API Keys" in Aura settings');
}

async function testAuth(name: string, uri: string, username: string, password: string) {
  try {
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    const session = driver.session({
      database: process.env.NEO4J_DATABASE_DEV || 'neo4j',
      defaultAccessMode: neo4j.session.READ
    });
    
    const result = await session.run('RETURN 1 as test, database() as db');
    const record = result.records[0];
    
    console.log(`   ✅ SUCCESS! Connected to database "${record.get('db')}"`);
    console.log(`   🎉 ${name} works!`);
    
    await session.close();
    await driver.close();
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Failed: ${(error as Error).message}`);
    if ((error as any).code) {
      console.log(`   Error Code: ${(error as any).code}`);
    }
    return false;
  }
}

async function testBearerToken(name: string, uri: string, token: string) {
  try {
    // Try using the secret as a bearer token
    const driver = neo4j.driver(uri, neo4j.auth.basic('neo4j', token));
    const session = driver.session({
      database: process.env.NEO4J_DATABASE_DEV || 'neo4j',
      defaultAccessMode: neo4j.session.READ
    });
    
    const result = await session.run('RETURN 1 as test, database() as db');
    const record = result.records[0];
    
    console.log(`   ✅ SUCCESS! Connected to database "${record.get('db')}"`);
    console.log(`   🎉 ${name} works!`);
    
    await session.close();
    await driver.close();
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Failed: ${(error as Error).message}`);
    if ((error as any).code) {
      console.log(`   Error Code: ${(error as any).code}`);
    }
    return false;
  }
}

testClientCredentials().catch(console.error);
