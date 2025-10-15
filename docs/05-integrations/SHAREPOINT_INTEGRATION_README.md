# SharePoint Integration Implementation

This document outlines the complete implementation of SharePoint integration for the ADPA Framework, following the roadmap specifications.

## 🎯 Implementation Overview

The SharePoint integration provides comprehensive document management capabilities including:

- **Microsoft Graph API Integration** for SharePoint and OneDrive access
- **Document Library Synchronization** with permission mapping
- **File Upload/Download** capabilities
- **Permission Synchronization** between SharePoint and ADPA
- **OneDrive Integration** for personal file management
- **Real-time Search** across SharePoint content

## 📁 Files Created/Modified

### Backend Services

1. **`server/src/integrations/sharepoint.ts`** - Microsoft Graph API client
   - Handles authentication with Microsoft Graph API
   - Provides methods for sites, drives, files, and permissions
   - Supports both SharePoint and OneDrive operations
   - Implements resumable upload for large files

2. **`server/src/services/sharepointService.ts`** - Main SharePoint service
   - High-level service layer for SharePoint operations
   - Document synchronization logic
   - File type detection and content extraction
   - Integration with ADPA database

3. **`server/src/routes/sharepointRoutes.ts`** - SharePoint API routes
   - RESTful endpoints for SharePoint operations
   - Authentication and permission checks
   - File upload/download endpoints
   - Search and sync operations

4. **`server/src/database/migrations/add_sharepoint_fields.sql`** - Database schema updates
   - Adds SharePoint-specific fields to documents table
   - Creates necessary indexes for performance
   - Adds sync tracking fields to integrations table

### Frontend Components

1. **`app/integrations/sharepoint/page.tsx`** - Main SharePoint integration page
   - Configuration management interface
   - Site and drive browsing
   - Document synchronization controls
   - Search and import functionality

2. **`app/integrations/sharepoint/components/FileCard.tsx`** - File display component
   - File information display with icons
   - Import and download actions
   - File type detection and formatting

3. **`app/integrations/sharepoint/components/SiteCard.tsx`** - Site display component
   - SharePoint site information
   - Site selection and navigation
   - External link to SharePoint

4. **`app/integrations/sharepoint/components/DriveCard.tsx`** - Drive display component
   - Document library information
   - Storage quota visualization
   - Drive selection and file browsing

## 🔧 Configuration Requirements

### Microsoft Azure App Registration

To use the SharePoint integration, you need to register an application in Azure:

1. **Register Application**:
   - Go to Azure Portal > App Registrations
   - Create new registration
   - Note the Application (client) ID and Directory (tenant) ID

2. **Configure API Permissions**:
   ```
   Microsoft Graph API Permissions:
   - Sites.Read.All (Application)
   - Sites.ReadWrite.All (Application)
   - Files.Read.All (Application)
   - Files.ReadWrite.All (Application)
   - User.Read.All (Application)
   ```

3. **Create Client Secret**:
   - Go to Certificates & secrets
   - Create new client secret
   - Copy the secret value

4. **Grant Admin Consent**:
   - Grant admin consent for the organization

### Environment Variables

Add to your `.env` file:

```env
# SharePoint Integration
SHAREPOINT_TENANT_ID=your-tenant-id
SHAREPOINT_CLIENT_ID=your-client-id
SHAREPOINT_CLIENT_SECRET=your-client-secret
```

## 🚀 API Endpoints

### Authentication & Configuration

- `POST /api/integrations/sharepoint/test` - Test connection
- `GET /api/integrations/sharepoint/:id/sites` - Get SharePoint sites
- `GET /api/integrations/sharepoint/:id/sites/:siteId/drives` - Get document libraries

### Document Operations

- `GET /api/integrations/sharepoint/:id/drives/:driveId/files` - Get files from library
- `POST /api/integrations/sharepoint/:id/drives/:driveId/upload` - Upload file
- `GET /api/integrations/sharepoint/:id/search` - Search files
- `POST /api/integrations/sharepoint/:id/sync` - Sync documents

### OneDrive Operations

