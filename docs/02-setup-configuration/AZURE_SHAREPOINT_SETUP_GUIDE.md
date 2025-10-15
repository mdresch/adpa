# Azure SharePoint Integration Setup Guide

This guide provides detailed instructions for setting up Azure App Registration to enable SharePoint integration with the ADPA Framework.

## Prerequisites

- Azure Active Directory admin access
- SharePoint Online subscription
- ADPA Framework deployed and running

## Step-by-Step Setup

### 1. Register Application in Azure Portal

1. **Navigate to Azure Portal**
   - Go to [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Azure AD admin account

2. **Access App Registrations**
   - In the left navigation, click "Azure Active Directory"
   - Click "App registrations" in the left menu
   - Click "New registration"

3. **Configure Application Registration**
   - **Name**: Enter "ADPA SharePoint Integration" (or your preferred name)
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: Leave blank for now (we're using client credentials flow)
   - Click "Register"

4. **Note Important IDs**
   - After registration, you'll see the app overview page
   - **Copy and save these values**:
     - Application (client) ID
     - Directory (tenant) ID

### 2. Configure API Permissions

1. **Navigate to API Permissions**
   - In your app registration, click "API permissions" in the left menu
   - Click "Add a permission"

2. **Add Microsoft Graph Permissions**
   - Click "Microsoft Graph"
   - Click "Application permissions" (not Delegated permissions)
   - Search for and add these permissions:
     - `Sites.Read.All` - Read items in all site collections
     - `Sites.ReadWrite.All` - Read and write items in all site collections
     - `Files.Read.All` - Read files in all site collections
     - `Files.ReadWrite.All` - Read and write files in all site collections
     - `User.Read.All` - Read all users' full profiles

3. **Grant Admin Consent**
   - After adding all permissions, click "Grant admin consent for [Your Organization]"
   - Click "Yes" to confirm
   - Verify all permissions show "Granted for [Your Organization]" with green checkmarks

### 3. Create Client Secret

1. **Navigate to Certificates & Secrets**
   - In your app registration, click "Certificates & secrets" in the left menu
   - Click "New client secret"

2. **Configure Secret**
   - **Description**: Enter "ADPA Integration Secret"
   - **Expires**: Choose "24 months" (recommended) or "Custom" for longer duration
   - Click "Add"

3. **Copy Secret Value**
   - **IMPORTANT**: Copy the secret value immediately after creation
   - This value will not be shown again
   - Store it securely - you'll need it for ADPA configuration

### 4. Configure ADPA Integration

1. **Access ADPA Integrations**
   - Log into your ADPA Framework
   - Navigate to Integrations → SharePoint tab

2. **Enter Configuration Values**
   - **Tenant ID**: Paste the Directory (tenant) ID from step 1
   - **Client ID**: Paste the Application (client) ID from step 1
   - **Client Secret**: Paste the secret value from step 3

3. **Test Connection**
   - Click "Test Connection" to verify the setup
   - You should see "SharePoint connection successful! ✅"

### 5. Configure Sync Settings

1. **Enable Synchronization**
   - Toggle "Enable Synchronization" to ON
   - Configure "Auto Sync" if desired (recommended for production)
   - Set sync interval (default: 60 minutes)

2. **Save Configuration**
   - Click "Save Configuration"
   - The integration should now show as "Connected" in the overview

## Testing Your Integration

### 1. Basic Connection Test
```bash
# The test connection should succeed and show:
✅ SharePoint connection successful!
```

### 2. Site Access Test
1. Navigate to Integrations → SharePoint → Advanced Settings
2. Click "Sites" tab to view accessible SharePoint sites
3. You should see your organization's SharePoint sites listed

### 3. Document Sync Test
1. In the SharePoint integration, click "Start Sync"
2. Monitor the sync progress and results
3. Check that documents appear in ADPA with SharePoint metadata

## Troubleshooting

### Common Issues

#### 1. "Authentication failed" Error
**Cause**: Incorrect Tenant ID, Client ID, or Client Secret
**Solution**: 
- Verify all IDs are copied correctly
- Ensure no extra spaces or characters
- Check that the client secret hasn't expired

#### 2. "Insufficient privileges" Error
**Cause**: Missing API permissions or admin consent not granted
**Solution**:
- Verify all required permissions are added
- Ensure admin consent is granted (green checkmarks)
- Wait 5-10 minutes for permissions to propagate

#### 3. "Access denied to SharePoint sites" Error
**Cause**: App doesn't have access to specific SharePoint sites
**Solution**:
- Verify Sites.Read.All and Sites.ReadWrite.All permissions
- Check SharePoint admin center for any additional restrictions
- Ensure the app registration is in the same tenant as SharePoint

#### 4. "Client secret expired" Error
**Cause**: The client secret has expired
**Solution**:
- Create a new client secret in Azure Portal
- Update the ADPA configuration with the new secret
- Consider setting longer expiration periods

### Permission Verification

To verify permissions are correctly set:

1. **Check Azure Portal**
   - Go to your app registration → API permissions
   - All permissions should show "Granted for [Organization]"

2. **Test with Graph Explorer**
   - Go to [https://developer.microsoft.com/en-us/graph/graph-explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
   - Try querying: `GET https://graph.microsoft.com/v1.0/sites`
   - Should return your organization's sites

### Logs and Debugging

1. **ADPA Logs**
   - Check server logs for detailed error messages
   - Look for "SharePoint" or "Graph API" related entries

2. **Azure AD Sign-in Logs**
   - In Azure Portal → Azure Active Directory → Sign-in logs
   - Filter by your application name
   - Check for failed authentication attempts

## Security Best Practices

### 1. Client Secret Management
- Store client secrets securely (environment variables, key vault)
- Set appropriate expiration dates
- Rotate secrets regularly
- Never commit secrets to version control

### 2. Principle of Least Privilege
- Only grant necessary permissions
- Regularly review and audit permissions
- Consider using certificate-based authentication for production

### 3. Monitoring and Auditing
- Enable Azure AD audit logs
- Monitor SharePoint access patterns
- Set up alerts for unusual activity

## Production Considerations

### 1. High Availability
- Consider multiple app registrations for redundancy
- Implement proper error handling and retry logic
- Monitor integration health

### 2. Performance
- Configure appropriate sync intervals
- Implement incremental sync where possible
- Monitor API rate limits

### 3. Compliance
- Ensure data handling complies with organizational policies
- Document data flows for compliance audits
- Implement appropriate data retention policies

## Support and Resources

### Microsoft Documentation
- [Azure App Registrations](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [SharePoint REST API](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest)

### ADPA Resources
- [SharePoint Integration Documentation](./SHAREPOINT_INTEGRATION_README.md)
- [API Reference](./API_REFERENCE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Need Help?**
If you encounter issues not covered in this guide, please check the ADPA documentation or contact your system administrator.
