/**
 * Health Check Endpoints Test
 * 
 * This script tests the health check endpoints to ensure they are working correctly.
 * 
 * Usage:
 * node test-health-endpoints.js
 */

const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testHealthEndpoints() {
  console.log('🔍 Testing Health Check Endpoints...\n');
  
  try {
    // Test basic health endpoint
    console.log('Testing /api/health...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`Status: ${healthResponse.status}`);
    console.log('Response:', JSON.stringify(healthData, null, 2));
    console.log('\n---\n');
    
    // Test detailed health endpoint
    console.log('Testing /api/health/detailed...');
    const detailedResponse = await fetch(`${BASE_URL}/api/health/detailed`);
    const detailedData = await detailedResponse.json();
    console.log(`Status: ${detailedResponse.status}`);
    console.log('Response:', JSON.stringify(detailedData, null, 2));
    console.log('\n---\n');
    
    // Test metrics endpoint
    console.log('Testing /api/metrics...');
    const metricsResponse = await fetch(`${BASE_URL}/api/metrics`);
    const metricsData = await metricsResponse.json();
    console.log(`Status: ${metricsResponse.status}`);
    console.log('Response:', JSON.stringify(metricsData, null, 2));
    console.log('\n---\n');
    
    // Test status endpoint
    console.log('Testing /api/status...');
    const statusResponse = await fetch(`${BASE_URL}/api/status`);
    const statusData = await statusResponse.json();
    console.log(`Status: ${statusResponse.status}`);
    console.log('Response (truncated):', JSON.stringify({
      current: statusData.current,
      thresholds: statusData.thresholds,
      historyCount: statusData.history ? statusData.history.length : 0
    }, null, 2));
    
    console.log('\n✅ All health check endpoints tested successfully!');
  } catch (error) {
    console.error('\n❌ Error testing health check endpoints:', error);
    process.exit(1);
  }
}

testHealthEndpoints();