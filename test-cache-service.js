// Test script for CacheService
// Run with: node test-cache-service.js

const { CacheService } = require('./lib/kv');

async function testCacheService() {
  console.log('🧪 Testing CacheService...');

  try {
    // Test basic operations
    console.log('\n📝 Testing basic operations (get/set/del)...');
    const testKey = 'test:basic';
    const testValue = { message: 'Hello Vercel KV', timestamp: Date.now() };
    
    console.log(`Setting ${testKey}...`);
    await CacheService.set(testKey, testValue);
    
    console.log(`Getting ${testKey}...`);
    const retrieved = await CacheService.get(testKey);
    console.log('Retrieved value:', retrieved);
    
    if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
      console.log('✅ Basic get/set test passed!');
    } else {
      console.log('❌ Basic get/set test failed!');
    }
    
    console.log(`Deleting ${testKey}...`);
    await CacheService.del(testKey);
    
    const afterDelete = await CacheService.get(testKey);
    if (afterDelete === null) {
      console.log('✅ Delete test passed!');
    } else {
      console.log('❌ Delete test failed!');
    }

    // Test TTL functionality
    console.log('\n⏱️ Testing TTL functionality...');
    const ttlKey = 'test:ttl';
    const ttlValue = { expiring: true };
    const shortTTL = 2; // 2 seconds
    
    console.log(`Setting ${ttlKey} with ${shortTTL}s TTL...`);
    await CacheService.set(ttlKey, ttlValue, shortTTL);
    
    const beforeExpiry = await CacheService.get(ttlKey);
    console.log('Value before expiry:', beforeExpiry);
    
    console.log(`Waiting ${shortTTL + 1} seconds for expiry...`);
    await new Promise(resolve => setTimeout(resolve, (shortTTL + 1) * 1000));
    
    const afterExpiry = await CacheService.get(ttlKey);
    console.log('Value after expiry:', afterExpiry);
    
    if (afterExpiry === null) {
      console.log('✅ TTL test passed!');
    } else {
      console.log('❌ TTL test failed!');
    }

    // Test session management
    console.log('\n🔑 Testing session management...');
    const sessionId = 'test-session-' + Date.now();
    const sessionData = { userId: '123', role: 'admin', permissions: ['read', 'write'] };
    
    console.log(`Setting session ${sessionId}...`);
    await CacheService.setSession(sessionId, sessionData);
    
    console.log(`Getting session ${sessionId}...`);
    const sessionRetrieved = await CacheService.getSession(sessionId);
    console.log('Retrieved session:', sessionRetrieved);
    
    if (JSON.stringify(sessionRetrieved) === JSON.stringify(sessionData)) {
      console.log('✅ Session management test passed!');
    } else {
      console.log('❌ Session management test failed!');
    }
    
    // Clean up session
    await CacheService.del(`session:${sessionId}`);

    // Test rate limiting
    console.log('\n🚦 Testing rate limiting...');
    const rateLimitKey = 'test:ratelimit:' + Date.now();
    const limit = 3;
    const window = 5; // 5 seconds
    
    console.log(`Testing rate limit: ${limit} requests in ${window}s window`);
    
    for (let i = 1; i <= limit + 2; i++) {
      const allowed = await CacheService.rateLimit(rateLimitKey, limit, window);
      console.log(`Request ${i}: ${allowed ? 'Allowed ✅' : 'Rate limited ❌'}`);
      
      // First 'limit' requests should be allowed, the rest should be rate limited
      const expectedResult = i <= limit;
      if (allowed === expectedResult) {
        console.log(`✅ Rate limit test ${i} passed!`);
      } else {
        console.log(`❌ Rate limit test ${i} failed!`);
      }
    }
    
    console.log(`\nWaiting ${window + 1} seconds for rate limit window to reset...`);
    await new Promise(resolve => setTimeout(resolve, (window + 1) * 1000));
    
    const afterReset = await CacheService.rateLimit(rateLimitKey, limit, window);
    console.log(`After window reset: ${afterReset ? 'Allowed ✅' : 'Rate limited ❌'}`);
    
    if (afterReset) {
      console.log('✅ Rate limit reset test passed!');
    } else {
      console.log('❌ Rate limit reset test failed!');
    }
    
    // Clean up rate limit key
    await CacheService.del(rateLimitKey);

    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testCacheService();