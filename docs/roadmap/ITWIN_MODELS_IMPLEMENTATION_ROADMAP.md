# iTwin Models Implementation Roadmap

**Last Updated**: 2026-01-24  
**Status**: Analysis & Roadmap for Converting Generic Assets to True iTwin Models  
**Current State**: All Digital Twin assets are "Generic" platform type

---

## Executive Summary

This roadmap outlines the path to implement and generate **true Bentley iTwin models** in ADPA, converting from the current "Generic" asset approach to fully integrated iTwin Platform assets with 3D visualization, real-time state synchronization, and event-driven document generation.

---

## Current State Analysis

### Existing Assets

**Current Platform Type**: All assets are `platform_type: "Generic"`

**Characteristics**:
- Manually registered via UI (`RegisterAssetDialog`)
- No connection to Bentley iTwin Platform
- No iTwin/iModel IDs
- No real-time synchronization
- No 3D model visualization
- Static metadata only

**Example Current Asset Structure**:
```json
{
  "id": "uuid",
  "name": "HVAC Unit A-1",
  "external_id": "hvac-a1",
  "platform_type": "Generic",
  "platform_instance_url": null,
  "metadata": {},
  "sync_status": "active"
}
```

### What's Missing for True iTwin Models

1. **Bentley iTwin Platform Connection**
   - OAuth2 authentication
   - iTwin Project (iTwin ID)
   - iModel access

2. **Asset Discovery & Synchronization**
   - Automatic discovery of iModel elements
   - Real-time state synchronization
   - Event-driven updates

3. **3D Visualization**
   - iModel Viewer integration (partially implemented)
   - Requires iTwin ID and iModel ID

4. **Metadata Mapping**
   - iTwin element properties → ADPA asset metadata
   - Element hierarchy mapping
   - Property change tracking

---

## What Are True iTwin Models?

### Bentley iTwin Platform Overview

**iTwin Platform** is Bentley's cloud-based infrastructure for creating, managing, and visualizing digital twins of infrastructure assets.

**Key Concepts**:

1. **iTwin (Project)**
   - A container for one or more iModels
   - Represents a digital twin project
   - Has a unique `iTwin ID`

2. **iModel**
   - A 3D model containing infrastructure elements
   - Represents a specific version/snapshot of the infrastructure
   - Has a unique `iModel ID`
   - Contains elements (buildings, equipment, sensors, etc.)

3. **Elements**
   - Individual components within an iModel
   - Have properties (temperature, status, location, etc.)
   - Can be queried and monitored for changes
   - Represent physical assets (HVAC units, sensors, equipment)

4. **Properties**
   - Element attributes (temperature, pressure, status, etc.)
   - Can change over time
   - Trigger events when modified

### True iTwin Model in ADPA Context

A **true iTwin model** in ADPA means:

1. **Connected Asset**
   - `platform_type: "iTwin"`
   - `platform_instance_url` contains iTwin/iModel context
   - `metadata.itwinId` and `metadata.imodelId` populated
   - `external_id` maps to iTwin element ID

2. **Real-Time Synchronization**
   - Connected via `iTwinConnector`
   - Polls iTwin Platform for element changes
   - Emits events when properties change
   - Updates asset state snapshots

3. **3D Visualization**
   - iModel Viewer can display the asset
   - Requires valid iTwin ID and iModel ID
   - Shows asset in 3D context

4. **Event-Driven**
   - Property changes trigger events
   - Events can trigger document generation
   - State snapshots track changes over time

---

## Implementation Roadmap

### Phase 1: Prerequisites & Setup (Week 1)

#### 1.1 Bentley iTwin Platform Account Setup

**Tasks**:
- [ ] Create Bentley iTwin Platform account
- [ ] Register application in Bentley Developer Portal
- [ ] Obtain OAuth2 credentials:
  - `ITWIN_CLIENT_ID`
  - `ITWIN_CLIENT_SECRET`
