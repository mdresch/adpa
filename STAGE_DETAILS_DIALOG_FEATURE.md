# 🔍 Stage Details Dialog Feature

## Overview
Added a comprehensive stage details dialog that allows users to view in-depth information about each pipeline stage execution, including inputs, outputs, metadata, and errors.

## ✅ Features Implemented

### 🎨 Frontend Enhancement

#### New UI Components
1. **View Button** on each stage card in the "Stage Details" tab
   - Enabled only when stage has executed
   - Disabled for pending/not-yet-run stages
   - Clear eye icon for intuitive interaction

2. **Stage Details Dialog** (full-screen modal)
   - Maximum width: 4xl (large, readable format)
   - Scrollable content for long outputs
   - Professional card-based layout

### 📊 Information Displayed

#### 1. Stage Overview Card
- **Stage ID**: Unique identifier for the stage execution
- **Stage Type**: Type of stage (e.g., ai_generation, quality_assurance)
- **Status**: Current status with color-coded badge
- **Quality Score**: Percentage score (0-100%)
- **Execution Time**: Duration in human-readable format
- **Completed At**: Timestamp of completion

#### 2. Stage Input Card
- **Full Input Data**: JSON view of all input data passed to the stage
- **Scrollable**: Max height of 240px with overflow
- **Formatted**: Pretty-printed JSON with 2-space indentation
- **Monospace Font**: Easy to read technical data

#### 3. Stage Output Card  
- **Full Output Data**: JSON view of all output produced by the stage
- **Scrollable**: Max height of 240px with overflow
- **Formatted**: Pretty-printed JSON
- **Copy to Clipboard**: Quick copy button for developers

#### 4. Stage Metadata Card
- **Execution Metadata**: Additional information about the stage
- **Performance Metrics**: Processing times, iterations, etc.
- **Configuration Used**: Settings applied during execution

#### 5. Error Details Card (if failed)
- **Error Message**: Clear, readable error description
- **Stack Trace**: Full stack trace for debugging
- **Red Highlighting**: Immediately visible error state

### 🔧 Technical Implementation

#### State Management
```typescript
const [selectedStageForDetails, setSelectedStageForDetails] = useState<string | null>(null)
const [stageDetailsDialogOpen, setStageDetailsDialogOpen] = useState(false)
const [selectedStageData, setSelectedStageData] = useState<any>(null)
const [loadingStageDetails, setLoadingStageDetails] = useState(false)
```

#### API Integration
```typescript
const handleViewStageDetails = async (stageId: string) => {
  // Fetch from: GET /api/pipeline/job/:jobId/stage/:stageId
  const response = await fetch(`${API_URL}/pipeline/job/${jobId}/stage/${stageId}`)
  const stageData = await response.json()
  // Display in dialog
}
```

#### View Button
```typescript
<Button 
  size="sm" 
  variant="outline" 
  onClick={() => handleViewStageDetails(stage.id)}
  disabled={!selectedJob || !selectedJob.stages?.find(s => s.id === stage.id)}
>
  <Eye className="h-4 w-4 mr-1" />
  View
</Button>
```

### 📋 Dialog Layout

```
┌────────────────────────────────────────────────────────────────┐
│  📄 Stage Details: AI Generation                               │
│  Comprehensive information about this pipeline stage execution │
│                                                                │
│  ┌─ Stage Overview ──────────────────────────────────────────┐ │
│  │ Stage ID: ai_generation        Status: [completed]        │ │
│  │ Stage Type: ai_generation      Quality: 75.2%             │ │
│  │ Execution Time: 12.5s          Completed: 10/17 6:13 PM   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ Stage Input ↓ ───────────────────────────────────────────┐ │
│  │ {                                                          │ │
│  │   "processed_template": {...},                            │ │
│  │   "context_data": {...},                                  │ │
│  │   "config": {...}                                         │ │
│  │ }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ Stage Output → ──────────────────────────────────────────┐ │
│  │ {                                                          │ │
│  │   "generated_document": {...},                            │ │
│  │   "generation_metadata": {...},                           │ │
│  │   "quality_assessment": {...}                             │ │
│  │ }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─ Stage Metadata ℹ️ ───────────────────────────────────────┐ │
│  │ {                                                          │ │
│  │   "models_used": ["gemini-2.0-flash"],                    │ │
│  │   "refinement_iterations": 0,                             │ │
│  │   "ensemble_generation": false                            │ │
│  │ }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  [Close]                                    [📥 Copy Output]  │
└────────────────────────────────────────────────────────────────┘
```

