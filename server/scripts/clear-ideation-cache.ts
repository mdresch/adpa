import { cache } from '../src/utils/redis';
import { connectRedis } from '../src/utils/redis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function clearTemplateCache() {
  try {
    // Connect to Redis
    await connectRedis();
    console.log('✅ Connected to Redis\n');

    const templateId = '6c7ec59f-084b-4c55-8629-3e889ece985d';
    const cacheKey = `template:${templateId}`;
    
    // Check if cached
    const exists = await cache.exists(cacheKey);
    console.log(`Cache key: ${cacheKey}`);
    console.log(`Exists: ${exists ? 'YES' : 'NO'}`);
    
    if (exists) {
      // Delete cache
      await cache.del(cacheKey);
      console.log('\n🗑️  Template cache cleared!\n');
    } else {
      console.log('\n⚠️  Cache key not found (already cleared or expired)\n');
    }
    
    console.log('💡 Next steps:');
    console.log('   1. Refresh template page: http://localhost:3000/templates/6c7ec59f-084b-4c55-8629-3e889ece985d');
    console.log('   2. You should see v3 (not v1)');
    console.log('   3. Recommendations tab should show HIGH priority as "Implemented" ✅\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

clearTemplateCache();

