const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@adpa.com',
  password: 'admin123'
};

const DEMO_CREDENTIALS = {
  email: 'demo@adpa.com',
  password: 'demo123'
};

async function verifyPermissions() {
  console.log('🔐 Verifying User Permissions...\n');

  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  try {
    // Test admin login and permissions
    console.log('🔑 Testing Admin User Login...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    
    if (adminLoginResponse.status === 200 && adminLoginResponse.data.token) {
      console.log('✅ Admin login successful');
      
      const adminToken = adminLoginResponse.data.token;
      const adminUser = adminLoginResponse.data.user;
      
      console.log(`👤 Admin User: ${adminUser.name} (${adminUser.email})`);
      console.log(`🎭 Role: ${adminUser.role}`);
      console.log(`🔑 Permissions: ${Object.keys(adminUser.permissions || {}).length} permissions`);
      
      // Check specific integration permissions
      const integrationPermissions = [
        'integrations.create',
        'integrations.update',
        'integrations.delete',
        'integrations.manage',
        'integrations.test',
        'integrations.sync'
      ];
      
      console.log('\n🔍 Integration Permissions Check:');
      integrationPermissions.forEach(permission => {
        const hasPermission = adminUser.permissions[permission] === true;
        console.log(`   ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission}`);
        
        if (hasPermission) {
          results.passed++;
        } else {
          results.failed++;
        }
        
        results.details.push({
          test: `Admin has ${permission}`,
          status: hasPermission ? 'PASSED' : 'FAILED'
        });
      });
      
      // Test API access with admin token
      console.log('\n🌐 Testing API Access...');
      try {
        const integrationsResponse = await axios.get(`${BASE_URL}/api/integrations`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (integrationsResponse.status === 200) {
          console.log('✅ Integrations API accessible');
          results.passed++;
          results.details.push({
            test: 'Admin can access integrations API',
            status: 'PASSED'
          });
        }
      } catch (error) {
        console.log(`❌ Integrations API error: ${error.response?.status} ${error.response?.statusText}`);
        results.failed++;
        results.details.push({
          test: 'Admin can access integrations API',
          status: 'FAILED',
          error: error.message
        });
      }
      
    } else {
      console.log('❌ Admin login failed');
      results.failed++;
      results.details.push({
        test: 'Admin login',
        status: 'FAILED'
      });
    }

    // Test demo user login and permissions
    console.log('\n🔑 Testing Demo User Login...');
    try {
      const demoLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, DEMO_CREDENTIALS);
      
      if (demoLoginResponse.status === 200 && demoLoginResponse.data.token) {
        console.log('✅ Demo login successful');
        
        const demoUser = demoLoginResponse.data.user;
        console.log(`👤 Demo User: ${demoUser.name} (${demoUser.email})`);
        console.log(`🎭 Role: ${demoUser.role}`);
        console.log(`🔑 Permissions: ${Object.keys(demoUser.permissions || {}).length} permissions`);
        
        // Demo user should NOT have integration permissions
        const hasIntegrationAccess = demoUser.permissions['integrations.manage'] === true;
        console.log(`🔒 Integration access: ${hasIntegrationAccess ? '❌ UNEXPECTED' : '✅ CORRECTLY DENIED'}`);
        
        results.details.push({
          test: 'Demo user correctly denied integration access',
          status: hasIntegrationAccess ? 'FAILED' : 'PASSED'
        });
        
        if (!hasIntegrationAccess) {
          results.passed++;
        } else {
          results.failed++;
        }
        
      } else {
        console.log('❌ Demo login failed');
        results.failed++;
      }
    } catch (error) {
      console.log(`❌ Demo login error: ${error.message}`);
      results.failed++;
    }

  } catch (error) {
    console.error('❌ Permission verification failed:', error.message);
    results.failed++;
  }

  // Summary
  console.log('\n📊 Permission Verification Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

  console.log('\n📋 Detailed Results:');
  results.details.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n🎯 Access Instructions:');
  console.log('1. Make sure the backend server is running: cd server && npm run dev');
  console.log('2. Make sure the frontend is running: npm run dev');
  console.log('3. Login with admin credentials:');
  console.log('   - Email: admin@adpa.com');
  console.log('   - Password: admin123');
  console.log('4. Navigate to: http://localhost:3000/integrations/confluence');

  if (results.failed > 0) {
    console.log('\n🔧 If you still get "Access Denied":');
    console.log('1. Run: node fix-admin-permissions.js');
    console.log('2. Restart the backend server');
    console.log('3. Clear browser cache and login again');
  }

  return results;
}

// Run the verification
if (require.main === module) {
  verifyPermissions()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyPermissions };
