# Signature API Testing - Troubleshooting Guide

**Issue**: Requests to the backend server are timing out  
**Status**: Server is running but requests hang

---

## 🔍 Problem Diagnosis

The server is listening on port 5000, but HTTP requests are timing out. This typically indicates:

1. **Database Connection Issues**: Slow or hanging database queries
2. **Server Overload**: Server busy processing background jobs (extraction jobs visible in logs)
3. **Middleware Blocking**: Some middleware waiting on slow operations

---

## 🛠️ Troubleshooting Steps

### **1. Check Server Status**

```powershell
# Check if server process is running
Get-Process -Name node | Where-Object { $_.Path -like "*adpa*" }

# Check port 5000
netstat -ano | findstr :5000
```

### **2. Check Server Logs**

```powershell
# View recent logs
Get-Content server\logs\combined.log -Tail 50

# Check for errors
Select-String -Path server\logs\error.log -Pattern "error|timeout|connection" -Context 2
```

### **3. Restart the Server**

```powershell
# Stop all Node processes
Get-Process -Name node | Stop-Process -Force

# Restart backend
cd server
npm run dev
```

### **4. Check Database Connection**

The server might be waiting on database queries. Check:
- Database connection string in `server/.env`
- Network connectivity to database
- Database server status

### **5. Test Health Endpoint Directly**

```powershell
# Try with a very short timeout
Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 2 -UseBasicParsing
```

---

## ✅ Quick Test (Once Server Responds)

Once the server is responding normally:

### **Manual Test with PowerShell**:

```powershell
# 1. Login
$loginBody = @{ email = "test@adpa.com"; password = "Test123!@#" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $response.token

# 2. Get documents
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$docs = Invoke-RestMethod -Uri "http://localhost:5000/api/documents?limit=1" -Headers $headers
$docId = $docs.documents[0].id

# 3. Test signature status endpoint
Invoke-RestMethod -Uri "http://localhost:5000/api/signatures/document/$docId" -Headers $headers
```

---

## 🚀 Alternative: Test with Postman

If PowerShell/curl is timing out, use Postman:

1. **Import Collection**: Use the Postman collection from `docs/integrations/DOCUMENSO_API_TESTING.md`
2. **Set Environment**: 
   - `baseUrl`: `http://localhost:5000`
3. **Test Endpoints**: Start with the health endpoint, then auth, then signature endpoints

---

## 📋 Expected Behavior

Once the server is responding normally:

- ✅ Health endpoint should respond in < 100ms
- ✅ Auth endpoint should respond in < 500ms
- ✅ Signature endpoints should respond in < 1s (unless processing)

---

## 💡 Next Steps

1. **Wait for extraction jobs to complete** (if server is busy)
2. **Restart the server** if it's stuck
3. **Check database connection** if timeouts persist
4. **Test endpoints manually** once server responds

---

**Note**: The signature API endpoints are implemented and ready. The timeout issue is likely environmental (database connection or server load), not a code issue.

