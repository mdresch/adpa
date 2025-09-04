// Load environment variables from .env.local for local testing
dotenv.config({ path: '.env.development.local' });
process.env.KV_REST_API_URL = process.env.adpa_rga_redis_KV_REST_API_URL;
process.env.KV_REST_API_TOKEN = process.env.adpa_rga_redis_KV_REST_API_TOKEN;
import { kv } from '@vercel/kv';
import dotenv from 'dotenv';



async function testKVConnection() {
  console.log('🚀 Starting Vercel KV connection test...');

  if (!process.env.adpa_rga_redis_KV_REST_API_URL || !process.env.adpa_rga_redis_KV_REST_API_TOKEN) {
    console.error('❌ Missing ADPA RGA Redis KV environment variables.');
    console.error('Ensure adpa_rga_redis_KV_REST_API_URL and adpa_rga_redis_KV_REST_API_TOKEN are set in your .env file or Vercel project.');
    process.exit(1);
  }

  const testKey = `test:user:${Date.now()}`;
  const testValue = { id: '123', name: 'Test User', timestamp: new Date().toISOString() };
  const ttlKey = `test:ttl:${Date.now()}`;
  const ttlValue = 'This key has a 10-second TTL';

  try {
    // 1. Basic SET/GET operation
    console.log(`\n[1/4] Testing basic SET/GET...`);
    console.log(`Setting key "${testKey}"...`);
    await kv.set(testKey, testValue);
    console.log('✅ SET successful.');

    console.log(`Getting key "${testKey}"...`);
    const retrievedValue = await kv.get(testKey);
    if (JSON.stringify(retrievedValue) === JSON.stringify(testValue)) {
        console.log('✅ GET successful. Retrieved value matches set value.');
        console.log('   Retrieved:', retrievedValue);
    } else {
        throw new Error(`Value mismatch! Expected ${JSON.stringify(testValue)}, got ${JSON.stringify(retrievedValue)}`);
    }

    // 2. DEL operation
    console.log(`\n[2/4] Testing DEL...`);
    console.log(`Deleting key "${testKey}"...`);
    const delResult = await kv.del(testKey);
    if (delResult === 1) {
        console.log('✅ DEL successful.');
    } else {
        throw new Error(`DEL operation failed for key "${testKey}".`);
    }
    const afterDelete = await kv.get(testKey);
    if (afterDelete === null) {
        console.log('✅ Key successfully deleted, GET returned null as expected.');
    } else {
        throw new Error('Key was not deleted successfully.');
    }

    // 3. TTL functionality
    console.log(`\n[3/4] Testing TTL functionality...`);
    console.log(`Setting key "${ttlKey}" with a 10-second TTL...`);
    await kv.set(ttlKey, ttlValue, { ex: 10 });
    console.log('✅ SET with TTL successful.');

    const ttlBeforeExpiry = await kv.ttl(ttlKey);
    console.log(`   TTL for "${ttlKey}": ${ttlBeforeExpiry} seconds.`);
    if (ttlBeforeExpiry > 0 && ttlBeforeExpiry <= 10) {
        console.log('✅ TTL is correctly set.');
    } else {
        throw new Error('TTL was not set correctly.');
    }

    console.log('   Waiting 11 seconds for TTL to expire...');
    await new Promise(resolve => setTimeout(resolve, 11000));

    const valueAfterExpiry = await kv.get(ttlKey);
    if (valueAfterExpiry === null) {
        console.log('✅ Key expired as expected. GET returned null.');
    } else {
        throw new Error('Key did not expire as expected.');
    }

    // 4. Error Handling (testing with a non-existent key)
    console.log(`\n[4/4] Testing error handling (getting a non-existent key)...`);
    const nonExistentKey = 'this:key:does:not:exist';
    const nonExistentValue = await kv.get(nonExistentKey);
    if (nonExistentValue === null) {
        console.log(`✅ GET on non-existent key "${nonExistentKey}" returned null as expected.`);
    } else {
        throw new Error('GET on a non-existent key should return null.');
    }

    console.log('\n🎉 All Vercel KV tests passed successfully!');

  } catch (error) {
    console.error('\n❌ A test failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testKVConnection();

