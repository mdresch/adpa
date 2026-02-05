#!/usr/bin/env node

/**
 * Neo4j Diagnostic Script
 */

import * as neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function diagnoseNeo4j() {
  console.log('🔍 Neo4j Diagnostic Tool');
  console.log('========================\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   NEO4J_URI_DEV: ${process.env.NEO4J_URI_DEV || 'NOT SET'}`);
  console.log(`   NEO4J_USERNAME_DEV: ${process.env.NEO4J_USERNAME_DEV || 'NOT SET'}`);
  console.log(`   NEO4J_PASSWORD_DEV: ${process.env.NEO4J_PASSWORD_DEV ? 'SET' : 'NOT SET'}`);
  console.log(`   NEO4J_DATABASE_DEV: ${process.env.NEO4J_DATABASE_DEV || 'NOT SET'}`);
  console.log(`   CLIENT_ID: ${process.env.CLIENT_ID || 'NOT SET'}`);
  console.log(`   CLIENT_SECRET: ${process.env.CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
  console.log(`   CLIENT_NAME: ${process.env.CLIENT_NAME || 'NOT SET'}`);
  
  console.log('\n🔍 Testing Connection Methods:');
  
  // Test 1: Basic Auth with NEO4J credentials
  if (process.env.NEO4J_URI_DEV && process.env.NEO4J_USERNAME_DEV && process.env.NEO4J_PASSWORD_DEV) {
    console.log('\n1️⃣ Testing Basic Auth (NEO4J credentials):');
    await testConnection(
      'Basic Auth',
      process.env.NEO4J_URI_DEV!,
      process.env.NEO4J_USERNAME_DEV!,
      process.env.NEO4J_PASSWORD_DEV!
    );
  } else {
    console.log('\n❌ Basic Auth: Missing credentials');
  }
  
  // Test 2: Basic Auth with CLIENT_ID/SECRET
  if (process.env.NEO4J_URI_DEV && process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
    console.log('\n2️⃣ Testing Basic Auth (CLIENT_ID/SECRET):');
    await testConnection(
      'Client ID/Secret',
      process.env.NEO4J_URI_DEV!,
      process.env.CLIENT_ID!,
      process.env.CLIENT_SECRET!
    );
  } else {
    console.log('\n❌ Client ID/Secret: Missing credentials');
  }
  
  // Test 3: Try different URI formats
  const uriVariants = [
    process.env.NEO4J_URI_DEV,
    process.env.NEO4J_URI_DEV?.replace('neo4j+s://', 'neo4j://'),
    process.env.NEO4J_URI_DEV?.replace('neo4j+s://', 'bolt+s://'),
    process.env.NEO4J_URI_DEV?.replace('neo4j+s://', 'bolt://')
  ].filter((uri): uri is string => uri !== undefined);
  
  if (uriVariants.length > 1) {
    console.log(`\n🔄 Testing Different URI Formats:`);
    for (const uri of uriVariants) {
      console.log(`\nTesting: ${uri}`);
      await testConnection(
        `URI: ${uri}`,
        uri,
        process.env.NEO4J_USERNAME_DEV!,
        process.env.NEO4J_PASSWORD_DEV!
      );
    }
  }
  
  console.log('\n🏁 Diagnostic Complete');
  console.log('\n💡 Recommendations:');
  console.log('1. Check if Neo4j Aura database is active');
  console.log('2. Verify credentials in Neo4j Aura console');
  console.log('3. Ensure database name is correct');
  console.log('4. Try connecting with Neo4j Browser first');
}

async function testConnection(name: string, uri: string, username: string, password: string) {
  console.log(`   Attempting connection...`);
  
  try {
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    
    const session = driver.session({
      database: process.env.NEO4J_DATABASE_DEV || 'neo4j',
      defaultAccessMode: neo4j.session.READ
    });
    
    const result = await session.run('RETURN 1 as test, database() as db');
    console.log(`   ✅ SUCCESS: Connected to database "${result.records[0].get('db')}"`);
    
    await session.close();
    await driver.close();
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${(error as Error).message}`);
    if ((error as any).code) {
      console.log(`   Error Code: ${(error as any).code}`);
    }
  }
}

diagnoseNeo4j().catch(console.error);
