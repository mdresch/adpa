# iModel Viewer Tab Disabled - Troubleshooting Guide

**Last Updated**: 2026-01-24  
**Issue**: iModel Viewer tab is disabled/grayed out on Digital Twins page  
**Status**: ✅ Resolved - Understanding the enablement logic

---

## Why is the iModel Viewer Tab Disabled?

The iModel Viewer tab is **intentionally disabled** unless specific conditions are met. This is by design to prevent errors and ensure the viewer only appears when it can actually display an iModel.

---

## Enablement Conditions

The iModel Viewer tab is enabled **only when ALL** of the following conditions are true:

### 1. ✅ Asset Selected (`assetId` in URL)
- An asset must be selected from the Assets tab
- The URL must contain `?assetId=<asset-id>` parameter
- Example: `/projects/123/digital-twins?assetId=abc-123&tab=viewer`

### 2. ✅ Asset Loaded (`selectedAsset` exists)
- The asset data must be successfully fetched from the API
- The `selectedAsset` state must be populated
- If the API call fails, `selectedAsset` will be `null` and the tab stays disabled

### 3. ✅ Platform Type is "iTwin"
- The asset's `platform_type` must be exactly `"iTwin"` (case-sensitive)
- Valid platform types: `"iTwin"`, `"AzureDT"`, `"Generic"`
- Only `"iTwin"` assets can display iModels

---

## Code Logic

The enablement logic in `app/projects/[id]/digital-twins/page.tsx`:

```typescript
// Fetch asset when assetId changes
useEffect(() => {
  if (assetId) {
    fetchAssetForViewer();
  } else {
    setSelectedAsset(null);
  }
}, [assetId]);

// Check if viewer tab should be enabled
const canViewiModel = assetId && selectedAsset?.platform_type === "iTwin";

// Tab is disabled if condition fails
<TabsTrigger value="viewer" disabled={!canViewiModel}>
  <Eye className="h-4 w-4 mr-2" />
  iModel Viewer
</TabsTrigger>
```

---

## Common Scenarios

### Scenario 1: No Asset Selected ❌

**Symptom**: iModel Viewer tab is disabled  
**Cause**: No asset has been selected from the Assets tab  
**URL**: `/projects/123/digital-twins` (no `assetId` parameter)

**Solution**:
1. Go to the **Assets** tab
2. Click on an asset card
3. Or use the "View iModel" button on an iTwin asset card
4. The tab will automatically enable if the asset is an iTwin asset

---

### Scenario 2: Asset Not Loaded Yet ⏳

**Symptom**: iModel Viewer tab is disabled even with `assetId` in URL  
**Cause**: Asset data is still being fetched from the API  
**URL**: `/projects/123/digital-twins?assetId=abc-123`

**Solution**:
1. Wait a moment for the asset to load
2. Check browser console for API errors
3. Verify the asset ID is valid
4. Refresh the page if the asset doesn't load

**Debug**:
```javascript
// In browser console
console.log('Asset ID:', new URLSearchParams(window.location.search).get('assetId'));
// Check if asset is loading
```

---

### Scenario 3: Asset is Not an iTwin Asset ❌

**Symptom**: iModel Viewer tab is disabled even with asset selected  
**Cause**: Asset's `platform_type` is not `"iTwin"`  
**Platform Types**: `"iTwin"`, `"AzureDT"`, `"Generic"`

**How to Check**:
1. Look at the asset card - it shows the platform type
2. Example: `iTwin · external-id-123` (iTwin asset) ✅
3. Example: `AzureDT · external-id-456` (Azure DT asset) ❌
4. Example: `Generic · external-id-789` (Generic REST asset) ❌

**Solution**:
- **Only iTwin assets** can use the iModel Viewer
- For Azure DT assets, use Azure Digital Twins Explorer
- For Generic assets, use the platform's native viewer
- If you need to view an iModel, create/select an iTwin asset instead

---

### Scenario 4: Platform Type Case Sensitivity ❌

**Symptom**: iModel Viewer tab disabled even though asset appears to be iTwin  
**Cause**: `platform_type` value is not exactly `"iTwin"` (case-sensitive)

**Common Mistakes**:
- ❌ `"itwin"` (lowercase)
- ❌ `"ITWIN"` (uppercase)
- ❌ `"iTwin Platform"` (with space)
- ✅ `"iTwin"` (correct)

**Solution**:
1. Check the asset's `platform_type` in the database
2. Ensure it's exactly `"iTwin"` (capital I, capital T, lowercase win)
3. Update the asset if the platform type is incorrect

**Database Check**:
```sql
SELECT id, name, platform_type 
FROM digital_twin_assets 
WHERE id = '<asset-id>';
-- Should show: platform_type = 'iTwin'
```

---

### Scenario 5: API Error Loading Asset ❌

**Symptom**: iModel Viewer tab disabled, console shows errors  
**Cause**: API call to fetch asset failed

**Common Errors**:
- `404 Not Found` - Asset doesn't exist
- `401 Unauthorized` - Authentication failed
- `500 Internal Server Error` - Server error
- Network timeout

