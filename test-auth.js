// Authentication Test Script
const { 
  authenticateUser, 
  validateSession, 
  refreshSession, 
  revokeSession,
  validatePassword,
  hashPassword,
  comparePasswords,
  verifyMfaCode
} = require('./lib/auth');

async function runTests() {
  console.log('🔒 Running Authentication Tests');
  
  try {
    // Test password validation
    console.log('\n📝 Testing password validation:');
    const weakPassword = 'password';
    const strongPassword = 'StrongP@ssw0rd';
    
    const weakResult = validatePassword(weakPassword);
    console.log(`Weak password validation: ${weakResult.isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!weakResult.isValid) console.log(`Message: ${weakResult.message}`);
    
    const strongResult = validatePassword(strongPassword);
    console.log(`Strong password validation: ${strongResult.isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // Test password hashing
    console.log('\n🔑 Testing password hashing:');
    const password = 'TestP@ssw0rd';
    const hashedPassword = await hashPassword(password);
    console.log(`Password hashed: ${hashedPassword ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // Test password comparison
    const isMatch = await comparePasswords(password, hashedPassword);
    console.log(`Password comparison (should match): ${isMatch ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    const isNotMatch = await comparePasswords('WrongPassword', hashedPassword);
    console.log(`Password comparison (should not match): ${!isNotMatch ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // Note: The following tests require a database connection and KV store
    // They are commented out as they would need actual credentials to run
    
    /*
    // Test user authentication
    console.log('\n👤 Testing user authentication:');
    try {
      const authResult = await authenticateUser('test@example.com', 'TestP@ssw0rd');
      console.log(`User authentication: ${authResult.token ? 'PASSED ✅' : 'FAILED ❌'}`);
      
      // Test session validation
      console.log('\n🔍 Testing session validation:');
      const validationResult = await validateSession(authResult.token);
      console.log(`Session validation: ${validationResult.isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
      
      // Test session refresh
      console.log('\n🔄 Testing session refresh:');
      const refreshResult = await refreshSession(validationResult.sessionId);
      console.log(`Session refresh: ${refreshResult.token ? 'PASSED ✅' : 'FAILED ❌'}`);
      
      // Test MFA verification
      if (authResult.requiresMfa) {
        console.log('\n📱 Testing MFA verification:');
        const mfaResult = await verifyMfaCode(validationResult.sessionId, '123456');
        console.log(`MFA verification: ${mfaResult.token ? 'PASSED ✅' : 'FAILED ❌'}`);
      }
      
      // Test session revocation
      console.log('\n❌ Testing session revocation:');
      const revocationResult = await revokeSession(validationResult.sessionId);
      console.log(`Session revocation: ${revocationResult.success ? 'PASSED ✅' : 'FAILED ❌'}`);
      
      // Verify session is revoked
      const afterRevocationResult = await validateSession(authResult.token);
      console.log(`Session is revoked: ${!afterRevocationResult.isValid ? 'PASSED ✅' : 'FAILED ❌'}`);
    } catch (error) {
      console.error('Authentication test failed:', error.message);
    }
    */
    
    console.log('\n✅ Basic authentication tests completed');
    console.log('Note: Database and KV tests are commented out as they require actual credentials');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();