- [ ] Create iTwin Project (or use existing)
- [ ] Obtain iTwin ID
- [ ] Upload/create iModel in iTwin Project
- [ ] Obtain iModel ID

**Documentation**:
- [Bentley iTwin Platform Developer Portal](https://developer.bentley.com/)
- [iTwin Platform API Documentation](https://developer.bentley.com/apis/itwin-platform/)
- [iTwin.js Documentation](https://www.itwinjs.org/)

**Environment Variables**:
```bash
# server/.env
ITWIN_CLIENT_ID=your_client_id
ITWIN_CLIENT_SECRET=your_client_secret
ITWIN_BASE_URL=https://api.bentley.com
ITWIN_TOKEN_URL=https://ims.bentley.com/connect/token

# Optional: Default iTwin/iModel IDs for testing
ITWIN_DEFAULT_ITWIN_ID=your_itwin_id
ITWIN_DEFAULT_IMODEL_ID=your_imodel_id
```

#### 1.2 Verify iTwin Connector Configuration

**Tasks**:
- [ ] Verify `server/src/config/itwin.config.ts` reads environment variables
- [ ] Test OAuth2 authentication
- [ ] Verify API endpoints are accessible
- [ ] Test connection to iTwin Platform

**Test Script**:
```typescript
// server/scripts/test-itwin-connection.ts
import { getiTwinConfig, validateiTwinConfig } from '../src/config/itwin.config';
import { iTwinConnector } from '../src/services/connectors/iTwinConnector';

async function testConnection() {
  const config = getiTwinConfig();
  if (!validateiTwinConfig(config)) {
    console.error('Invalid iTwin configuration');
    return;
  }
  
  // Create a mock ingestion source for testing
  const mockSource = {
    id: 'test',
    project_id: 'test',
    name: 'Test iTwin Source',
    platform_type: 'iTwin' as const,
    connection_config: config,
    sync_mode: 'polling',
    poll_interval_seconds: 60,
    is_active: true,
  };
  
  const connector = new iTwinConnector(mockSource);
  await connector.connect();
  console.log('✅ Connected to iTwin Platform');
  
  // Test fetching iTwin info
  if (config.itwinId) {
    const info = await connector.fetchiTwinInfo(config.itwinId);
    console.log('✅ iTwin Info:', info);
  }
  
  await connector.disconnect();
}
```

---

### Phase 2: Asset Discovery & Import (Week 2)

#### 2.1 Create iTwin Asset Discovery Service

**Purpose**: Discover iModel elements and create ADPA assets automatically

**New Service**: `server/src/services/itwinAssetDiscoveryService.ts`

**Features**:
- Connect to iTwin Platform
- Fetch iModels for an iTwin project
- Query elements from iModels
- Map elements to ADPA asset structure
- Create/update assets in `digital_twin_assets` table

**Implementation**:

```typescript
// server/src/services/itwinAssetDiscoveryService.ts
import { iTwinConnector } from '../connectors/iTwinConnector';
import { registerAsset, updateAsset } from './digitalTwinAssetService';
import type { DigitalTwinAssetInput } from './digitalTwinAssetService';

interface iTwinElement {
  id: string;
  properties: {
    name?: string;
    type?: string;
    category?: string;
    [key: string]: unknown;
  };
}

interface DiscoveryOptions {
  projectId: string;
  itwinId: string;
  imodelId?: string; // Optional: specific iModel, or discover all
  overwriteExisting?: boolean;
  assetTypeMapping?: Record<string, string>; // Map iTwin element types to ADPA asset types
}

export async function discoveriTwinAssets(
  connector: iTwinConnector,
  options: DiscoveryOptions
): Promise<{ created: number; updated: number; errors: number }> {
  const { projectId, itwinId, imodelId, overwriteExisting = false } = options;
  
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  try {
    // Fetch iModels
    const iModels = imodelId 
      ? [{ id: imodelId }]
      : await connector.fetchiModels(itwinId);
    
    for (const iModel of iModels) {
      const currentImodelId = (iModel.id || iModel.iModelId) as string;
      if (!currentImodelId) continue;
      
      // Fetch elements from iModel
      const elements = await connector.fetchiModelElements(currentImodelId);
      
      for (const element of elements) {
        try {
          const assetInput: DigitalTwinAssetInput = {
            name: element.properties.name || `Element ${element.id}`,
            external_id: element.id,
            platform_type: 'iTwin',
            platform_instance_url: `https://api.bentley.com/itwins/${itwinId}/imodels/${currentImodelId}`,
            description: element.properties.description || null,
            asset_type: mapElementTypeToAssetType(element, options.assetTypeMapping),
            metadata: {
              itwinId,
              imodelId: currentImodelId,
              elementId: element.id,
              elementType: element.properties.type,
              elementCategory: element.properties.category,
              ...element.properties,
            },
          };
          
          // Check if asset exists
          const existing = await findAssetByExternalId(
            projectId,
            element.id,
            'iTwin'
          );
          
          if (existing) {
            if (overwriteExisting) {
              await updateAsset(existing.id, {
                name: assetInput.name,
                description: assetInput.description,
                metadata: assetInput.metadata,
              });
              updated++;
            }
          } else {
            await registerAsset(projectId, assetInput);
            created++;
          }
        } catch (error) {
          console.error(`Failed to process element ${element.id}:`, error);
          errors++;
        }
      }
    }
    
    return { created, updated, errors };
  } catch (error) {
    console.error('Asset discovery failed:', error);
    throw error;
  }
}

