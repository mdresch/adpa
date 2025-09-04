import { testConnection } from '../lib/db';
import dotenv from 'dotenv';

// Load environment variables from .env.local if it exists
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔍 Testing Vercel Postgres connection...');
  console.log('Environment variables:');
  console.log('- POSTGRES_URL:', process.env.POSTGRES_URL ? '✅ Set' : '❌ Not set');
  console.log('- POSTGRES_PRISMA_URL:', process.env.POSTGRES_PRISMA_URL ? '✅ Set' : '❌ Not set');
  console.log('- POSTGRES_URL_NON_POOLING:', process.env.POSTGRES_URL_NON_POOLING ? '✅ Set' : '❌ Not set');
  console.log('- POSTGRES_USER:', process.env.POSTGRES_USER ? '✅ Set' : '❌ Not set');
  console.log('- POSTGRES_HOST:', process.env.POSTGRES_HOST ? '✅ Set' : '❌ Not set');
  console.log('- POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('- POSTGRES_DATABASE:', process.env.POSTGRES_DATABASE ? '✅ Set' : '❌ Not set');
  
  try {
    const success = await testConnection();
    if (success) {
      console.log('✅ Database connection test successful!');
      process.exit(0);
    } else {
      console.error('❌ Database connection test failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing database connection:', error);
    process.exit(1);
  }
}

main();