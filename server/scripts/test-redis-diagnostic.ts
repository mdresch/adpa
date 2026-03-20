import { connectRedis, redisClient, cache } from "../src/utils/redis";
import { logger } from "../src/utils/logger";

async function runTest() {
  logger.info("Starting Redis diagnostic test...");
  
  try {
    await connectRedis();
    
    const client = redisClient();
    if (!client) {
      logger.error("Failed to get Redis client after connection attempt");
      process.exit(1);
    }

    if (process.env.UPSTASH_REDIS_URL) {
      logger.info("Upstash Redis configuration detected and integrated.");
    }

    logger.info("Testing cache SET/GET...");
    const testKey = `test_diag_${Date.now()}`;
    const testValue = { success: true, timestamp: new Date().toISOString() };
    
    await cache.set(testKey, testValue, 60);
    const retrieved = await cache.get(testKey);
    
    logger.info("Cache test result:", { 
      key: testKey, 
      match: JSON.stringify(retrieved) === JSON.stringify(testValue) 
    });

    if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
      logger.info("✅ Redis diagnostic test PASSED");
    } else {
      logger.error("❌ Redis diagnostic test FAILED: Value mismatch");
    }

    // Wait 5 seconds to see if heartbeat or errors occur
    logger.info("Waiting 5 seconds to monitor connection stability...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info("Diagnostic complete. Exiting.");
    process.exit(0);
  } catch (error) {
    logger.error(error, "Redis diagnostic test crashed:");
    process.exit(1);
  }
}

runTest();