function mapElementTypeToAssetType(
  element: iTwinElement,
  mapping?: Record<string, string>
): string | null {
  if (mapping && element.properties.type) {
    return mapping[element.properties.type] || null;
  }
  
  // Default mapping
  const type = element.properties.type?.toLowerCase() || '';
  if (type.includes('hvac')) return 'hvac';
  if (type.includes('sensor')) return 'sensor';
  if (type.includes('equipment')) return 'equipment';
  if (type.includes('building')) return 'building';
  
  return null;
}
```

#### 2.2 Create API Endpoint for Asset Discovery

**New Route**: `POST /api/digital-twin/assets/discover-itwin`

**Implementation**:

```typescript
// server/src/routes/digital-twin-assets.ts (add new route)

/**
 * POST /api/digital-twin/assets/discover-itwin
 * Discover and import assets from Bentley iTwin Platform
 * Body: { projectId, itwinId, imodelId?, ingestionSourceId?, options? }
 */
router.post('/discover-itwin', authenticateToken, requirePermission('projects.manage'), async (req: Request, res: Response) => {
  try {
    const projectId = req.body.projectId;
    const itwinId = req.body.itwinId;
    const imodelId = req.body.imodelId;
    const ingestionSourceId = req.body.ingestionSourceId;
    const options = req.body.options || {};
    
    if (!projectId || !itwinId) {
      return res.status(400).json({ 
        error: 'projectId and itwinId are required' 
      });
    }
    
    // Get or create ingestion source
    let source;
    if (ingestionSourceId) {
      source = await getIngestionSourceById(ingestionSourceId);
    } else {
      // Create temporary ingestion source for discovery
      source = await createIngestionSource({
        project_id: projectId,
        name: `iTwin Discovery - ${itwinId}`,
        platform_type: 'iTwin',
        connection_config: {
          clientId: process.env.ITWIN_CLIENT_ID,
          clientSecret: process.env.ITWIN_CLIENT_SECRET,
          itwinId,
          imodelId,
        },
        sync_mode: 'manual',
        is_active: false,
      });
    }
    
    // Create connector
    const connector = new iTwinConnector(source);
    await connector.connect();
    
    // Discover assets
    const result = await discoveriTwinAssets(connector, {
      projectId,
      itwinId,
      imodelId,
      ...options,
    });
    
    await connector.disconnect();
    
    res.json({
      success: true,
      data: result,
      message: `Discovered ${result.created} new assets, updated ${result.updated} existing assets`,
    });
  } catch (e: any) {
    logger.error('iTwin asset discovery failed', { error: e?.message });
    res.status(500).json({ error: e?.message || 'Failed to discover assets' });
  }
});
```

#### 2.3 Create UI for Asset Discovery

**New Component**: `components/digital-twin/DiscoveriTwinAssetsDialog.tsx`

**Features**:
- Input fields for iTwin ID and iModel ID
- Option to discover all iModels or specific iModel
- Option to overwrite existing assets
- Progress indicator
- Results summary (created/updated/errors)

**UI Flow**:
1. User clicks "Discover iTwin Assets" button
2. Dialog opens with iTwin/iModel ID inputs
3. User enters credentials and clicks "Discover"
4. Progress indicator shows discovery in progress
5. Results summary shows created/updated/errors
6. User can review and import discovered assets

---

### Phase 3: Real-Time Synchronization (Week 3)

#### 3.1 Enhance iTwin Connector for Asset Sync

**Current State**: `iTwinConnector` exists but needs enhancement for:
- Better element querying (use iTwin.js SDK)
- Property change detection
- Asset state snapshot creation

**Enhancements**:

1. **Use iTwin.js SDK for Element Querying**
   - Install: `@itwin/core-backend`, `@itwin/core-common`
   - Use ECSQL queries for element properties
   - More reliable than REST API

2. **Property Change Detection**
   - Track previous state per asset
   - Compare current vs previous
   - Emit events only for actual changes

3. **State Snapshot Creation**
   - When event is emitted, create state snapshot
   - Link snapshot to asset
   - Update `current_state_id` and `current_state_version`

**Implementation**:

```typescript
// Enhanced poll() method in iTwinConnector.ts

