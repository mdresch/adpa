const Redis = require('ioredis');

// Standalone test for secondary Redis performance
async function verifyPerformance() {
    const redisUrl = 'redis://default:KjCbxCxmDOHlVJWVMcMFkuEtZRyfezAM@tramway.proxy.rlwy.net:42980';
    console.log(`🚀 Verifying SECONDARY Redis (tramway) Performance...`);

    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
    });

    try {
        // 1. Connectivity & Latency
        const start = Date.now();
        await redis.ping();
        const pingLatency = Date.now() - start;
        console.log(`✅ PING Latency: ${pingLatency}ms`);

        // 2. Write Performance (Cache SET)
        const testKey = 'perf:test:' + Date.now();
        const testData = JSON.stringify({
            id: 'msg_123',
            role: 'assistant',
            content: 'This is a high-performance cached response snippet. '.repeat(50)
        });

        const startSet = Date.now();
        await redis.set(testKey, testData, 'EX', 60);
        const setLatency = Date.now() - startSet;
        console.log(`✅ SET Latency (large object): ${setLatency}ms`);

        // 3. Read Performance (Cache GET)
        const startGet = Date.now();
        const result = await redis.get(testKey);
        const getLatency = Date.now() - startGet;
        console.log(`✅ GET Latency (large object): ${getLatency}ms`);

        if (result === testData) {
            console.log('✅ Data Integrity: PASSED');
        }

        // 4. Multi/Incr Performance (Rate Limiting)
        const startMulti = Date.now();
        const multi = redis.multi();
        multi.incr('perf:counter');
        multi.expire('perf:counter', 10);
        await multi.exec();
        const multiLatency = Date.now() - startMulti;
        console.log(`✅ MULTI/INCR Latency (Rate Limit logic): ${multiLatency}ms`);

        await redis.quit();
        console.log('\n🎉 Performance verification complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verifyPerformance();