### 🔍 Use Cases

#### For Developers
1. **Debug Pipeline Issues**: View exact input/output at each stage
2. **Understand Data Flow**: See how data transforms between stages
3. **Identify Bottlenecks**: Check execution times
4. **Inspect Errors**: Full stack traces for failed stages

#### For Business Analysts
1. **Quality Validation**: Check quality scores for each stage
2. **Process Understanding**: See what happens at each step
3. **Compliance Review**: Inspect metadata and processing info

#### For Data Scientists
1. **AI Model Analysis**: See which models were used
2. **Token Usage**: Check tokens consumed
3. **Refinement Tracking**: View iteration history
4. **Quality Metrics**: Analyze assessment results

### 🎯 Benefits

1. **Transparency**: Complete visibility into pipeline execution
2. **Debugging**: Easy troubleshooting with full context
3. **Learning**: Understand how each stage processes data
4. **Quality Control**: Verify outputs meet requirements
5. **Copy-Paste**: Quick access to data for external analysis

### 🚀 How to Use

#### Step 1: Run a Pipeline
1. Navigate to Visual Pipeline page
2. Select template and project
3. Start pipeline
4. Wait for completion

#### Step 2: View Stage Details
1. Click on "Stage Details" tab
2. Find the stage you want to inspect
3. Click **"View"** button on that stage card
4. Dialog opens with comprehensive information

#### Step 3: Inspect Data
- **Scroll through** different sections
- **Expand JSON** to see nested data
- **Copy output** using the button
- **Close** when done

### 📊 Information Available

#### Context Gathering Stage
- Context sources accessed
- Data fetched from each source
- Integration status
- Processing metadata

#### Template Processing Stage
- Variables resolved
- Template structure
- AI enhancements applied
- Quality validation results

#### AI Generation Stage
- **Models used** and their performance
- **Tokens consumed** per section
- **Generated content** structure
- **Refinement iterations** history
- **Quality assessment** results

#### Context Injection Stage
- Injection opportunities identified
- Personalization strategies applied
- Stakeholder-specific content
- Enhancement metadata

#### Quality Assurance Stage
- **Validation results** per check
- **Issues found** and severity
- **Compliance status** per framework
- **Recommendations** for improvement

#### Output Formatting Stage
- **Formats generated** (markdown, PDF, etc.)
- **Conversion metadata**
- **Delivery options** configured
- **Formatting quality** score

### 🔐 Security

- **Authentication Required**: Must be logged in
- **Permission Check**: Respects user permissions
- **Project-Based Access**: Only shows stages for accessible projects
- **No Sensitive Data Exposure**: API keys and secrets filtered

### 🎨 Visual Design

**Color Coding**:
- 🔵 Blue: Information cards
- 🟢 Green: Quality scores
- 🔴 Red: Error cards
- ⚪ Gray: Metadata/technical info

**Icons**:
- 👁️ Eye: View action
- ↓ Arrow Down: Input data
- → Arrow Right: Output data
- ℹ️ Info: Metadata
- ⚠️ Warning: Errors
- 📥 Download: Copy action

### 💡 Future Enhancements

1. **Diff View**: Compare input vs output
2. **Timeline View**: Visualize stage timeline
3. **Export Report**: Download stage report as PDF
4. **Filter Output**: Search within JSON data
5. **Expand/Collapse**: Toggle individual sections
6. **Side-by-Side**: Compare two stages
7. **Performance Graph**: Chart execution time trends

## 📝 Code Locations

### Frontend
- **Component**: `app/process-flow/visual-pipeline/page.tsx`
  - Lines 178-181: State management
  - Lines 264-294: handleViewStageDetails function
  - Lines 982-996: View button with onClick
  - Lines 1185-1369: Stage Details Dialog component

### Backend
- **Route**: `server/src/routes/pipeline.ts`
  - Lines 462-518: GET /job/:jobId/stage/:stageId endpoint

## 🎉 Result

Users can now click **"View"** on any executed stage to see:
- ✅ Complete input/output data
- ✅ Execution metadata
- ✅ Quality scores
- ✅ Error details (if failed)
- ✅ Processing information
- ✅ One-click copy to clipboard

This provides **full transparency** into the pipeline execution process, making debugging, quality control, and process understanding much easier! 🔍📊

