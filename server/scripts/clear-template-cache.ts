import { createClient } from 'redis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function clearCache() {
  const client = createClient({ 
    url: process.env.REDIS_URL || 'redis://localhost:6379' 
  });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    const templateKey = 'template:6c7ec59f-084b-4c55-8629-3e889ece985d';
    const deleted = await client.del(templateKey);
    
    console.log('\n🗑️  Cache Cleared:\n');
    console.log(`Cache key: ${templateKey}`);
    console.log(`Keys deleted: ${deleted}`);
    
    if (deleted > 0) {
      console.log('\n✅ Cache cleared successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Refresh the template page (F5 or Ctrl+R)');
      console.log('   2. UI should now show v3');
      console.log('   3. Recommendations tab should show HIGH priority as "Implemented"');
    } else {
      console.log('\n⚠️  Cache key not found (might already be cleared or expired)');
      console.log('   Refresh the page anyway - it will fetch fresh data from DB');
    }

    await client.quit();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearCache();