**Solution**:
1. Check browser console for error messages
2. Verify authentication token is valid
3. Check network tab for failed API requests
4. Verify the asset ID is correct
5. Check server logs for errors

**Debug**:
```javascript
// In browser console
fetch('/api/digital-twin/assets/<asset-id>', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

## How to Enable the iModel Viewer

### Step 1: Select an iTwin Asset

1. Navigate to **Digital Twins** page
2. Go to **Assets** tab
3. Find an asset with platform type **"iTwin"**
4. Click on the asset card or use the "View iModel" button

### Step 2: Verify Asset is Loaded

- The asset should appear in the URL: `?assetId=<asset-id>`
- The iModel Viewer tab should become enabled (not grayed out)
- If it's still disabled, check the scenarios above

### Step 3: Open iModel Viewer

1. Click on the **iModel Viewer** tab
2. The viewer should load the iModel
3. If it shows an error, check the "iModel Viewer Errors" section below

---

## Visual Indicators

### ✅ Enabled Tab
- Tab is clickable (not grayed out)
- Tab text is normal color
- Hover shows pointer cursor
- Clicking opens the viewer

### ❌ Disabled Tab
- Tab is grayed out
- Tab text is muted/disabled color
- Hover shows "not-allowed" cursor
- Clicking does nothing

---

## iModel Viewer Errors (After Tab is Enabled)

Even if the tab is enabled, the viewer might show errors:

### Error 1: Missing iTwin ID or iModel ID

**Message**: "iTwin ID and iModel ID are required to view the iModel."

**Cause**: Asset metadata doesn't contain `itwinId` or `imodelId`

**Solution**:
1. Check asset metadata in database:
   ```sql
   SELECT metadata FROM digital_twin_assets WHERE id = '<asset-id>';
   ```
2. Ensure metadata contains:
   ```json
   {
     "itwinId": "your-itwin-id",
     "imodelId": "your-imodel-id"
   }
   ```
3. Or ensure `platform_instance_url` contains these IDs:
   ```
   https://...?itwinId=xxx&imodelId=yyy
   ```

### Error 2: Authentication Failed

**Message**: "Failed to authenticate with Bentley iTwin Platform"

**Cause**: Missing or invalid Bentley OAuth credentials

**Solution**:
1. Check environment variables:
   - `IMJS_AUTH_CLIENT_CLIENT_ID` or `NEXT_PUBLIC_ITWIN_CLIENT_ID`
   - `IMJS_AUTH_CLIENT_REDIRECT_URI` or `NEXT_PUBLIC_ITWIN_REDIRECT_URI`
2. Verify Bentley application is registered
3. See [iTwin Viewer Setup Guide](../roadmap/ITWIN_VIEWER_SETUP.md)

---

## Debugging Checklist

Use this checklist to diagnose why the iModel Viewer tab is disabled:

- [ ] Is there an `assetId` in the URL? (`?assetId=...`)
- [ ] Is the asset successfully loaded? (Check browser console)
- [ ] Is the asset's `platform_type` exactly `"iTwin"`? (Case-sensitive)
- [ ] Are there any API errors in the console?
- [ ] Is the authentication token valid?
- [ ] Does the asset exist in the database?
- [ ] Is the asset's `platform_type` set correctly in the database?

---

## Quick Test

To quickly test if the iModel Viewer should work:

1. **Check URL**: Does it contain `?assetId=<some-id>`?
2. **Check Asset Card**: Does it show `iTwin · <external-id>`?
3. **Check Tab**: Is the "iModel Viewer" tab enabled (not grayed out)?

If all three are ✅, the viewer should work. If any are ❌, follow the scenarios above.

---

## Platform Type Reference

| Platform Type | iModel Viewer Available? | Alternative Viewer |
|--------------|-------------------------|-------------------|
| `"iTwin"` | ✅ Yes | Bentley iTwin Viewer |
| `"AzureDT"` | ❌ No | Azure Digital Twins Explorer |
| `"Generic"` | ❌ No | Platform-specific viewer |

---

## Related Documentation

- [iTwin Viewer Setup Guide](../roadmap/ITWIN_VIEWER_SETUP.md) - How to configure iTwin Viewer
- [Digital Twin Implementation Status](../roadmap/DIGITAL_TWIN_IMPLEMENTATION_STATUS.md) - Overall implementation
- [Digital Twin Assets Service](../../server/src/services/digitalTwinAssetService.ts) - Asset service code

---

## Still Having Issues?

If the iModel Viewer tab is still disabled after checking all scenarios:

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are successful
3. **Check Server Logs**: Look for backend errors
4. **Verify Asset Data**: Check database for correct `platform_type`
5. **Test with Known Good Asset**: Try with a seed/test iTwin asset

**Common Fixes**:
- Refresh the page
- Clear browser cache
- Re-select the asset
- Check asset exists and has correct `platform_type`

---

**Last Updated**: 2026-01-24  
**Status**: ✅ Guide Complete
