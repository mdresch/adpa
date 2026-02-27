const Redis = require('ioredis');

async function verifyTramwayRedis() {
    const redisUrl = 'redis://default:KjCbxCxmDOHlVJWVMcMFkuEtZRyfezAM@tramway.proxy.rlwy.net:42980';
    console.log(`Connecting to SECONDARY Redis (tramway) at: ${redisUrl.replace(/:[^:@]+@/, ':***@')}`);

    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
    });

    try {
        const start = Date.now();
        const pong = await redis.ping();
        const latency = Date.now() - start;
        console.log(`✅ tramway PING response: ${pong}`);
        console.log(`✅ tramway latency: ${latency}ms`);

        // Test a set/get
        await redis.set('test:tramway', 'operational', 'EX', 10);
        const value = await redis.get('test:tramway');
        console.log(`✅ tramway Set/Get test: ${value === 'operational' ? 'Passed' : 'Failed'}`);

        await redis.quit();
        process.exit(0);
    } catch (error) {
        console.error('❌ tramway verification failed:');
        console.error(error.message);
        process.exit(1);
    }
}

verifyTramwayRedis();
