# iTwin Viewer Setup Guide

**Last Updated**: 2026-01-24  
**Status**: Component Created - Packages Need Installation

---

## Overview

The iTwin Viewer has been integrated into ADPA's Digital Twin system, allowing users to view Bentley iTwin iModels directly in the browser. The viewer component is ready, but requires iTwin.js packages to be installed.

---

## Installation

### Step 1: Install iTwin.js Packages

**For Next.js Integration (Current Approach):**
```bash
pnpm add @itwin/viewer-react @itwin/core-frontend @itwin/core-common @itwin/itwinui-react
```

**Required Packages:**
- `@itwin/viewer-react` - React wrapper for iTwin.js viewer
- `@itwin/core-frontend` - Core frontend functionality
- `@itwin/core-common` - Common types and utilities
- `@itwin/itwinui-react` - Bentley React UI components (optional, for Bentley-aligned UI)

**Alternative: Standalone Viewer App (Bentley Template)**
If you prefer to use Bentley's official template as a separate application:
```bash
npx degit iTwin/viewer/packages/templates/web#master your-viewer-app
cd your-viewer-app
npm install
```
This creates a standalone Vite-based viewer app that can be embedded or run separately.

### Step 2: Configure Environment Variables

Add to `.env.local` (supports both Bentley standard and Next.js naming):

**Bentley Standard Naming (recommended for compatibility):**
```env
# Bentley iTwin Authentication (Bentley standard naming)
IMJS_AUTH_CLIENT_CLIENT_ID=your_bentley_client_id
IMJS_AUTH_CLIENT_SCOPES=itwins:read imodels:read
IMJS_AUTH_CLIENT_REDIRECT_URI=http://localhost:3000/signin-callback

# Optional: For initial development/testing
IMJS_ITWIN_ID=your-itwin-id
IMJS_IMODEL_ID=your-imodel-id
```

**Next.js Naming (also supported):**
```env
# Alternative Next.js naming (also works)
NEXT_PUBLIC_ITWIN_CLIENT_ID=your_bentley_client_id
NEXT_PUBLIC_ITWIN_REDIRECT_URI=http://localhost:3000/signin-callback
```

**Note:** The component supports both naming conventions. Bentley standard (`IMJS_*`) is recommended for compatibility with official iTwin.js examples and documentation.

### Step 3: Register Application with Bentley

Follow Bentley's official setup process:

