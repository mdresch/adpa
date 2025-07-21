// Simple test script to verify API connection
const testAPI = async () => {
  try {
    console.log("Testing backend connection...");
    
    // Test health endpoint
    const healthResponse = await fetch("http://localhost:5000/health");
    const healthData = await healthResponse.json();
    console.log("Health check:", healthData);
    
    // Test login endpoint
    const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@adpa.com",
        password: "admin123"
      })
    });
    
    const loginData = await loginResponse.json();
    console.log("Login response:", loginData);
    
    if (loginData.token) {
      console.log("✅ Login successful! Token received:", loginData.token.substring(0, 20) + "...");
      console.log("✅ User data:", loginData.user);
    } else {
      console.log("❌ Login failed:", loginData);
    }
    
  } catch (error) {
    console.error("❌ API test failed:", error);
  }
};

testAPI();
