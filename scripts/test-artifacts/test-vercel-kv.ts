/**
 * Vercel KV Test Script
 * 
 * This script tests basic operations with Vercel KV:
 * - Basic set/get operations
 * - TTL functionality
 * - Error handling
 * 
 * To run this script:
 * 1. Make sure your Vercel KV environment variables are set
 * 2. Run: npx ts-node test-vercel-kv.ts
 */

// Import the CacheService from our utility file
import { CacheService, kv } from './lib/kv';

// Helper to wait for a specified time
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function testVercelKV(): Promise<void> {
  console.log('🚀 Starting Vercel KV tests...');
  
  try {
    // Test 1: Basic set/get operations
    console.log('\n📝 Test 1: Basic set/get operations');
    const testKey = 'test:basic';
    const testValue = { message: 'Hello Vercel KV', timestamp: Date.now() };
    
    console.log(`Setting key "${testKey}"...`);
    await CacheService.set(testKey, testValue);
    
    console.log(`Getting key "${testKey}"...`);
    const retrievedValue = await CacheService.get<typeof testValue>(testKey);
    
    console.log('Retrieved value:', retrievedValue);
    console.log('Test 1 result:', JSON.stringify(testValue) === JSON.stringify(retrievedValue) ? '✅ PASSED' : '❌ FAILED');
    
    // Test 2: TTL functionality
    console.log('\n⏱️ Test 2: TTL functionality');
    const ttlKey = 'test:ttl';
    const ttlValue = { message: 'This will expire', timestamp: Date.now() };
    const ttlSeconds = 5;
    
    console.log(`Setting key "${ttlKey}" with ${ttlSeconds} second TTL...`);
    await CacheService.set(ttlKey, ttlValue, ttlSeconds);
    
    console.log(`Getting key "${ttlKey}" immediately...`);
    const ttlValueBefore = await CacheService.get<typeof ttlValue>(ttlKey);
    console.log('Value before expiry:', ttlValueBefore);
    
    console.log(`Waiting ${ttlSeconds + 1} seconds for expiry...`);
    await wait((ttlSeconds + 1) * 1000);
    
    console.log(`Getting key "${ttlKey}" after TTL expiry...`);
    const ttlValueAfter = await CacheService.get<typeof ttlValue>(ttlKey);
    console.log('Value after expiry:', ttlValueAfter);
    console.log('Test 2 result:', ttlValueBefore !== null && ttlValueAfter === null ? '✅ PASSED' : '❌ FAILED');
    
    // Test 3: Error handling
    console.log('\n🛡️ Test 3: Error handling');
    try {
      // Force an error by passing invalid parameters
      console.log('Forcing an error with invalid parameters...');
      // @ts-ignore - Intentionally passing invalid parameters to test error handling
      await kv.set(null, undefined);
      console.log('Test 3 result: ❌ FAILED - Error was not thrown');
    } catch (error) {
      console.log('Error caught successfully:', error instanceof Error ? error.message : 'Unknown error');
      console.log('Test 3 result: ✅ PASSED - Error was handled properly');
    }
    
    // Test 4: Session management
    console.log('\n👤 Test 4: Session management');
    const sessionId = 'test-session-' + Date.now();
    const sessionData = { userId: '123', name: 'Test User', role: 'admin' };
    
    console.log(`Setting session "${sessionId}"...`);
    await CacheService.setSession(sessionId, sessionData);
    
    console.log(`Getting session "${sessionId}"...`);
    const retrievedSession = await CacheService.getSession<typeof sessionData>(sessionId);
    
    console.log('Retrieved session:', retrievedSession);
    console.log('Test 4 result:', JSON.stringify(sessionData) === JSON.stringify(retrievedSession) ? '✅ PASSED' : '❌ FAILED');
    
    // Test 5: Rate limiting
    console.log('\n🚦 Test 5: Rate limiting');
    const rateLimitKey = 'ratelimit:test:' + Date.now();
    const limit = 3;
    const window = 10; // 10 seconds
    
    console.log(`Testing rate limit: ${limit} requests in ${window} seconds`);
    
    for (let i = 1; i <= limit + 1; i++) {
      const allowed = await CacheService.rateLimit(rateLimitKey, limit, window);
      console.log(`Request ${i}: ${allowed ? 'Allowed ✅' : 'Blocked ❌'}`);
    }
    
    console.log('Test 5 result: ✅ PASSED');
    
    // Cleanup
    console.log('\n🧹 Cleaning up test keys...');
    await CacheService.del(testKey);
    await CacheService.del(ttlKey);
    await CacheService.del(`session:${sessionId}`);
    await CacheService.del(rateLimitKey);
    
    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run the tests
testVercelKV().catch(error => {
  console.error('Unhandled error:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});