private async poll(): Promise<void> {
  try {
    if (!this.config.itwinId) return;
    
    const iModels = await this.fetchiModels(this.config.itwinId);
    
    for (const iModel of iModels) {
      const imodelId = (iModel.id || iModel.iModelId) as string;
      if (!imodelId) continue;
      
      const elements = await this.fetchiModelElements(imodelId);
      
      for (const element of elements) {
        const assetId = element.id;
        const currentState = element.properties;
        const previousState = this.lastPolledAssets.get(assetId);
        
        // Find or create asset in ADPA
        const asset = await findOrCreateAssetFromElement(
          this.source.project_id,
          element,
          imodelId,
          this.config.itwinId
        );
        
        if (previousState) {
          const stateChanged = JSON.stringify(previousState) !== JSON.stringify(currentState);
          if (stateChanged) {
            // Emit event
            await this.emitEvent({
              assetId: asset.id,
              eventType: 'state_change',
              eventPayload: {
                previous_state: previousState,
                current_state: currentState,
                changed_fields: this.detectChangedFields(previousState, currentState),
                imodel_id: imodelId,
              },
              eventSummary: `State changed for ${asset.name}`,
            });
            
            // Create state snapshot
            await createAssetStateSnapshot(asset.id, currentState);
          }
        } else {
          // First discovery - emit creation event
          await this.emitEvent({
            assetId: asset.id,
            eventType: 'creation',
            eventPayload: {
              state: currentState,
              imodel_id: imodelId,
            },
            eventSummary: `Asset ${asset.name} discovered`,
          });
          
          // Create initial state snapshot
          await createAssetStateSnapshot(asset.id, currentState);
        }
        
        this.lastPolledAssets.set(assetId, currentState);
      }
    }
  } catch (error: any) {
    logger.error('iTwin polling failed', { error: error.message });
    // Emit error event
  }
}
```

#### 3.2 Set Up Ingestion Source for Continuous Sync

**Tasks**:
- [ ] Create ingestion source via UI (`DigitalTwinIngestionSourceSetup`)
- [ ] Configure iTwin connection (client ID, secret, iTwin ID)
- [ ] Set polling interval (e.g., 60 seconds)
- [ ] Activate sync
- [ ] Monitor sync status and errors

**UI Flow**:
1. Navigate to Digital Twins → Ingestion tab
2. Click "Create Ingestion Source"
3. Select platform: "iTwin"
4. Enter connection config:
   - Client ID
   - Client Secret
   - iTwin ID
   - iModel ID (optional)
5. Set sync mode: "Polling"
6. Set poll interval: 60 seconds
7. Click "Save and Start Sync"
8. Monitor sync status

---

### Phase 4: Migration Strategy (Week 4)

#### 4.1 Convert Existing Generic Assets to iTwin Assets

**Option A: Manual Mapping**

**Process**:
1. User identifies which Generic assets correspond to iTwin elements
2. User provides iTwin element IDs
3. System updates asset:
   - `platform_type: "Generic"` → `platform_type: "iTwin"`
   - Adds `metadata.itwinId` and `metadata.imodelId`
   - Updates `external_id` to iTwin element ID
   - Updates `platform_instance_url`

**UI Component**: `components/digital-twin/ConvertToiTwinDialog.tsx`

**Features**:
- List of Generic assets
- Input for iTwin element ID
- Input for iTwin ID and iModel ID
- Preview of changes
- Convert button

**Option B: Automatic Discovery & Matching**

**Process**:
1. Run asset discovery (Phase 2)
2. Match discovered iTwin assets to existing Generic assets by:
   - Name similarity
   - External ID pattern
   - Metadata matching
3. Prompt user to confirm matches
4. Merge/convert matched assets

#### 4.2 Migration Script

**Script**: `server/scripts/migrate-generic-to-itwin.ts`

**Features**:
- Batch convert Generic assets to iTwin
- Preserve existing metadata
- Update asset relationships
- Create migration log

---

### Phase 5: Enhanced iModel Viewer Integration (Week 5)

#### 5.1 Auto-Populate iTwin/iModel IDs

**Enhancement**: When asset is iTwin type, automatically extract iTwin/iModel IDs from metadata

**Current Issue**: iModel Viewer requires manual iTwin/iModel ID entry

**Solution**: Extract from asset metadata:
```typescript
// In iTwinViewerWrapper component
const itwinId = asset.metadata?.itwinId || extractFromUrl(asset.platform_instance_url);
const imodelId = asset.metadata?.imodelId || extractFromUrl(asset.platform_instance_url);
```

#### 5.2 Asset Selection in iModel Viewer

**Enhancement**: When viewing iModel, highlight/select the specific asset element

**Implementation**:
- Pass `assetId` (external_id = element ID) to viewer
- Use iTwin.js viewer API to select element
- Zoom to element when asset is selected

---

## Technical Requirements

### Dependencies

**Backend**:
```json
{
  "@itwin/core-backend": "^4.0.0",
  "@itwin/core-common": "^4.0.0",
  "@itwin/core-frontend": "^4.0.0"
}
```

**Frontend** (already installed):
```json
{
  "@itwin/viewer-react": "^4.0.0",
  "@itwin/core-frontend": "^4.0.0",
  "@itwin/core-common": "^4.0.0",
  "@itwin/itwinui-react": "^4.0.0"
}
```

### Environment Variables

**Required**:
- `ITWIN_CLIENT_ID` - OAuth2 client ID
- `ITWIN_CLIENT_SECRET` - OAuth2 client secret

**Optional**:
- `ITWIN_BASE_URL` - API base URL (default: https://api.bentley.com)
- `ITWIN_TOKEN_URL` - Token URL (default: https://ims.bentley.com/connect/token)
- `ITWIN_DEFAULT_ITWIN_ID` - Default iTwin ID for testing
- `ITWIN_DEFAULT_IMODEL_ID` - Default iModel ID for testing

### Database Schema

**No changes required** - existing schema supports iTwin assets:
- `platform_type: "iTwin"` ✅
- `metadata` JSONB for iTwin/iModel IDs ✅
- `platform_instance_url` for iTwin context ✅

---

## Success Criteria

### Phase 1: Prerequisites ✅
- [ ] Bentley iTwin Platform account created
- [ ] OAuth2 credentials obtained
- [ ] iTwin Project created
- [ ] iModel uploaded/created
- [ ] Connection test successful

### Phase 2: Asset Discovery ✅
- [ ] Discovery service implemented
- [ ] API endpoint created
- [ ] UI component for discovery
- [ ] Can discover assets from iTwin Platform
- [ ] Assets created with `platform_type: "iTwin"`

### Phase 3: Real-Time Sync ✅
- [ ] Ingestion source configured
- [ ] Polling working
- [ ] Events emitted on property changes
- [ ] State snapshots created
- [ ] Sync status visible in UI

### Phase 4: Migration ✅
- [ ] Migration script/UI created
- [ ] Generic assets can be converted to iTwin
- [ ] Existing assets migrated (if applicable)

### Phase 5: Enhanced Viewer ✅
- [ ] iModel Viewer auto-populates iTwin/iModel IDs
- [ ] Asset selection works in viewer
- [ ] Viewer shows correct asset

---

## Testing Checklist

### Unit Tests
- [ ] iTwin connector authentication
- [ ] Asset discovery service
- [ ] Element to asset mapping
- [ ] State snapshot creation
- [ ] Event emission

### Integration Tests
- [ ] End-to-end asset discovery
- [ ] Real-time synchronization
- [ ] State snapshot updates
- [ ] Event triggering

### Manual Testing
- [ ] Connect to iTwin Platform
- [ ] Discover assets
- [ ] View assets in iModel Viewer
- [ ] Monitor real-time sync
- [ ] Verify state snapshots
- [ ] Test event-driven document generation

---

## Known Challenges & Solutions

### Challenge 1: iTwin.js SDK Complexity

**Issue**: iTwin.js SDK requires backend setup and ECSQL knowledge

**Solution**: 
- Start with REST API (simpler)
- Gradually migrate to SDK for advanced queries
- Use SDK for element property queries only

### Challenge 2: Element ID Mapping

**Issue**: iTwin element IDs may not match ADPA external IDs

**Solution**:
- Use element ID as external_id
- Store original name in metadata
- Allow manual mapping for existing assets

### Challenge 3: Large iModels

**Issue**: iModels with thousands of elements may be slow to discover

**Solution**:
- Implement pagination
- Filter by element type/category
- Batch processing
- Progress indicators

### Challenge 4: Authentication Token Management

**Issue**: OAuth2 tokens expire

**Solution**:
- Implement token refresh (already in connector)
- Store tokens securely
- Handle token expiration gracefully

---

## Next Steps

1. **Immediate (This Week)**:
   - Set up Bentley iTwin Platform account
   - Obtain OAuth2 credentials
   - Test connection to iTwin Platform

2. **Short Term (Next 2 Weeks)**:
   - Implement asset discovery service
   - Create discovery UI
   - Test with sample iModel

3. **Medium Term (Next Month)**:
   - Set up continuous synchronization
   - Migrate existing Generic assets (if applicable)
   - Enhance iModel Viewer integration

4. **Long Term (Ongoing)**:
   - Optimize sync performance
   - Add advanced element filtering
   - Implement element hierarchy visualization

---

## Related Documentation

- [iTwin Viewer Setup](./ITWIN_VIEWER_SETUP.md) - Frontend viewer configuration
- [Digital Twin Implementation Status](./DIGITAL_TWIN_IMPLEMENTATION_STATUS.md) - Overall implementation
- [Bentley iTwin Learning Resources](./BENTLEY_ITWIN_LEARNING_RESOURCES.md) - Developer accreditation program
- [Digital Twin POC Implementation Plan](../plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md) - Original plan

---

**Last Updated**: 2026-01-24  
**Status**: Roadmap Complete  
**Next Action**: Set up Bentley iTwin Platform account and obtain credentials
