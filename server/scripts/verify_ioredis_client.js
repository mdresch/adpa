const Redis = require('ioredis');
require('dotenv').config();

async function verifyIoRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`Connecting to Redis via ioredis at: ${redisUrl.replace(/:[^:@]+@/, ':***@')}`);

    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
    });

    try {
        const start = Date.now();
        const pong = await redis.ping();
        const latency = Date.now() - start;
        console.log(`✅ ioredis PING response: ${pong}`);
        console.log(`✅ ioredis latency: ${latency}ms`);

        // Test a set/get
        await redis.set('test:ioredis', 'operational', 'EX', 10);
        const value = await redis.get('test:ioredis');
        console.log(`✅ ioredis Set/Get test: ${value === 'operational' ? 'Passed' : 'Failed'}`);

        await redis.quit();
        process.exit(0);
    } catch (error) {
        console.error('❌ ioredis verification failed:');
        console.error(error.message);
        process.exit(1);
    }
}

verifyIoRedis();
