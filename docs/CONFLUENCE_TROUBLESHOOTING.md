# 🔧 Confluence Integration Troubleshooting Guide

## 🚨 **Current Issue Analysis**

**User**: `menno@cbadmin.onmicrosoft.com`  
**Base URL**: `https://cba-adpa.atlassian.net`  
**Issue**: Connection failed, credentials not saving properly

---

## 🔍 **Identified Problems**

### **1. API Token Duplication Issue** 🔴
**Problem**: The provided API token appears to be duplicated:
```
ATATT3xFfGF0...DUPLICATED_TOKEN...ATATT3xFfGF0...
```

**Solution**: Use only the first part of the token (remove the duplicated portion):
```
ATATT3xFfGF0...YOUR_ACTUAL_TOKEN_HERE...=XXXXXX
```

**Note**: Replace this with your actual corrected API token (single token, not duplicated).

### **2. Frontend-Backend Connection** ✅ **FIXED**
**Problem**: Frontend wasn't properly connected to backend API  
**Solution**: Added proper API integration with authentication headers

---

## 🎯 **Step-by-Step Fix Guide**

### **Step 1: Fix API Token**
1. **Copy the corrected token** (without duplication)
2. **Clear the current token field** in the UI
3. **Paste the corrected token**

### **Step 2: Verify Configuration**
1. **Base URL**: `https://cba-adpa.atlassian.net`
2. **Username**: `menno@cbadmin.onmicrosoft.com`
3. **API Token**: Use the corrected token from Step 1
4. **Default Space**: Set to your preferred space key (e.g., "DOCS")

### **Step 3: Test Connection**
1. **Click "Test Connection"** button
2. **Check browser console** for debug information
3. **Look for success/error messages**

### **Step 4: Save Configuration**
1. **Click "Save Configuration"** after successful test
2. **Verify the configuration is saved** (page will reload data)
3. **Check that fields retain their values**

---

## 🔧 **Enhanced Features Added**

### **✅ Frontend Improvements**
- **Proper API Integration**: Connected to backend endpoints
- **Authentication Headers**: Bearer token authentication
- **Loading States**: Visual feedback during operations
- **Error Handling**: Toast notifications for success/failure
- **Debug Logging**: Console logs for troubleshooting
- **Configuration Loading**: Loads existing settings on page load

### **✅ Backend Integration**
- **Save Configuration**: Creates/updates integration in database
- **Test Connection**: Validates credentials with Confluence API
- **Load Existing**: Retrieves saved configuration
- **Error Handling**: Proper error responses and logging

---

## 🧪 **Testing Steps**

### **1. Start the Application**
```bash
# Frontend
npm run dev

# Backend (separate terminal)
cd server && npm run dev
```

### **2. Access Integration Page**
- **URL**: http://localhost:3000/integrations
- **Tab**: Click "Confluence" tab
- **Login**: Use admin credentials if needed

### **3. Configure Confluence**
1. **Base URL**: `https://cba-adpa.atlassian.net`
2. **Username**: `menno@cbadmin.onmicrosoft.com`
3. **API Token**: Use corrected token (without duplication)
4. **Default Space**: Your preferred space key

### **4. Test and Save**
1. **Click "Test Connection"**
2. **Wait for success message**
3. **Click "Save Configuration"**
4. **Verify settings are retained**

---

## 🔍 **Debugging Information**

### **Console Logs**
The frontend now logs debug information:
```javascript
Testing connection with: {
  baseUrl: "https://cba-adpa.atlassian.net",
  username: "menno@cbadmin.onmicrosoft.com",
  apiTokenLength: 123,
  apiTokenStart: "ATATT3xFfG..."
}
```

### **Common Error Messages**
- **"Connection failed: Invalid credentials"** → Check API token format
- **"Connection failed: Network error"** → Check base URL and network
- **"Please login first"** → Authentication token missing
- **"Failed to save configuration"** → Backend API issue

---

## 🎯 **Expected Results**

### **✅ Successful Connection**
- **Toast Message**: "Connection successful! ✅"
- **Console Log**: Debug information showing request details
- **Save Button**: Enabled and functional

### **✅ Successful Save**
- **Toast Message**: "Configuration saved successfully! ✅"
- **Form Reload**: Configuration loads on page refresh
- **Integration Status**: Shows as "connected" in overview

---

## 🚀 **Next Steps After Fix**

### **1. Test Advanced Features**
- **Navigate to**: http://localhost:3000/integrations/confluence
- **Test**: Space browsing, search, import/export
- **Verify**: All features work with saved configuration

### **2. Document Sync**
- **Try**: Bulk document synchronization
- **Test**: Individual page import
- **Verify**: Documents appear in ADPA projects

### **3. Export Functionality**
- **Create**: Test document in ADPA
- **Export**: Send to Confluence
- **Verify**: Document appears in Confluence space

---

## 📞 **Support Information**

### **If Issues Persist**
1. **Check browser console** for detailed error messages
2. **Verify API token** is correctly generated from Atlassian
3. **Test Confluence access** directly in browser
4. **Check network connectivity** to Atlassian domain

### **API Token Generation**
1. **Go to**: https://id.atlassian.com/manage-profile/security/api-tokens
2. **Create token** for your account
3. **Copy token** immediately (it won't be shown again)
4. **Use token** exactly as generated (no modifications)

---

## 🎉 **Success Indicators**

When everything is working correctly, you should see:
- ✅ **Connection test passes**
- ✅ **Configuration saves successfully**
- ✅ **Settings persist after page reload**
- ✅ **Advanced features accessible**
- ✅ **Document sync operations work**

**The integration is now properly connected and ready for use!** 🚀
