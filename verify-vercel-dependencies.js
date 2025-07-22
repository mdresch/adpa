// This script verifies that all the required changes for Task A3 have been made
// Run with: node verify-vercel-dependencies.js

const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  return fs.existsSync(filePath);
}

function checkContent(filePath, searchString) {
  if (!checkFile(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.includes(searchString);
}

function runChecks() {
  const checks = [
    {
      name: 'Main package.json has @vercel/postgres',
      check: () => checkContent(path.join(__dirname, 'package.json'), '"@vercel/postgres"')
    },
    {
      name: 'Main package.json has @vercel/kv',
      check: () => checkContent(path.join(__dirname, 'package.json'), '"@vercel/kv"')
    },
    {
      name: 'Server package.json has @vercel/postgres',
      check: () => checkContent(path.join(__dirname, 'server/package.json'), '"@vercel/postgres"')
    },
    {
      name: 'Server package.json has @vercel/kv',
      check: () => checkContent(path.join(__dirname, 'server/package.json'), '"@vercel/kv"')
    },
    {
      name: 'Package.json has migrate:vercel script',
      check: () => checkContent(path.join(__dirname, 'package.json'), '"migrate:vercel"')
    },
    {
      name: 'Package.json has seed:vercel script',
      check: () => checkContent(path.join(__dirname, 'package.json'), '"seed:vercel"')
    },
    {
      name: 'Next.js config has serverComponentsExternalPackages',
      check: () => checkContent(path.join(__dirname, 'next.config.mjs'), 'serverComponentsExternalPackages')
    },
    {
      name: 'Next.js config includes @vercel/postgres',
      check: () => checkContent(path.join(__dirname, 'next.config.mjs'), '@vercel/postgres')
    },
    {
      name: 'Migration script exists',
      check: () => checkFile(path.join(__dirname, 'scripts/migrate-to-vercel.ts'))
    },
    {
      name: 'Seed script exists',
      check: () => checkFile(path.join(__dirname, 'scripts/seed-vercel.ts'))
    },
    {
      name: 'Database utility file exists',
      check: () => checkFile(path.join(__dirname, 'lib/db.ts'))
    },
    {
      name: 'KV utility file exists',
      check: () => checkFile(path.join(__dirname, 'lib/kv.ts'))
    }
  ];

  console.log('🔍 Verifying Vercel dependencies and configuration...\n');
  
  let allPassed = true;
  
  for (const check of checks) {
    const passed = check.check();
    console.log(`${passed ? '✅' : '❌'} ${check.name}`);
    if (!passed) allPassed = false;
  }
  
  console.log('\n');
  
  if (allPassed) {
    console.log('🎉 All checks passed! The Vercel dependencies and configuration are correctly set up.');
  } else {
    console.log('❌ Some checks failed. Please review the output above and fix the issues.');
    process.exit(1);
  }
}

runChecks();