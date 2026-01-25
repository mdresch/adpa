# Digital Twin Asset Selection Strategy

**Last Updated**: 2026-01-24  
**Decision**: Single Selection (Current) vs Multi-Select  
**Status**: Analysis & Recommendation

---

## Current Implementation: Single Selection

### How It Works
- **One asset selected at a time** via `assetId` URL parameter
- Selection persists in URL: `/projects/{id}/digital-twins?assetId={asset-id}&tab=state`
- Selected asset enables State, Events, and iModel Viewer tabs
- Visual feedback: Selected card shows ring border and checked checkbox

### Current Components
- `DigitalTwinStateViewer` - Takes single `assetId` prop
- `DigitalTwinEventsList` - Takes single `assetId` prop
- `iTwinViewerWrapper` - Takes single `assetId` prop
- All components designed for single asset context

---

## Single Selection: Pros & Cons

### ✅ **Advantages**

1. **Simple URL Structure**
   - Clean URL: `?assetId=abc-123`
   - Easy to share/bookmark
   - Browser back/forward works naturally

2. **Focused User Experience**
   - Clear context: "I'm viewing Asset X"
   - No confusion about which asset's data is shown
   - Simpler mental model

3. **Component Simplicity**
   - Components receive single `assetId`
   - No need to handle multiple assets
   - Easier to implement and maintain

4. **Performance**
   - Load data for one asset at a time
   - Faster initial load
   - Less API calls

5. **iModel Viewer Compatibility**
   - iTwin viewer displays ONE iModel at a time
   - Can't view multiple 3D models simultaneously
   - Matches platform limitations

6. **State/Event Context**
   - State snapshots are asset-specific
   - Events are asset-specific
   - Viewing one asset's state/events is the primary use case

### ❌ **Disadvantages**

1. **No Comparison**
   - Can't compare states across multiple assets
   - Can't view events from multiple assets side-by-side
   - Limited analysis capabilities

2. **No Bulk Operations**
   - Can't select multiple assets for bulk delete
   - Can't sync multiple assets at once
   - Can't apply operations to asset groups

3. **Workflow Limitations**
   - Must select assets one at a time
   - Switching between assets requires multiple clicks
   - No "select all assets of type X" functionality

---

## Multi-Select: Pros & Cons

### ✅ **Advantages**

1. **Comparison Capabilities**
   - Compare states across multiple assets
   - View events from multiple assets in one timeline
   - Cross-asset analysis and correlation

2. **Bulk Operations**
   - Select multiple assets for bulk delete
   - Sync multiple assets simultaneously
   - Apply trigger rules to asset groups
   - Export data for multiple assets

3. **Advanced Workflows**
   - "Select all iTwin assets"
   - "Select assets by type"
   - "Select assets by location"
   - Filter and select groups

4. **Analytics & Reporting**
   - Aggregate metrics across assets
   - Multi-asset dashboards
   - Cross-asset trend analysis

### ❌ **Disadvantages**

1. **Complex URL Structure**
   - Multiple IDs: `?assetIds=abc-123,def-456,ghi-789`
   - URL length limits (browser ~2000 chars)
   - Harder to share/bookmark

2. **Component Complexity**
   - Components must handle multiple `assetId`s
   - Need to aggregate/filter data
   - More complex state management

3. **Performance Impact**
   - Load data for multiple assets
   - More API calls
   - Slower initial load

4. **UI Complexity**
   - How to display multiple assets' states?
   - How to show events from multiple assets?
   - Tab navigation becomes unclear
   - Which asset's iModel to show?

5. **iModel Viewer Limitation**
   - Can only display ONE iModel at a time
   - Multi-select doesn't help for 3D viewing
   - Would need asset switcher within viewer

6. **User Confusion**
   - "Which asset's data am I seeing?"
   - Unclear context when multiple selected
   - More cognitive load

---

## Use Case Analysis

### Use Cases Favoring Single Selection

1. **Viewing Asset State** ✅
   - User wants to see current state of ONE asset
   - State snapshots are asset-specific
   - Most common use case