1. Go to [developer.bentley.com](https://developer.bentley.com)
2. Click **Sign In** and sign in with your Bentley account credentials
3. Navigate to the **My Apps** page
4. Click **Register New** button
5. Give your application a **Name**
6. Select **SPA (Single Page Web Application)** as the Application Type
7. Select the **itwin-platform** scope
8. Set the **Redirect URL** to `http://localhost:3000/signin-callback`
9. Set the **Post logout redirect URIs** to `http://localhost:3000`
10. Click **Save**
11. Copy the generated `clientId` and add it to your `.env.local` file

**For Production:**
- Update redirect URIs to your production domain
- Ensure scopes match your application's needs

---

## Component Structure

### Files Created

1. **`components/digital-twin/iTwinViewer.tsx`**
   - Main viewer component with two implementations:
     - `iTwinViewer` - Full iTwin.js integration (requires packages)
     - `iTwinViewerIframe` - Fallback using iframe (works without packages)

2. **`app/projects/[id]/digital-twins/imodel-viewer/page.tsx`**
   - Full-page viewer route
   - Accessible at `/projects/[id]/digital-twins/imodel-viewer?assetId=...&itwinId=...&imodelId=...`

### Integration Points

1. **Digital Twins Page** (`app/projects/[id]/digital-twins/page.tsx`)
   - Added "iModel Viewer" tab
   - Only enabled for iTwin platform assets
   - Automatically fetches asset and extracts iTwin/iModel IDs

2. **Asset Card** (`components/digital-twin/DigitalTwinAssetCard.tsx`)
   - Added "View iModel" option in dropdown menu for iTwin assets
   - Added "iModel" button on card for iTwin assets

---

## Usage

### Viewing an iModel

1. Navigate to a project's Digital Twins page
2. Select an iTwin asset (platform_type = 'iTwin')
3. Click "View iModel" from the asset card dropdown, or
4. Click the "iModel" button on the asset card, or
5. Select the "iModel Viewer" tab

### Storing iTwin/iModel IDs

iTwin and iModel IDs can be stored in the asset in two ways:

**Option 1: Asset Metadata**
```json
{
  "metadata": {
    "itwinId": "your-itwin-id",
    "imodelId": "your-imodel-id"
  }
}
```

**Option 2: Platform Instance URL**
```
platform_instance_url: "https://api.bentley.com/itwins/your-itwin-id/imodels/your-imodel-id"
```

The viewer will automatically extract IDs from either location.

---

## Current Implementation

### Iframe Fallback (Current)

The current implementation uses `iTwinViewerIframe` which:
- ✅ Works immediately without installing packages
- ✅ Uses Bentley's hosted viewer via iframe
- ⚠️ Requires proper authentication setup
- ⚠️ May have limitations compared to embedded viewer

### Full iTwin.js Integration (Future)

Once packages are installed, `iTwinViewer` component will:
- ✅ Full 3D viewer with selection, measurement, clipping
- ✅ Tree view and property grid
- ✅ Custom tools and extensions
- ✅ Better performance and integration

---

## Authentication Flow

The iTwin Viewer uses Bentley's OAuth2 authentication:

1. User clicks "View iModel"
2. Component checks for authentication
3. If not authenticated, redirects to Bentley sign-in
4. After authentication, redirects back to viewer
5. Viewer loads iModel with authenticated session

**Redirect URI Setup:**
- Must match exactly what's configured in Bentley developer portal
- Example: `http://localhost:3000/signin-callback` (dev)
- Example: `https://yourdomain.com/signin-callback` (production)

---

## Troubleshooting

### "iTwin.js packages not installed"

**Solution**: Install the required packages:
```bash
pnpm add @itwin/viewer-react @itwin/core-frontend @itwin/core-common
```

### "iTwin ID and iModel ID are required"

**Solution**: Ensure the asset has iTwin/iModel IDs stored:
- In asset metadata: `metadata.itwinId` and `metadata.imodelId`
- Or in `platform_instance_url` (will be extracted automatically)

### "Authentication failed"

**Solution**: 
- Verify `IMJS_AUTH_CLIENT_CLIENT_ID` (or `NEXT_PUBLIC_ITWIN_CLIENT_ID`) is set correctly
- Verify redirect URI matches Bentley developer portal configuration exactly
- Check that the application is registered with Bentley as **SPA (Single Page Web Application)**
- Ensure **itwin-platform** scope is selected
- Verify redirect URI in `.env.local` matches the one in Bentley developer portal

### Viewer not loading

**Solution**:
- Check browser console for errors
- Verify iTwin/iModel IDs are valid
- Ensure user has access to the iTwin/iModel in Bentley's system
- Try opening in external viewer link first

---

## Next Steps

1. **Install Packages**: Run `pnpm add @itwin/viewer-react @itwin/core-frontend @itwin/core-common @itwin/itwinui-react`

2. **Configure Environment**: Add Bentley client ID and redirect URI to `.env.local`

3. **Register with Bentley**: Complete application registration at developer.bentley.com

4. **Test with Real iModel**: 
   - Create an iTwin asset with valid iTwin/iModel IDs
   - Test the viewer with a real iModel

5. **Customize Viewer** (Optional):
   - Add custom tools
   - Configure viewer settings
   - Add extensions

---

## Bentley Accreditation Program

### Bentley Accredited Developer: iTwin Platform - Associate

Bentley offers an accreditation program that verifies developers have essential skills in Bentley applications. This is valuable for team members working on iTwin integration.

**Program Overview:**
- **Accreditation Level**: Associate
- **Focus**: Basic principles and components of developing software applications using the iTwin Platform
- **Competencies**: Data synchronization and federation, visualization, and querying iTwin data
- **Recognition**: Publicly verifiable digital badge via Credly

**Program Requirements:**
1. Review and complete the **Introduction to the iTwin Platform** course (Available at [developer.bentley.com](https://developer.bentley.com))
2. Pass the assessment quiz

**Assessment Details:**
- **Duration**: 75 minutes
- **Questions**: 50 questions
- **Passing Score**: 74%
- **Attempts**: Maximum 5 attempts
- **Lockout**: 24 hours between failed attempts; after 5 failures, contact Bentley for reset

**Benefits:**
- Professional expertise through project and role-oriented courseware
- Best practices and Bentley-recommended workflows
- Peer recognition and professional networking
- Publicly verifiable digital badge
- Enhanced productivity through proven methodologies

**Getting Started:**
1. Visit [developer.bentley.com](https://developer.bentley.com)
2. Navigate to the **Introduction to the iTwin Platform** course
3. Complete the course content
4. Take the assessment (access via assessment course module)
5. Receive digital badge within 24 hours upon passing

**Contact:**
- Email: `accreditation@bentley.com` or `iTwinDevProgram@bentley.com`
- Subject: "iTwin Developer Accreditation"

**Relevance to ADPA:**
This accreditation program covers key concepts directly relevant to our Digital Twin implementation:
- **Data Synchronization**: Aligns with our event ingestion and state management
- **Federation**: Relevant to our multi-platform connector architecture
- **Visualization**: Directly applicable to our iTwin Viewer component
- **Querying iTwin Data**: Supports our iTwin connector's data fetching capabilities

**Recommended for:**
- Developers working on the iTwin connector (`server/src/services/connectors/iTwinConnector.ts`)
- Frontend developers implementing the iTwin Viewer (`components/digital-twin/iTwinViewer.tsx`)
- Team members responsible for Digital Twin platform integrations
- Anyone seeking to deepen their understanding of Bentley's iTwin Platform

---

## References

- [iTwin.js Documentation](https://www.itwinjs.org/)
- [iTwin Viewer Tutorials](https://www.itwinjs.org/learning/tutorials/)
- [iTwinUI React Components](https://itwinui.bentley.com/docs)
- [Bentley Developer Portal](https://developer.bentley.com)
- [iTwin Viewer Create React App Template](https://www.npmjs.com/package/@itwin/web-viewer)
- [Bentley Accreditation Program](https://developer.bentley.com) - Introduction to the iTwin Platform course

---

## Component API

### iTwinViewer Props

```typescript
interface iTwinViewerProps {
  itwinId?: string;      // Bentley iTwin project ID
  imodelId?: string;     // Bentley iModel ID
  assetId?: string;      // ADPA asset ID (optional)
  assetName?: string;    // Asset name for display (optional)
}
```

### iTwinViewerIframe Props

Same as `iTwinViewer` - uses iframe fallback approach.

---

**Status**: ✅ Component structure complete, ready for package installation and testing
