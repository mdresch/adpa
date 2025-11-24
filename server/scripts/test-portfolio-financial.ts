#!/usr/bin/env node
/**
 * Portfolio Financial API Testing Script
 * 
 * Tests the portfolio financial rollup endpoints
 * Usage: node --loader ts-node/esm server/scripts/test-portfolio-financial.ts
 *        or npx tsx server/scripts/test-portfolio-financial.ts
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testEndpoints() {
  console.log('🧪 Testing Portfolio Financial API Endpoints\n');
  console.log(`API URL: ${API_URL}\n`);

  try {
    // Test 1: Get Portfolio Financial Metrics
    console.log('1️⃣  Testing GET /portfolio/financial');
    console.log('─'.repeat(50));
    const financialRes = await fetch(`${API_URL}/portfolio/financial`);
    
    if (!financialRes.ok) {
      console.error(`❌ Error: ${financialRes.status} ${financialRes.statusText}`);
      const error = await financialRes.text();
      console.error('Response:', error);
    } else {
      const financialData = await financialRes.json();
      console.log('✅ Success');
      console.log('Response structure:');
      console.log(JSON.stringify(financialData, null, 2).substring(0, 500) + '...\n');

      if (financialData.data) {
        const metrics = financialData.data;
        console.log('Key Metrics:');
        console.log(`  Total Budget: $${metrics.totalBudget?.toFixed(2)}`);
        console.log(`  Actual Cost: $${metrics.totalActualCost?.toFixed(2)}`);
        console.log(`  ROI: ${metrics.roi?.toFixed(2)}%`);
        console.log(`  Total Projects: ${metrics.totalProjects}`);
        console.log(`  On-Budget: ${metrics.onBudgetPercent?.toFixed(1)}%`);
        console.log(`  On-Time: ${metrics.onTimePercent?.toFixed(1)}%\n`);
      }
    }

    // Test 2: Get Cost Breakdown
    console.log('2️⃣  Testing GET /portfolio/cost-breakdown');
    console.log('─'.repeat(50));
    const breakdownRes = await fetch(`${API_URL}/portfolio/cost-breakdown`);
    
    if (!breakdownRes.ok) {
      console.error(`❌ Error: ${breakdownRes.status} ${breakdownRes.statusText}`);
      const error = await breakdownRes.text();
      console.error('Response:', error);
    } else {
      const breakdownData = await breakdownRes.json();
      console.log('✅ Success');
      
      if (breakdownData.data && breakdownData.data.length > 0) {
        console.log(`Cost Categories (${breakdownData.data.length} items):`);
        breakdownData.data.slice(0, 3).forEach((category: any) => {
          console.log(`  - ${category.categoryName}: $${category.amount?.toFixed(2)} (${category.percentOfTotal?.toFixed(1)}%)`);
        });
        if (breakdownData.data.length > 3) {
          console.log(`  ... and ${breakdownData.data.length - 3} more`);
        }
        console.log();
      }
    }

    // Test 3: Get Program Financial Metrics (if a program exists)
    console.log('3️⃣  Testing GET /portfolio/program/:programId/financial');
    console.log('─'.repeat(50));
    console.log('Note: This test requires a valid program ID');
    console.log('You can pass a program ID as argument: npm run test:portfolio-financial -- <programId>\n');

    if (process.argv[2]) {
      const programId = process.argv[2];
      const programRes = await fetch(`${API_URL}/portfolio/program/${programId}/financial`);
      
      if (!programRes.ok) {
        console.error(`❌ Error: ${programRes.status} ${programRes.statusText}`);
        const error = await programRes.text();
        console.error('Response:', error);
      } else {
        const programData = await programRes.json();
        console.log(`✅ Success for program ${programId}`);
        
        if (programData.data) {
          const metrics = programData.data;
          console.log('Program Metrics:');
          console.log(`  Total Budget: $${metrics.totalBudget?.toFixed(2)}`);
          console.log(`  Actual Cost: $${metrics.totalActualCost?.toFixed(2)}`);
          console.log(`  Projects: ${metrics.totalProjects}`);
          console.log();
        }
      }
    }

    console.log('✅ All tests completed!\n');
    console.log('Frontend page available at: http://localhost:3000/portfolio-financial');

  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testEndpoints();
