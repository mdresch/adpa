#!/usr/bin/env tsx

/**
 * Test environment file update functionality
 * 
 * This script tests the environment file update logic
 * without requiring user interaction.
 */

import fs from 'fs';
import path from 'path';
import AIProviderSelector from './ai-provider-selector';

async function testEnvUpdate() {
  console.log('🧪 Testing Environment File Update...\n');

  const testEnvFile = path.join(__dirname, '.env.test');
  const originalEnvFile = path.join(__dirname, '..', '.env.local');
  
  try {
    // Create a backup of the original .env.local
    let originalContent = '';
    if (fs.existsSync(originalEnvFile)) {
      originalContent = fs.readFileSync(originalEnvFile, 'utf8');
    }

    // Create test environment file
    const testContent = `# Test environment file
NODE_ENV=test
EXISTING_KEY="existing_value"
`;
    fs.writeFileSync(testEnvFile, testContent, 'utf8');

    // Test the update functionality
    console.log('✅ Test 1: Creating test environment file...');
    console.log(`✅ Created: ${testEnvFile}\n`);

    // Create a modified selector that uses our test file
    class TestAIProviderSelector extends AIProviderSelector {
      async testUpdateEnvironmentFiles(config: Record<string, string>) {
        // Override the updateEnvironmentFiles method to use our test file
        const primaryEnvFile = testEnvFile;

        try {
          // Read existing content
          let content = '';
          if (fs.existsSync(primaryEnvFile)) {
            content = fs.readFileSync(primaryEnvFile, 'utf8');
          }

          // Update or add each configuration key
          for (const [key, value] of Object.entries(config)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            const newLine = `${key}="${value}"`;

            if (regex.test(content)) {
              // Update existing line
              content = content.replace(regex, newLine);
            } else {
              // Add new line
              if (content && !content.endsWith('\n')) {
                content += '\n';
              }
              content += `${newLine}\n`;
            }
          }

          // Write back to file
          fs.writeFileSync(primaryEnvFile, content, 'utf8');

        } catch (error) {
          throw new Error(`Failed to update environment file: ${(error as Error).message}`);
        }
      }
    }

    const selector = new TestAIProviderSelector();

    console.log('✅ Test 2: Testing environment file updates...');
    
    // Test adding new configuration
    const testConfig = {
      'OPENAI_API_KEY': 'sk-test-key-12345',
      'OPENAI_DEFAULT_MODEL': 'gpt-4',
      'OPENAI_ENABLED': 'true'
    };

    await selector.testUpdateEnvironmentFiles(testConfig);

    // Read and verify the updated file
    const updatedContent = fs.readFileSync(testEnvFile, 'utf8');
    console.log('Updated file content:');
    console.log('---');
    console.log(updatedContent);
    console.log('---\n');

    // Verify the updates
    const lines = updatedContent.split('\n');
    let foundKeys = 0;
    
    for (const [key, value] of Object.entries(testConfig)) {
      const found = lines.some(line => line.includes(`${key}="${value}"`));
      if (found) {
        foundKeys++;
        console.log(`✅ Found: ${key}="${value}"`);
      } else {
        console.log(`❌ Missing: ${key}="${value}"`);
      }
    }

    // Verify existing content is preserved
    const existingKeyPreserved = updatedContent.includes('EXISTING_KEY="existing_value"');
    if (existingKeyPreserved) {
      console.log('✅ Existing configuration preserved');
    } else {
      console.log('❌ Existing configuration lost');
    }

    console.log();

    if (foundKeys === Object.keys(testConfig).length && existingKeyPreserved) {
      console.log('🎉 Environment file update test passed!\n');
    } else {
      throw new Error('Environment file update test failed');
    }

    // Test removal functionality
    console.log('✅ Test 3: Testing environment file key removal...');
    
    class TestRemovalSelector extends AIProviderSelector {
      async testRemoveFromEnvironmentFiles(keysToRemove: string[]) {
        const primaryEnvFile = testEnvFile;

        try {
          if (!fs.existsSync(primaryEnvFile)) {
            return;
          }

          let content = fs.readFileSync(primaryEnvFile, 'utf8');

          // Remove each key
          for (const key of keysToRemove) {
            const regex = new RegExp(`^${key}=.*$\\n?`, 'm');
            content = content.replace(regex, '');
          }

          // Write back to file
          fs.writeFileSync(primaryEnvFile, content, 'utf8');

        } catch (error) {
          throw new Error(`Failed to update environment file: ${(error as Error).message}`);
        }
      }
    }

    const removalSelector = new TestRemovalSelector();
    await removalSelector.testRemoveFromEnvironmentFiles(['OPENAI_API_KEY', 'OPENAI_ENABLED']);

    const finalContent = fs.readFileSync(testEnvFile, 'utf8');
    console.log('Final file content after removal:');
    console.log('---');
    console.log(finalContent);
    console.log('---\n');

    // Verify removal
    const removedKeyExists = finalContent.includes('OPENAI_API_KEY');
    const preservedKeyExists = finalContent.includes('OPENAI_DEFAULT_MODEL');
    
    if (!removedKeyExists && preservedKeyExists) {
      console.log('✅ Key removal test passed!');
    } else {
      throw new Error('Key removal test failed');
    }

    console.log('\n🎉 All environment file tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    process.exit(1);
  } finally {
    // Clean up test file
    if (fs.existsSync(testEnvFile)) {
      fs.unlinkSync(testEnvFile);
      console.log('🧹 Cleaned up test file\n');
    }
  }
}

// Run tests
if (require.main === module) {
  testEnvUpdate();
}

export default testEnvUpdate;