2. **Viewing Asset Events** ✅
   - User wants to see events for ONE asset
   - Event timeline is asset-specific
   - Most common use case

3. **Viewing iModel** ✅
   - User wants to view ONE 3D model
   - iTwin viewer only supports one model
   - Platform limitation

4. **Asset Details** ✅
   - User wants detailed view of ONE asset
   - Focused, in-depth analysis
   - Clear context

### Use Cases Favoring Multi-Select

1. **Bulk Delete** ⚠️
   - User wants to delete multiple assets
   - Could be handled via separate "bulk actions" UI
   - Doesn't require viewing multiple assets' data

2. **Bulk Sync** ⚠️
   - User wants to sync multiple assets
   - Could be handled via separate "bulk actions" UI
   - Doesn't require viewing multiple assets' data

3. **State Comparison** ⚠️
   - User wants to compare states across assets
   - Would need new "Compare" view/tab
   - Not currently implemented

4. **Cross-Asset Analysis** ⚠️
   - User wants to analyze trends across assets
   - Would need new "Analytics" view/tab
   - Not currently implemented

5. **Multi-Asset Triggers** ⚠️
   - User wants to create triggers for multiple assets
   - Could be handled in trigger rules UI
   - Doesn't require viewing multiple assets' data

---

## Recommendation: **Hybrid Approach**

### Primary: Single Selection (Current)

**Keep single selection as the default** because:
- ✅ Matches primary use cases (view state/events/iModel)
- ✅ Simple, focused UX
- ✅ Works with current component architecture
- ✅ Compatible with iModel viewer limitations
- ✅ Clean URLs, easy sharing

### Secondary: Multi-Select for Bulk Operations

**Add multi-select for specific operations** that don't require viewing data:

1. **Bulk Actions Toolbar**
   - When multiple assets selected, show bulk action buttons
   - Actions: Delete, Sync, Export, Apply Trigger Rule
   - No need to view multiple assets' data

2. **Separate Comparison View** (Future)
   - New "Compare" tab for state/event comparison
   - Only enabled when 2-3 assets selected
   - Dedicated comparison UI

3. **Analytics Dashboard** (Future)
   - New "Analytics" tab for multi-asset analysis
   - Aggregated metrics, trends, correlations
   - Only enabled when multiple assets selected

---

## Implementation Strategy

### Phase 1: Keep Single Selection (Current) ✅

**Status**: Already implemented

- Single `assetId` in URL
- Checkbox for selection
- Visual feedback for selected asset
- Tabs enabled based on selection

### Phase 2: Add Multi-Select for Bulk Operations (Recommended)

**Implementation**:
1. Support multiple `assetId` values in URL: `?assetIds=id1,id2,id3`
2. Update checkbox to allow multiple selections
3. Show bulk action toolbar when multiple selected
4. Keep single selection for viewing (State/Events/iModel tabs)

**URL Format**:
```
# Single selection (current)
?assetId=abc-123&tab=state

# Multi-select (new)
?assetIds=abc-123,def-456,ghi-789&tab=assets
```

**UI Changes**:
- Checkbox allows multiple selections
- Bulk actions toolbar appears when 2+ assets selected
- State/Events/iModel tabs disabled for multi-select
- "Compare" tab enabled when 2-3 assets selected (future)

### Phase 3: Add Comparison View (Future)

**New Tab**: "Compare"
- Enabled when 2-3 assets selected
- Side-by-side state comparison
- Unified event timeline
- State diff visualization

### Phase 4: Add Analytics Dashboard (Future)

**New Tab**: "Analytics"
- Enabled when multiple assets selected
- Aggregated metrics
- Cross-asset trends
- Correlation analysis

---

## Decision Matrix

