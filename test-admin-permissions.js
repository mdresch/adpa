const axios = require('axios');

async function testAdminPermissions() {
  console.log('🔍 Testing admin@adpa.com permissions via API...\n');

  try {
    // Step 1: Login as admin
    console.log('🔐 Logging in as admin@adpa.com...');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@adpa.com',
      password: 'admin123'
    });

    if (loginResponse.status === 200 && loginResponse.data.token) {
      console.log('✅ Login successful!');
      console.log(`👤 User: ${loginResponse.data.user.name} (${loginResponse.data.user.role})`);
      
      const token = loginResponse.data.token;
      const user = loginResponse.data.user;
      
      // Step 2: Check permissions
      console.log('\n🔑 User permissions:');
      const permissions = user.permissions || {};
      
      const requiredPermissions = [
        'integrations.create',
        'integrations.update',
        'integrations.delete', 
        'integrations.test',
        'integrations.sync'
      ];
      
      let hasAllPermissions = true;
      
      requiredPermissions.forEach(perm => {
        const hasPermission = permissions[perm] === true;
        console.log(`   ${hasPermission ? '✅' : '❌'} ${perm}: ${hasPermission}`);
        if (!hasPermission) {
          hasAllPermissions = false;
        }
      });
      
      // Step 3: Test integrations API access
      console.log('\n🧪 Testing integrations API access...');
      
      try {
        const integrationsResponse = await axios.get('http://localhost:5000/api/integrations', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ GET /api/integrations - Success');
        console.log(`📊 Found ${integrationsResponse.data.integrations?.length || 0} integrations`);
        
      } catch (apiError) {
        console.log('❌ GET /api/integrations - Failed');
        console.log(`   Status: ${apiError.response?.status}`);
        console.log(`   Error: ${apiError.response?.data?.error || apiError.message}`);
      }
      
      // Step 4: Test creating integration (dry run)
      console.log('\n🧪 Testing integration creation permissions...');
      
      try {
        const testIntegrationData = {
          name: "Test SharePoint",
          type: "sharepoint", 
          configuration: {
            tenant_id: "test",
            client_id: "test",
            client_secret: "test"
          },
          credentials: {
            tenant_id: "test",
            client_id: "test", 
            client_secret: "test"
          },
          is_active: false
        };
        
        // This will likely fail due to validation, but we want to see if it's a permission error
        await axios.post('http://localhost:5000/api/integrations', testIntegrationData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ POST /api/integrations - Permission granted');
        
      } catch (apiError) {
        const status = apiError.response?.status;
        const error = apiError.response?.data?.error;
        
        if (status === 403) {
          console.log('❌ POST /api/integrations - Permission denied');
          console.log(`   Error: ${error}`);
          hasAllPermissions = false;
        } else if (status === 400) {
          console.log('✅ POST /api/integrations - Permission granted (validation error expected)');
          console.log(`   Validation error: ${error}`);
        } else {
          console.log(`⚠️  POST /api/integrations - Unexpected error (${status})`);
          console.log(`   Error: ${error}`);
        }
      }
      
      // Summary
      console.log('\n📋 Summary:');
      if (hasAllPermissions) {
        console.log('✅ Admin user has all required permissions for integrations!');
        console.log('🎯 You should be able to save SharePoint configuration');
        console.log('\n💡 If you\'re still getting "Access token required":');
        console.log('   1. Make sure you\'re logged in to the frontend');
        console.log('   2. Check browser localStorage for "token"');
        console.log('   3. Try logging out and logging back in');
      } else {
        console.log('❌ Admin user is missing some integration permissions');
        console.log('🔧 You may need to update the user permissions in the database');
      }
      
    } else {
      console.log('❌ Login failed - check credentials');
    }
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Login failed - Invalid credentials');
      console.log('📧 Expected: admin@adpa.com');
      console.log('🔑 Expected: admin123');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to backend server');
      console.log('🔧 Make sure the backend is running on http://localhost:5000');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Run the test
testAdminPermissions().catch(console.error);
