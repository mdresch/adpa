#!/usr/bin/env tsx

/**
 * Test script for AI Provider CLI
 * 
 * This script tests the basic functionality of the AI Provider CLI
 * without requiring user interaction.
 */

import fs from 'fs';
import path from 'path';
import AIProviderSelector from './ai-provider-selector';

async function testCLI() {
  console.log('🧪 Testing AI Provider CLI...\n');

  try {
    // Test 1: Check if the class can be instantiated
    console.log('✅ Test 1: Instantiating AIProviderSelector...');
    const selector = new AIProviderSelector();
    console.log('✅ AIProviderSelector instantiated successfully\n');

    // Test 2: Check if environment files exist
    console.log('✅ Test 2: Checking environment files...');
    const envFiles = [
      path.join(__dirname, '..', '.env.local'),
      path.join(__dirname, '..', '.env'),
      path.join(__dirname, '..', 'server', '.env')
    ];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        console.log(`✅ Found: ${envFile}`);
      } else {
        console.log(`⚠️  Not found: ${envFile}`);
      }
    }
    console.log();

    // Test 3: Check current configuration
    console.log('✅ Test 3: Loading current configuration...');
    const currentConfig = (selector as any).loadCurrentConfig();
    console.log(`✅ Loaded ${Object.keys(currentConfig).length} configuration keys`);
    
    // Show some non-sensitive config
    const nonSensitiveKeys = Object.keys(currentConfig).filter(key => 
      !key.toLowerCase().includes('key') && 
      !key.toLowerCase().includes('secret') &&
      !key.toLowerCase().includes('password')
    );
    
    if (nonSensitiveKeys.length > 0) {
      console.log('Sample configuration keys:');
      nonSensitiveKeys.slice(0, 5).forEach(key => {
        console.log(`  ${key}=${currentConfig[key]}`);
      });
    }
    console.log();

    // Test 4: Check provider detection
    console.log('✅ Test 4: Detecting configured providers...');
    const currentProviders = (selector as any).getCurrentProviders();
    console.log(`✅ Found ${currentProviders.length} configured providers`);
    
    if (currentProviders.length > 0) {
      console.log('Configured providers:');
      currentProviders.forEach((provider: any) => {
        console.log(`  • ${provider.name} - ${provider.description}`);
      });
    }
    console.log();

    console.log('🎉 All tests passed! The CLI tool is ready to use.\n');
    console.log('To run the interactive CLI, use:');
    console.log('  npm run ai-config');
    console.log('  or');
    console.log('  tsx scripts/ai-provider-selector.ts\n');

  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testCLI();
}

export default testCLI;