- `GET /api/integrations/sharepoint/:id/onedrive` - Get user's OneDrive
- `GET /api/integrations/sharepoint/:id/onedrive/files` - Get OneDrive files

## 🔄 Synchronization Process

The synchronization process follows these steps:

1. **Site Discovery**: Retrieve accessible SharePoint sites
2. **Drive Enumeration**: Get document libraries for each site
3. **File Processing**: 
   - Download file metadata
   - Extract content for supported file types
   - Retrieve permission information
   - Store in ADPA database
4. **Incremental Updates**: Only sync modified files
5. **Error Handling**: Log and report sync errors

### Supported File Types

The integration supports content extraction for:
- Text files (`.txt`, `.md`, `.rtf`)
- JSON and XML files
- CSV files
- Any text-based MIME types

Other file types are stored as references with metadata.

## 🔐 Security Features

### Authentication
- Uses Microsoft Graph API with client credentials flow
- Secure token management with automatic refresh
- Encrypted storage of client secrets

### Permissions
- Respects SharePoint permissions
- Maps SharePoint users to ADPA users where possible
- Maintains audit trail of all operations

### Data Protection
- Files stored securely in ADPA database
- Optional content encryption
- Compliance with data retention policies

## 📊 Database Schema Changes

The integration adds the following fields to the `documents` table:

```sql
-- SharePoint integration fields
sharepoint_file_id VARCHAR(255)     -- SharePoint file ID
sharepoint_drive_id VARCHAR(255)    -- SharePoint drive ID  
sharepoint_site_id VARCHAR(255)     -- SharePoint site ID
file_size BIGINT                     -- File size in bytes
mime_type VARCHAR(255)               -- MIME type
web_url TEXT                         -- SharePoint web URL

-- Sync tracking fields (integrations table)
last_sync TIMESTAMP                  -- Last sync timestamp
sync_status VARCHAR(50)              -- Sync status
```

## 🎨 Frontend Features

### Configuration Tab
- Tenant ID, Client ID, and Client Secret configuration
- Connection testing
- Sync settings (enabled, auto-sync, interval)

### Sites Tab
- Browse available SharePoint sites
- Site selection for targeted operations
- Direct links to SharePoint

### Document Libraries Tab
- View document libraries for selected sites
- Storage quota visualization
- File browsing within libraries

### Search & Import Tab
- Full-text search across SharePoint
- Site-specific search filtering
- Individual file import functionality

## 🔧 Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd server
   npm install @azure/msal-node
   ```

2. **Run Database Migration**:
   ```bash
   npm run migrate
   ```

3. **Configure Integration**:
   - Navigate to `/integrations/sharepoint`
   - Enter Azure app registration details
   - Test connection
   - Save configuration

4. **Start Synchronization**:
   - Use the sync button in the Overview tab
   - Monitor sync progress and status
   - Review imported documents

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Verify tenant ID, client ID, and client secret
   - Ensure API permissions are granted
   - Check admin consent status

2. **Sync Errors**:
   - Review error logs in the sync results
   - Check file permissions in SharePoint
   - Verify network connectivity

3. **Missing Files**:
   - Ensure user has access to SharePoint sites
   - Check if files are in supported locations
   - Verify sync configuration

### Debug Logging

Enable debug logging by setting `LOG_LEVEL=debug` in your environment variables.

## 🚀 Future Enhancements

Planned improvements include:

1. **Real-time Sync**: WebSocket-based real-time updates
2. **Advanced Permissions**: Granular permission mapping
3. **Workflow Integration**: SharePoint workflow triggers
4. **Teams Integration**: Microsoft Teams collaboration features
5. **Advanced Search**: Semantic search capabilities

## 📝 Testing

To test the SharePoint integration:

1. **Unit Tests**: Test individual service methods
2. **Integration Tests**: Test API endpoints
3. **E2E Tests**: Test complete sync workflows
4. **Performance Tests**: Test with large document libraries

## 📚 References

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [SharePoint REST API](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest)
- [Azure App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

---

This implementation provides a robust foundation for SharePoint integration within the ADPA Framework, enabling seamless document management and collaboration across platforms.
