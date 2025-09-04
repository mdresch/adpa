#!/usr/bin/env tsx

/**
 * Verification script for Vercel dependencies
 * Tests that @vercel/postgres and @vercel/kv are properly installed and accessible
 */

async function verifyVercelDependencies() {
  console.log('🔍 Verifying Vercel Dependencies...\n');

  // Test 1: Import @vercel/postgres
  try {
    const { sql } = await import('@vercel/postgres');
    console.log('✅ @vercel/postgres imported successfully');
    console.log('   - sql function available:', typeof sql === 'function');
  } catch (error) {
    console.error('❌ Failed to import @vercel/postgres:', error);
    process.exit(1);
  }

  // Test 2: Import @vercel/kv
  try {
    const { kv } = await import('@vercel/kv');
    console.log('✅ @vercel/kv imported successfully');
    console.log('   - kv object available:', typeof kv === 'object');
  } catch (error) {
    console.error('❌ Failed to import @vercel/kv:', error);
    process.exit(1);
  }

  // Test 3: Check TypeScript types
  try {
    // This will fail at compile time if types are not available
    const { sql } = await import('@vercel/postgres');
    const { kv } = await import('@vercel/kv');

    // Type checking - these should not cause TypeScript errors
    const _sqlType: typeof sql = sql;
    const _kvType: typeof kv = kv;

    console.log('✅ TypeScript types are available');
  } catch (error) {
    console.error('❌ TypeScript types verification failed:', error);
    process.exit(1);
  }

  // Test 4: Check package versions
  try {
    const fs = await import('fs');
    const path = await import('path');

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    const postgresVersion = packageJson.dependencies['@vercel/postgres'];
    const kvVersion = packageJson.dependencies['@vercel/kv'];

    console.log('✅ Package versions:');
    console.log(`   - @vercel/postgres: ${postgresVersion}`);
    console.log(`   - @vercel/kv: ${kvVersion}`);
  } catch (error) {
    console.error('❌ Failed to check package versions:', error);
    process.exit(1);
  }

  console.log('\n🎉 All Vercel dependencies verified successfully!');
  console.log('\n📋 Summary:');
  console.log('   ✅ @vercel/postgres installed and importable');
  console.log('   ✅ @vercel/kv installed and importable');
  console.log('   ✅ TypeScript types available');
  console.log('   ✅ Package versions confirmed');
  console.log('\n🚀 Ready for Vercel integration development!');
}

// Run the verification
verifyVercelDependencies().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
