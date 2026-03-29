
import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Schedule: Run at minute 0 of every hour
// Pattern: '0 * * * *'
cron.schedule('0 * * * *', async () => {
  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] 🕒 Starting hourly synchronization...`);
  
  try {
    // Run the sync script with TLS checks disabled
    const { stdout, stderr } = await execAsync('npx tsx scripts/sync-supabase.ts', {
      env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }
    });
    
    console.log(stdout);
    if (stderr) console.error(`⚠️ Warnings: ${stderr}`);
    console.log(`[${timestamp}] ✅ Sync completed.`);
  } catch (error: any) {
    console.error(`[${timestamp}] 💥 Scheduled sync failed:`, error.message);
  }
});

console.log('🚀 ADPA Supabase-to-Local Sync Scheduler is active.');
console.log('📅 Status: Running every hour at minute 0.');

// Optional: Run immediately on startup to ensure data is fresh
(async () => {
    console.log('⏳ Running initial startup sync...');
    try {
        await execAsync('npx tsx scripts/sync-supabase.ts', {
            env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }
        });
        console.log('✅ Initial sync complete.');
    } catch (e: any) {
        console.error('❌ Initial sync failed:', e.message);
    }
})();
