# Hybrid Asset Selection Implementation

**Last Updated**: 2026-01-24  
**Status**: ✅ Implemented - Hybrid Single/Multi-Select for Digital Twin Assets  
**Approach**: Single selection for viewing, Multi-select for bulk operations

---

## Overview

The Digital Twin asset selection system now supports **both single and multi-select modes**:

- **Single Selection (Default)**: One asset at a time for viewing State/Events/iModel
- **Multi-Select Mode**: Multiple assets for bulk operations (delete, sync, export, apply triggers)

---

## Implementation Details

### 1. **URL Structure**

#### Single Selection
```
/projects/{projectId}/digital-twins?assetId={asset-id}&tab=state
```

#### Multi-Select
```
/projects/{projectId}/digital-twins?assetIds={id1},{id2},{id3}&mode=bulk&tab=assets
```

### 2. **Selection Modes**

#### Single Selection Mode (Default)
- **Behavior**: Clicking an asset selects it and deselects others
- **URL Parameter**: `assetId` (single value)
- **Enables**: State, Events, iModel Viewer tabs
- **Use Case**: Viewing asset details, state, events, or iModel

#### Multi-Select Mode
- **Activation**: 
  - Click "Multi-Select" button to toggle mode
  - Or hold `Ctrl/Cmd` while clicking assets
- **URL Parameters**: `assetIds` (comma-separated) + `mode=bulk`
- **Disables**: State, Events, iModel Viewer tabs (viewing not supported)
- **Enables**: Bulk Actions Toolbar
- **Use Case**: Bulk operations on multiple assets

### 3. **User Interactions**

#### Clicking Asset Card
- **Without Ctrl/Cmd**: Single selection (replaces current selection)
- **With Ctrl/Cmd**: Multi-select (adds/removes from selection)
- **In Multi-Select Mode**: Always multi-select behavior

#### Clicking Checkbox
- **Single Mode**: Switches to single selection
- **Multi-Select Mode**: Toggles asset in selection list
- **Auto-switches**: If only one asset selected, switches back to single mode

### 4. **Visual Feedback**

#### Selected Assets
- **Ring Border**: `ring-2 ring-primary shadow-md`
- **Checked Checkbox**: Visual indicator
- **Hover Effect**: Enhanced shadow on hover

#### Multi-Select Mode Indicator
- **Button State**: "Multi-Select" button highlighted when active
- **Description Text**: Shows "Multi-select mode: Hold Ctrl/Cmd to select multiple"
- **Toolbar**: Bulk actions toolbar appears when 2+ assets selected

---

## Components

### 1. **DigitalTwinAssetCard**

**Features**:
- Checkbox for selection
- Click handler with Ctrl/Cmd detection
- Visual feedback for selected state
- Supports both single and multi-select

**Key Logic**:
```typescript
const isMultiSelect = e.ctrlKey || e.metaKey || isMultiSelectMode;

if (isMultiSelect) {
  // Add/remove from selection list
  // Update assetIds parameter
} else {
  // Replace selection (single)
  // Update assetId parameter
}
```

### 2. **DigitalTwinAssetsList**

**Features**:
- Multi-select mode toggle button
- Select All / Deselect All buttons (in multi-select mode)
- Bulk Actions Toolbar (when 2+ assets selected)
- Selection state management

**Key Functions**:
- `toggleMultiSelectMode()` - Switch between single/multi modes
- `handleSelectAll()` - Select all assets
- `handleDeselectAll()` - Clear all selections

### 3. **BulkActionsToolbar**

**Features**:
- Shows selected asset count
- Bulk operations:
  - **Delete Selected** - Soft delete multiple assets
  - **Sync Selected** - Sync multiple assets (coming soon)
  - **Export Selected** - Export data for multiple assets (coming soon)
  - **Apply Trigger Rule** - Navigate to triggers tab with selected assets
  - **Clear Selection** - Deselect all assets

**Visibility**: Only shown when 2+ assets are selected

### 4. **DigitalTwinsPage**

**Updates**:
- Detects multi-select mode from URL
- Disables viewing tabs (State/Events/iModel) when multiple assets selected
- Handles both `assetId` and `assetIds` URL parameters

---

## User Workflows

### Workflow 1: View Single Asset (Default)

1. User clicks on an asset card
2. Asset is selected (URL: `?assetId=abc-123`)
3. State, Events, and iModel Viewer tabs become enabled
4. User can view asset details

### Workflow 2: Bulk Delete Assets

1. User clicks "Multi-Select" button (or holds Ctrl/Cmd)
2. Multi-select mode activated (URL: `?mode=bulk`)
3. User clicks multiple asset cards (or checkboxes)
4. Bulk Actions Toolbar appears (when 2+ selected)
5. User clicks "Delete Selected"
6. Confirmation dialog appears
7. Selected assets are deleted
8. Selection is cleared

### Workflow 3: Apply Trigger Rule to Multiple Assets

1. User activates multi-select mode
2. User selects multiple assets
3. User clicks "Apply Trigger Rule" in Bulk Actions Toolbar
4. Navigates to Triggers tab with selected assets
5. User can create trigger rule for all selected assets

