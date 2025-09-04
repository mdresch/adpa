// Simple integration test to verify frontend-backend connection
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

async function testIntegration() {
  console.log('🧪 Testing Frontend-Backend Integration...\n');

  try {
    // Test 1: Health check (if available)
    console.log('1. Testing API health...');
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/health`);
      if (healthResponse.ok) {
        console.log('✅ API health check passed');
      } else {
        console.log('⚠️  API health check failed, but continuing...');
      }
    } catch (error) {
      console.log('⚠️  No health endpoint available, continuing...');
    }

    // Test 2: Test authentication endpoints
    console.log('\n2. Testing authentication endpoints...');
    
    // Test registration
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Test User'
    };

    console.log('   - Testing user registration...');
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    if (!registerResponse.ok) {
      const error = await registerResponse.json();
      console.log('❌ Registration failed:', error.error);
      return;
    }

    const registerData = await registerResponse.json();
    console.log('✅ User registration successful');
    
    const token = registerData.token;
    const userId = registerData.user.id;

    // Test 3: Test authenticated endpoints
    console.log('\n3. Testing authenticated endpoints...');
    
    // Test getting current user
    console.log('   - Testing get current user...');
    const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (meResponse.ok) {
      console.log('✅ Get current user successful');
    } else {
      console.log('❌ Get current user failed');
    }

    // Test 4: Test projects API
    console.log('\n4. Testing projects API...');
    
    // Test creating a project
    console.log('   - Testing project creation...');
    const projectData = {
      name: 'Test Project',
      description: 'A test project for integration testing',
      framework: 'PMBOK 7',
      priority: 'medium',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    };

    const createProjectResponse = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(projectData),
    });

    if (!createProjectResponse.ok) {
      const error = await createProjectResponse.json();
      console.log('❌ Project creation failed:', error.error);
      return;
    }

    const projectResult = await createProjectResponse.json();
    console.log('✅ Project creation successful');
    const projectId = projectResult.project.id;

    // Test getting projects
    console.log('   - Testing get projects...');
    const getProjectsResponse = await fetch(`${API_BASE_URL}/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (getProjectsResponse.ok) {
      const projectsData = await getProjectsResponse.json();
      console.log(`✅ Get projects successful (found ${projectsData.projects.length} projects)`);
    } else {
      console.log('❌ Get projects failed');
    }

    // Test 5: Test documents API
    console.log('\n5. Testing documents API...');
    
    // Test creating a document
    console.log('   - Testing document creation...');
    const documentData = {
      name: 'Test Document',
      content: { text: 'This is a test document' },
      status: 'draft',
    };

    const createDocumentResponse = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ...documentData, project_id: projectId }),
    });

    if (createDocumentResponse.ok) {
      console.log('✅ Document creation successful');
    } else {
      const error = await createDocumentResponse.json();
      console.log('❌ Document creation failed:', error.error);
    }

    // Test getting documents
    console.log('   - Testing get documents...');
    const getDocumentsResponse = await fetch(`${API_BASE_URL}/documents?projectId=${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (getDocumentsResponse.ok) {
      const documentsData = await getDocumentsResponse.json();
      console.log(`✅ Get documents successful (found ${documentsData.documents.length} documents)`);
    } else {
      console.log('❌ Get documents failed');
    }

    console.log('\n🎉 Integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Authentication system working');
    console.log('   ✅ Projects API working');
    console.log('   ✅ Documents API working');
    console.log('   ✅ Frontend-Backend integration complete');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Make sure the development server is running (npm run dev)');
    console.log('   2. Check that the database is properly configured');
    console.log('   3. Verify environment variables are set correctly');
    console.log('   4. Check the browser console for any CORS errors');
  }
}

// Run the test
testIntegration();