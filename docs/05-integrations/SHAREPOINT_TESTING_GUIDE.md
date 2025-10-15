# SharePoint Integration Testing Guide

This guide helps you test and verify that the SharePoint integration buttons and functionality are working correctly.

## 🔧 Pre-Testing Setup

### 1. Enable Development Mode
Make sure you're running in development mode to see debug information:
```bash
# In your .env.local file
NODE_ENV=development
```

### 2. Open Browser Developer Tools
- Press F12 or right-click → Inspect
- Go to the Console tab to see debug messages
- Keep this open while testing

### 3. Check Network Tab
- Go to Network tab in developer tools
- This will show API calls being made

## 🧪 Testing Steps

### Step 1: Overview Tab Button Testing

1. **Navigate to Integrations Page**
   ```
   http://localhost:3000/integrations
   ```

2. **Check Debug Panel**
   - You should see a gray debug panel at the top
   - Verify it shows:
     - Integrations loaded: [number]
     - Real integrations: [number]
     - Loading: false
     - SharePoint config: [object]

3. **Test Toggle Switches**
   - Click the toggle switches next to each integration
   - **Expected**: Console should log "Toggling integration: [name] to [true/false]"
   - **Expected**: Toast notification should appear
   - **Expected**: Integration status should update

4. **Test Test Buttons (TestTube icon)**
   - Click the test button for each integration
   - **Expected**: Console should log "Test button clicked for: [name]"
   - **Expected**: Console should log "Testing integration: [name] [type]"
   - **Expected**: For SharePoint: "Testing SharePoint connection..."

5. **Test Sync Buttons (RefreshCw icon)**
   - Click the sync button for each integration
   - **Expected**: Console should log "Sync button clicked for: [name]"
   - **Expected**: API call should be made to sync endpoint

### Step 2: SharePoint Tab Testing

1. **Navigate to SharePoint Tab**
   - Click on the "SharePoint" tab

2. **Test Input Fields**
   - Enter values in Tenant ID field
   - **Expected**: Console should log "SharePoint config change: tenantId [value]"
   - Enter values in Client ID field
   - **Expected**: Console should log "SharePoint config change: clientId [value]"
   - Enter values in Client Secret field
   - **Expected**: Console should log "SharePoint config change: clientSecret [value]"

3. **Test Connection Button**
   - Fill in all three required fields (Tenant ID, Client ID, Client Secret)
   - Click "Test Connection" button
   - **Expected**: Console should log "Test Connection button clicked"
   - **Expected**: Console should log "Testing SharePoint connection..."
   - **Expected**: Console should show SharePoint config with masked values
   - **Expected**: Button should show loading state with spinner
   - **Expected**: Network tab should show POST to `/api/integrations/sharepoint/test`

4. **Test Save Configuration Button**
   - With fields filled, click "Save Configuration" button
   - **Expected**: Console should log "Save Configuration button clicked"
   - **Expected**: Console should log "Saving SharePoint configuration..."
   - **Expected**: Console should show config data being saved
   - **Expected**: Button should show loading state
   - **Expected**: Network tab should show POST or PUT to `/api/integrations`

## 🐛 Troubleshooting

### Issue: Buttons Don't Respond
**Check:**
1. Console for JavaScript errors
2. Network tab for failed API calls
3. Debug panel shows correct integration count

**Solutions:**
1. Refresh the page
2. Check if backend server is running
3. Verify authentication token in localStorage

### Issue: Test Connection Fails
**Check:**
1. Console logs for detailed error messages
2. Network tab for API response
3. Backend server logs

**Common Causes:**
1. Backend server not running
2. Invalid Azure credentials
3. Network connectivity issues
4. CORS issues

### Issue: Save Configuration Doesn't Work
**Check:**
1. Console for "Save Configuration button clicked" message
2. Network tab for API call
3. Response status and error messages

**Common Causes:**
1. Missing required fields
2. API endpoint not available
3. Authentication issues
4. Database connection problems

## 📊 Expected Console Output

### Successful SharePoint Test:
```
Test Connection button clicked
Testing SharePoint connection...
SharePoint config: {tenantId: "***", clientId: "***", clientSecret: "***"}
Response status: 200
Response data: {success: true}
```

### Successful Configuration Save:
```
Save Configuration button clicked
Saving SharePoint configuration...
Config data: {name: "SharePoint", type: "sharepoint", ...}
Existing integration: [id] or none
Creating new integration... or Updating existing integration...
Reloading integrations...
Backend integrations: [array]
```

### Successful Overview Button Clicks:
```
Test button clicked for: Microsoft SharePoint
Testing integration: Microsoft SharePoint sharepoint
Testing SharePoint connection...
```

## 🔍 API Endpoints to Monitor

### In Network Tab, look for these calls:

1. **GET /api/integrations**
   - Should happen on page load
   - Returns list of configured integrations

2. **POST /api/integrations/sharepoint/test**
   - Happens when clicking "Test Connection"
   - Should return `{success: true}` or error details

3. **POST /api/integrations** (new) or **PUT /api/integrations/[id]** (update)
   - Happens when clicking "Save Configuration"
   - Should return integration object

4. **POST /api/integrations/sharepoint/[id]/sync**
   - Happens when clicking sync button in overview
   - Should return sync results

## ✅ Success Criteria

### Overview Tab:
- [ ] Debug panel shows correct integration counts
- [ ] Toggle switches work and show console logs
- [ ] Test buttons work and show console logs
- [ ] Sync buttons work and show console logs
- [ ] Toast notifications appear for all actions
- [ ] Network calls are made to correct endpoints

### SharePoint Tab:
- [ ] Input fields update state and show console logs
- [ ] Test Connection button works and shows loading state
- [ ] Save Configuration button works and shows loading state
- [ ] Console shows detailed operation logs
- [ ] Network calls are made with correct data
- [ ] Success/error messages appear appropriately

## 🚨 Red Flags

### These indicate problems:
- No console logs when clicking buttons
- Buttons appear disabled when they shouldn't be
- No network calls in Network tab
- JavaScript errors in console
- Debug panel shows 0 integrations when there should be data
- Loading states never resolve

## 📞 Getting Help

If you encounter issues:

1. **Capture Console Output**
   - Copy all console messages
   - Include any error messages

2. **Capture Network Activity**
   - Screenshot of Network tab
   - Include request/response details for failed calls

3. **Describe Expected vs Actual Behavior**
   - What you clicked
   - What you expected to happen
   - What actually happened

4. **Environment Details**
   - Browser and version
   - Development vs production
   - Backend server status

This testing guide should help you verify that all the SharePoint integration functionality is working correctly!