### Workflow 4: Select All Assets

1. User activates multi-select mode
2. User clicks "Select All" button
3. All assets are selected
4. Bulk Actions Toolbar appears
5. User can perform bulk operations on all assets

---

## Keyboard Shortcuts

- **Ctrl/Cmd + Click**: Toggle asset in multi-select mode
- **Click**: Single selection (replaces current selection)

---

## URL Parameter Handling

### Single Selection
```typescript
// Reading
const assetId = searchParams.get("assetId");

// Writing
params.set("assetId", asset.id);
params.delete("assetIds");
params.delete("mode");
```

### Multi-Select
```typescript
// Reading
const assetIds = searchParams.get("assetIds")?.split(",").filter(Boolean) || [];
const isMultiSelect = assetIds.length > 0 || searchParams.get("mode") === "bulk";

// Writing
params.set("assetIds", assetIds.join(","));
params.set("mode", "bulk");
params.delete("assetId");
```

### Auto-Switch Logic
```typescript
// If only one asset in multi-select, switch to single
if (newIds.length === 1) {
  params.delete("assetIds");
  params.delete("mode");
  params.set("assetId", newIds[0]);
}
```

---

## Tab Behavior

### Single Selection
- ✅ **State Tab**: Enabled (shows selected asset's state)
- ✅ **Events Tab**: Enabled (shows selected asset's events)
- ✅ **iModel Viewer Tab**: Enabled if asset is iTwin type
- ✅ **Triggers Tab**: Always enabled
- ✅ **Ingestion Tab**: Always enabled

### Multi-Select
- ❌ **State Tab**: Disabled (can't view multiple states)
- ❌ **Events Tab**: Disabled (can't view multiple event timelines)
- ❌ **iModel Viewer Tab**: Disabled (can only view one iModel)
- ✅ **Triggers Tab**: Enabled (can apply rules to multiple assets)
- ✅ **Ingestion Tab**: Always enabled
- ✅ **Bulk Actions Toolbar**: Visible (when 2+ assets selected)

---

## Future Enhancements

### Phase 1: Comparison View (Future)
- New "Compare" tab
- Enabled when 2-3 assets selected
- Side-by-side state comparison
- Unified event timeline
- State diff visualization

### Phase 2: Analytics Dashboard (Future)
- New "Analytics" tab
- Enabled when multiple assets selected
- Aggregated metrics across assets
- Cross-asset trend analysis
- Correlation analysis

### Phase 3: Advanced Selection (Future)
- "Select by Type" filter
- "Select by Platform" filter
- "Select by Location" filter
- Save selection sets

---

## Testing Checklist

- [x] Single selection works (click asset)
- [x] Multi-select works (Ctrl/Cmd + click)
- [x] Checkbox toggles selection
- [x] Multi-select mode toggle button works
- [x] Select All / Deselect All work
- [x] Bulk Actions Toolbar appears when 2+ selected
- [x] Viewing tabs disabled in multi-select mode
- [x] URL parameters update correctly
- [x] Selection persists in URL
- [x] Auto-switch from multi to single when only one selected
- [ ] Bulk delete works (needs testing)
- [ ] Bulk sync works (when implemented)
- [ ] Bulk export works (when implemented)

---

## Known Limitations

1. **URL Length**: Multi-select with many assets may hit URL length limits (~2000 chars)
   - **Solution**: Consider using session storage for large selections

2. **iModel Viewer**: Can only display one iModel at a time
   - **Solution**: Asset switcher within viewer (future enhancement)

3. **State/Events Viewing**: Not supported for multiple assets
   - **Solution**: Comparison view (future enhancement)

---

## Code Examples

### Checking Selection State
```typescript
const singleAssetId = searchParams.get("assetId");
const multiAssetIds = searchParams.get("assetIds")?.split(",").filter(Boolean) || [];
const isSelected = singleAssetId === asset.id || multiAssetIds.includes(asset.id);
const isMultiSelectMode = multiAssetIds.length > 0 || searchParams.get("mode") === "bulk";
```

### Toggling Selection
```typescript
const handleCardClick = (e: React.MouseEvent) => {
  const isMultiSelect = e.ctrlKey || e.metaKey || isMultiSelectMode;
  
  if (isMultiSelect) {
    // Multi-select: add/remove from list
    const newIds = isSelected 
      ? currentIds.filter(id => id !== asset.id)
      : [...currentIds, asset.id];
    params.set("assetIds", newIds.join(","));
  } else {
    // Single select: replace
    params.set("assetId", asset.id);
  }
};
```

---

## Related Documentation

- [Asset Selection Strategy](../design/ASSET_SELECTION_STRATEGY.md) - Design decision analysis
- [Digital Twin Implementation Status](./DIGITAL_TWIN_IMPLEMENTATION_STATUS.md) - Overall implementation
- [iModel Viewer Setup](./ITWIN_VIEWER_SETUP.md) - iTwin viewer configuration

---

**Last Updated**: 2026-01-24  
**Status**: ✅ Implemented  
**Next Steps**: Test bulk operations and add comparison view (future)
