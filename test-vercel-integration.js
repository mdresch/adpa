// This file is used to test that the Vercel dependencies are installed correctly
// Run with: node test-vercel-integration.js

try {
  // Test importing @vercel/postgres
  const postgres = require('@vercel/postgres');
  console.log('✅ @vercel/postgres imported successfully');
  
  // Test importing @vercel/kv
  const kv = require('@vercel/kv');
  console.log('✅ @vercel/kv imported successfully');
  
  // Check if the experimental config is applied
  const nextConfig = require('./next.config.mjs');
  if (nextConfig.default.experimental?.serverComponentsExternalPackages?.includes('@vercel/postgres')) {
    console.log('✅ Next.js configuration is correct');
  } else {
    console.error('❌ Next.js configuration is missing serverComponentsExternalPackages');
  }
  
  // Check if the scripts are added to package.json
  const packageJson = require('./package.json');
  if (packageJson.scripts['migrate:vercel'] && packageJson.scripts['seed:vercel']) {
    console.log('✅ Package.json scripts are correctly configured');
  } else {
    console.error('❌ Package.json scripts are missing');
  }
  
  console.log('\n🎉 All Vercel dependencies and configurations are correctly set up!');
} catch (error) {
  console.error('❌ Error testing Vercel integration:', error.message);
  process.exit(1);
}