| Use Case | Single Select | Multi-Select | Recommendation |
|----------|--------------|--------------|----------------|
| View State | ✅ Perfect | ⚠️ Complex | **Single** |
| View Events | ✅ Perfect | ⚠️ Complex | **Single** |
| View iModel | ✅ Required | ❌ Not possible | **Single** |
| Bulk Delete | ⚠️ One at a time | ✅ Efficient | **Multi-Select** |
| Bulk Sync | ⚠️ One at a time | ✅ Efficient | **Multi-Select** |
| State Comparison | ❌ Not possible | ✅ Needed | **Multi-Select** |
| Cross-Asset Analysis | ❌ Not possible | ✅ Needed | **Multi-Select** |
| Apply Trigger Rule | ⚠️ One at a time | ✅ Efficient | **Multi-Select** |

---

## Recommended Approach

### **Hybrid: Single for Viewing, Multi for Actions**

1. **Default Behavior**: Single selection
   - Clicking asset selects it (deselects others)
   - Enables State/Events/iModel tabs
   - Simple, focused UX

2. **Multi-Select Mode**: Toggle or modifier key
   - Hold `Ctrl/Cmd` to select multiple
   - Or toggle "Multi-Select Mode" button
   - Shows bulk actions toolbar
   - Disables viewing tabs (State/Events/iModel)

3. **Bulk Actions Toolbar**:
   - Delete Selected (X assets)
   - Sync Selected (X assets)
   - Export Selected
   - Apply Trigger Rule to Selected
   - Clear Selection

4. **Future Enhancements**:
   - "Compare" tab (2-3 assets)
   - "Analytics" tab (multiple assets)
   - "Select All" / "Select by Type" filters

---

## Implementation Example

### URL Structure

```typescript
// Single selection (current)
?assetId=abc-123&tab=state

// Multi-select (new)
?assetIds=abc-123,def-456&tab=assets&mode=bulk
```

### Component Updates

```typescript
// DigitalTwinAssetsList.tsx
const [selectionMode, setSelectionMode] = useState<'single' | 'multi'>('single');
const selectedAssetIds = searchParams.get('assetIds')?.split(',') || [];

// Show bulk toolbar when multiple selected
{selectedAssetIds.length > 1 && (
  <BulkActionsToolbar 
    assetIds={selectedAssetIds}
    onDelete={() => {/* bulk delete */}}
    onSync={() => {/* bulk sync */}}
  />
)}
```

### Tab Behavior

```typescript
// State/Events/iModel tabs disabled for multi-select
<TabsTrigger 
  value="state" 
  disabled={!assetId || selectedAssetIds.length > 1}
>
  State
</TabsTrigger>

// Compare tab enabled for 2-3 assets
<TabsTrigger 
  value="compare" 
  disabled={selectedAssetIds.length < 2 || selectedAssetIds.length > 3}
>
  Compare
</TabsTrigger>
```

---

## Conclusion

### **Recommended: Hybrid Approach**

1. **Keep single selection as default** ✅
   - Matches primary use cases
   - Simple, focused UX
   - Works with current architecture

2. **Add multi-select for bulk operations** ✅
   - Bulk delete, sync, export
   - Apply trigger rules to groups
   - No need to view multiple assets' data

3. **Future: Add comparison/analytics** ⏳
   - Dedicated views for multi-asset analysis
   - Separate from viewing tabs
   - Clear separation of concerns

### **Why This Works**

- ✅ **Primary use cases** (viewing) stay simple with single selection
- ✅ **Bulk operations** become efficient with multi-select
- ✅ **Future features** (comparison/analytics) have clear path
- ✅ **No breaking changes** to existing components
- ✅ **Progressive enhancement** - add features incrementally

---

## Next Steps

1. **Keep current single selection** ✅ (Already done)
2. **Add multi-select toggle** (Checkbox allows multiple)
3. **Add bulk actions toolbar** (When 2+ selected)
4. **Update URL handling** (Support `assetIds` parameter)
5. **Future: Comparison view** (When 2-3 selected)
6. **Future: Analytics dashboard** (When multiple selected)

---

**Last Updated**: 2026-01-24  
**Status**: Recommendation Complete  
**Decision**: Hybrid Approach - Single for Viewing, Multi for Actions
