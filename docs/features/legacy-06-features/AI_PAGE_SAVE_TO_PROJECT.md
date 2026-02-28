# AI Page: Save Generated Document to Existing Project

## Overview

**Feature**: Allow users to save AI-generated documents directly to an existing project, instead of always creating a new project.

**Use Case**: Creating Change Requests (or any document) that should be attached to an existing project.

**Status**: 📋 Proposed

---

## Current Behavior (Problem)

When a user generates a document on the AI page:

1. User fills in project details (name, description)
2. User describes what they want to generate
3. AI generates the document
4. **ALWAYS creates a new project** with that document

**The Problem:**
- Change Requests should be attached to **existing** projects, not create new projects
- Users end up with orphaned CR projects
- No way to add documents to existing projects via AI generation

---

## Proposed Solution

### User Flow

1. **User navigates to AI page** (`/ai`)
2. **User selects a template** (e.g., "Change Request")
3. **User describes what they want** (natural language input)
4. **NEW: User chooses destination**:
   - Option A: "Create New Project" (existing behavior)
   - Option B: "Save to Existing Project" (NEW)
5. **If "Save to Existing Project":**
   - Dropdown appears with list of user's projects
   - User selects target project
   - Document is saved to that project's document library
   - No new project created

### UI Changes

#### Before Generation Dialog

```typescript
// Current: Only project creation fields
- Project Name*
- Project Description*

// Proposed: Add destination selector
[ ] Create New Project
    - Project Name*
    - Project Description*

[✓] Save to Existing Project
    - Select Project: [Dropdown]
```

#### Project Dropdown

```typescript
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select project..." />
  </SelectTrigger>
  <SelectContent>
    {projects.map(project => (
      <SelectItem key={project.id} value={project.id}>
        {project.name}
        <span className="text-xs text-gray-500">
          {project.documents_count} docs
        </span>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Implementation Plan

### Frontend Changes (`app/ai/page.tsx`)

#### 1. Add State for Destination Mode

```typescript
const [saveMode, setSaveMode] = useState<'new-project' | 'existing-project'>('new-project')
const [selectedProjectId, setSelectedProjectId] = useState<string>('')
const [projects, setProjects] = useState<Project[]>([])
```

#### 2. Fetch User's Projects

```typescript
useEffect(() => {
  const fetchProjects = async () => {
    try {
      const data = await apiClient.request<Project[]>('/projects')
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }
  
  fetchProjects()
}, [])
```

#### 3. Update Form UI

```tsx
{/* Destination Mode Selector */}
<div className="space-y-4">
  <Label>Save Generated Document To:</Label>
  
  <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as any)}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="new-project" id="new" />
      <Label htmlFor="new" className="font-normal cursor-pointer">
        Create New Project
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="existing-project" id="existing" />
      <Label htmlFor="existing" className="font-normal cursor-pointer">
        Save to Existing Project
      </Label>
    </div>
  </RadioGroup>
  
  {/* Conditional Fields */}
  {saveMode === 'new-project' ? (
    <>
      {/* Existing project name/description fields */}
      <Input name="projectName" placeholder="Project Name" required />
      <Textarea name="projectDescription" placeholder="Description" />
    </>
  ) : (
    <>
      {/* Project Selector */}
      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a project..." />
        </SelectTrigger>
        <SelectContent>
          {projects.map(project => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex flex-col">
                <span>{project.name}</span>
                <span className="text-xs text-gray-500">
                  {project.documents_count || 0} documents
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedProjectId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            Document will be saved to: <strong>{projects.find(p => p.id === selectedProjectId)?.name}</strong>
          </p>
        </div>
      )}
    </>
  )}
</div>
```

#### 4. Update Submit Handler

```typescript
const handleGenerateDocument = async (e: FormEvent) => {
  e.preventDefault()
  
  if (saveMode === 'existing-project' && !selectedProjectId) {
    toast.error('Please select a project')
    return
  }
  
  setGenerating(true)
  
  try {
    // Prepare enhanced prompt with project context
    let enhancedPrompt = userPrompt
    
    if (saveMode === 'existing-project' && selectedProjectId) {
      // Fetch project context to enhance the prompt
      const projectContext = await apiClient.request(`/projects/${selectedProjectId}/context`)
      
      enhancedPrompt = `
PROJECT CONTEXT:
Project: ${projectContext.name}
Description: ${projectContext.description}
Current Status: ${projectContext.status}
Key Documents: ${projectContext.documents.map(d => d.title).join(', ')}
Recent Changes: ${projectContext.recent_changes}

USER REQUEST:
${userPrompt}

Please create a Change Request that considers the project context above and ensures consistency with existing project documentation.
`
    }
    
    // Generate document via AI
    const generatedContent = await apiClient.request('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        template_id: selectedTemplate,
        prompt: enhancedPrompt,
        ai_provider: selectedProvider,
        ai_model: selectedModel,
        project_context: saveMode === 'existing-project' ? selectedProjectId : null
      })
    })
    
    if (saveMode === 'new-project') {
      // Existing flow: Create project with document
      const project = await apiClient.request('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          initial_document: generatedContent
        })
      })
      router.push(`/projects/${project.id}`)
    } else {
      // NEW flow: Save document to existing project
      const document = await apiClient.request(`/projects/${selectedProjectId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          title: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
          content: generatedContent.content,
          template_id: selectedTemplate.id,
          generation_metadata: generatedContent.metadata
        })
      })
      
      toast.success('Document saved to project successfully!')
      router.push(`/projects/${selectedProjectId}?tab=documents`)
    }
  } catch (error: any) {
    toast.error(error?.message || 'Failed to generate document')
  } finally {
    setGenerating(false)
  }
}
```

### Backend Changes

#### 1. Project Context Endpoint

`server/src/routes/projects.ts`:

```typescript
// GET /api/projects/:projectId/context
router.get('/:projectId/context', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params
    const userId = req.user!.id
    
    // Get project details
    const project = await pool.query(
      `SELECT p.*, 
              COUNT(d.id) as documents_count,
              MAX(d.updated_at) as last_document_update
       FROM projects p
       LEFT JOIN documents d ON p.id = d.project_id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [projectId, userId]
    )
    
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    // Get recent documents (last 10)
    const documents = await pool.query(
      `SELECT id, title, template_id, created_at, updated_at
       FROM documents 
       WHERE project_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 10`,
      [projectId]
    )
    
    // Get recent changes (last 5 documents created/updated)
    const recentChanges = await pool.query(
      `SELECT title, created_at, updated_at, 
              CASE WHEN created_at > updated_at - INTERVAL '1 hour' THEN 'created' ELSE 'updated' END as change_type
       FROM documents 
       WHERE project_id = $1 
       ORDER BY GREATEST(created_at, updated_at) DESC 
       LIMIT 5`,
      [projectId]
    )
    
    // Get baseline info if exists
    const baseline = await pool.query(
      `SELECT id, version, status, created_at
       FROM baselines 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [projectId]
    )
    
    const context = {
      id: project.rows[0].id,
      name: project.rows[0].name,
      description: project.rows[0].description,
      status: project.rows[0].status,
      created_at: project.rows[0].created_at,
      documents_count: parseInt(project.rows[0].documents_count),
      last_document_update: project.rows[0].last_document_update,
      documents: documents.rows,
      recent_changes: recentChanges.rows,
      baseline: baseline.rows[0] || null
    }
    
    res.json(context)
  } catch (error) {
    next(error)
  }
})
```

#### 2. Document Creation Endpoint

`server/src/routes/documents.ts`:

```typescript
// POST /api/projects/:projectId/documents
router.post('/:projectId/documents', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params
    const { title, content, template_id, generation_metadata } = req.body
    const userId = req.user!.id
    
    // Verify user has access to project
    const project = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    
    if (project.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    // Create document
    const result = await pool.query(
      `INSERT INTO documents 
       (id, project_id, title, content, template_id, generation_metadata, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        uuidv4(),
        projectId,
        title,
        content,
        template_id,
        JSON.stringify(generation_metadata),
        userId
      ]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})
```

---

## Benefits

### For Users
- ✅ **Intuitive**: Change Requests go to existing projects (where they belong)
- ✅ **Faster**: No need to create dummy projects
- ✅ **Organized**: Documents stay with their projects
- ✅ **Flexible**: Can still create new projects when needed
- ✅ **Context-Aware**: AI generates CRs that consider project history and existing documents
- ✅ **Consistent**: CRs reference actual project documents and baseline
- ✅ **Relevant**: AI understands what's already been done vs. what's new

### For System
- ✅ **Leverages existing infrastructure**: AI generation + templates already work
- ✅ **No orphaned projects**: CRs don't create unnecessary projects
- ✅ **Proper document organization**: Documents in correct project context
- ✅ **Simple implementation**: Minor UI change, one new API endpoint
- ✅ **Enhanced AI Quality**: Context makes AI responses much more accurate
- ✅ **Reduced Conflicts**: AI avoids suggesting changes that conflict with existing docs

### Enhanced Context Benefits

When user selects an existing project, the AI receives:

```typescript
PROJECT CONTEXT:
Project: ADPA Platform Development
Description: Enterprise document processing platform with AI-powered generation
Current Status: In Development
Key Documents: Project Charter, Requirements Analysis, Scope Management Plan, Cost Management Plan, User Personas
Recent Changes: 
- Updated Requirements Analysis (2 days ago)
- Created User Personas (1 week ago)
- Modified Scope Management Plan (3 days ago)

Baseline: Version 1.0 (Approved, 1 week ago)

USER REQUEST:
I want to add a new feature for automated change request generation from baseline drift detection.

Please create a Change Request that considers the project context above and ensures consistency with existing project documentation.
```

**Result**: AI generates a CR that:
- References existing documents appropriately
- Considers the current project status
- Builds on recent changes
- Aligns with the approved baseline
- Uses consistent terminology from the project

---

## Edge Cases

### 1. User has no projects
- Show message: "You don't have any projects yet. Please create a new project first."
- Disable "Save to Existing Project" option

### 2. Project is archived
- Don't show archived projects in dropdown
- OR: Show with (Archived) label and prevent selection

### 3. User lacks permissions
- Only show projects user has write access to
- Backend validates permissions before saving

### 4. Document title conflict
- Auto-append timestamp to title
- Format: `{Template Name} - {Date}`
- Example: `Change Request - 20/10/2025`

---

## Testing Checklist

- [ ] User can select "Save to Existing Project"
- [ ] Project dropdown shows all user's projects
- [ ] Selecting a project shows confirmation message
- [ ] Generated document saves to correct project
- [ ] Document appears in project's document library
- [ ] No new project is created
- [ ] User is redirected to project page (Documents tab)
- [ ] Toast notification confirms success
- [ ] Error handling for missing project selection
- [ ] Error handling for invalid project ID
- [ ] Backend validates user has project access
- [ ] Works with all document templates (not just CR)

---

## Future Enhancements

### Phase 2: Document Type Tagging
- Automatically tag Change Requests for special handling
- Enable version control for CRs
- Track CR approval status
- Link CRs to affected documents (cascading updates)

### Phase 3: Quick Actions
- "Create CR for this project" button on project page
- Pre-fills project context
- Links to relevant documents automatically

---

## Related Features

- **Document Version Control**: Track changes to CRs
- **Cascading Updates**: Update affected documents when CR approved
- **Baseline Drift Detection**: Compare CRs against project baseline

---

## Conclusion

This is a **much better solution** than automated CR generation from drift detection:

- **Simpler**: Uses existing infrastructure
- **More intuitive**: Users understand the flow
- **More flexible**: Works for any document type
- **Better UX**: Documents go where they should

**Recommendation**: Implement this FIRST before any drift detection features.


## Overview

**Feature**: Allow users to save AI-generated documents directly to an existing project, instead of always creating a new project.

**Use Case**: Creating Change Requests (or any document) that should be attached to an existing project.

**Status**: 📋 Proposed

---

## Current Behavior (Problem)

When a user generates a document on the AI page:

1. User fills in project details (name, description)
2. User describes what they want to generate
3. AI generates the document
4. **ALWAYS creates a new project** with that document

**The Problem:**
- Change Requests should be attached to **existing** projects, not create new projects
- Users end up with orphaned CR projects
- No way to add documents to existing projects via AI generation

---

## Proposed Solution

### User Flow

1. **User navigates to AI page** (`/ai`)
2. **User selects a template** (e.g., "Change Request")
3. **User describes what they want** (natural language input)
4. **NEW: User chooses destination**:
   - Option A: "Create New Project" (existing behavior)
   - Option B: "Save to Existing Project" (NEW)
5. **If "Save to Existing Project":**
   - Dropdown appears with list of user's projects
   - User selects target project
   - Document is saved to that project's document library
   - No new project created

### UI Changes

#### Before Generation Dialog

```typescript
// Current: Only project creation fields
- Project Name*
- Project Description*

// Proposed: Add destination selector
[ ] Create New Project
    - Project Name*
    - Project Description*

[✓] Save to Existing Project
    - Select Project: [Dropdown]
```

#### Project Dropdown

```typescript
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select project..." />
  </SelectTrigger>
  <SelectContent>
    {projects.map(project => (
      <SelectItem key={project.id} value={project.id}>
        {project.name}
        <span className="text-xs text-gray-500">
          {project.documents_count} docs
        </span>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Implementation Plan

### Frontend Changes (`app/ai/page.tsx`)

#### 1. Add State for Destination Mode

```typescript
const [saveMode, setSaveMode] = useState<'new-project' | 'existing-project'>('new-project')
const [selectedProjectId, setSelectedProjectId] = useState<string>('')
const [projects, setProjects] = useState<Project[]>([])
```

#### 2. Fetch User's Projects

```typescript
useEffect(() => {
  const fetchProjects = async () => {
    try {
      const data = await apiClient.request<Project[]>('/projects')
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }
  
  fetchProjects()
}, [])
```

#### 3. Update Form UI

```tsx
{/* Destination Mode Selector */}
<div className="space-y-4">
  <Label>Save Generated Document To:</Label>
  
  <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as any)}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="new-project" id="new" />
      <Label htmlFor="new" className="font-normal cursor-pointer">
        Create New Project
      </Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="existing-project" id="existing" />
      <Label htmlFor="existing" className="font-normal cursor-pointer">
        Save to Existing Project
      </Label>
    </div>
  </RadioGroup>
  
  {/* Conditional Fields */}
  {saveMode === 'new-project' ? (
    <>
      {/* Existing project name/description fields */}
      <Input name="projectName" placeholder="Project Name" required />
      <Textarea name="projectDescription" placeholder="Description" />
    </>
  ) : (
    <>
      {/* Project Selector */}
      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
        <SelectTrigger>
          <SelectValue placeholder="Select a project..." />
        </SelectTrigger>
        <SelectContent>
          {projects.map(project => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex flex-col">
                <span>{project.name}</span>
                <span className="text-xs text-gray-500">
                  {project.documents_count || 0} documents
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedProjectId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            Document will be saved to: <strong>{projects.find(p => p.id === selectedProjectId)?.name}</strong>
          </p>
        </div>
      )}
    </>
  )}
</div>
```

#### 4. Update Submit Handler

```typescript
const handleGenerateDocument = async (e: FormEvent) => {
  e.preventDefault()
  
  if (saveMode === 'existing-project' && !selectedProjectId) {
    toast.error('Please select a project')
    return
  }
  
  setGenerating(true)
  
  try {
    // Prepare enhanced prompt with project context
    let enhancedPrompt = userPrompt
    
    if (saveMode === 'existing-project' && selectedProjectId) {
      // Fetch project context to enhance the prompt
      const projectContext = await apiClient.request(`/projects/${selectedProjectId}/context`)
      
      enhancedPrompt = `
PROJECT CONTEXT:
Project: ${projectContext.name}
Description: ${projectContext.description}
Current Status: ${projectContext.status}
Key Documents: ${projectContext.documents.map(d => d.title).join(', ')}
Recent Changes: ${projectContext.recent_changes}

USER REQUEST:
${userPrompt}

Please create a Change Request that considers the project context above and ensures consistency with existing project documentation.
`
    }
    
    // Generate document via AI
    const generatedContent = await apiClient.request('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        template_id: selectedTemplate,
        prompt: enhancedPrompt,
        ai_provider: selectedProvider,
        ai_model: selectedModel,
        project_context: saveMode === 'existing-project' ? selectedProjectId : null
      })
    })
    
    if (saveMode === 'new-project') {
      // Existing flow: Create project with document
      const project = await apiClient.request('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          description: projectDescription,
          initial_document: generatedContent
        })
      })
      router.push(`/projects/${project.id}`)
    } else {
      // NEW flow: Save document to existing project
      const document = await apiClient.request(`/projects/${selectedProjectId}/documents`, {
        method: 'POST',
        body: JSON.stringify({
          title: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
          content: generatedContent.content,
          template_id: selectedTemplate.id,
          generation_metadata: generatedContent.metadata
        })
      })
      
      toast.success('Document saved to project successfully!')
      router.push(`/projects/${selectedProjectId}?tab=documents`)
    }
  } catch (error: any) {
    toast.error(error?.message || 'Failed to generate document')
  } finally {
    setGenerating(false)
  }
}
```

### Backend Changes

#### 1. Project Context Endpoint

`server/src/routes/projects.ts`:

```typescript
// GET /api/projects/:projectId/context
router.get('/:projectId/context', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params
    const userId = req.user!.id
    
    // Get project details
    const project = await pool.query(
      `SELECT p.*, 
              COUNT(d.id) as documents_count,
              MAX(d.updated_at) as last_document_update
       FROM projects p
       LEFT JOIN documents d ON p.id = d.project_id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [projectId, userId]
    )
    
    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }
    
    // Get recent documents (last 10)
    const documents = await pool.query(
      `SELECT id, title, template_id, created_at, updated_at
       FROM documents 
       WHERE project_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 10`,
      [projectId]
    )
    
    // Get recent changes (last 5 documents created/updated)
    const recentChanges = await pool.query(
      `SELECT title, created_at, updated_at, 
              CASE WHEN created_at > updated_at - INTERVAL '1 hour' THEN 'created' ELSE 'updated' END as change_type
       FROM documents 
       WHERE project_id = $1 
       ORDER BY GREATEST(created_at, updated_at) DESC 
       LIMIT 5`,
      [projectId]
    )
    
    // Get baseline info if exists
    const baseline = await pool.query(
      `SELECT id, version, status, created_at
       FROM baselines 
       WHERE project_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [projectId]
    )
    
    const context = {
      id: project.rows[0].id,
      name: project.rows[0].name,
      description: project.rows[0].description,
      status: project.rows[0].status,
      created_at: project.rows[0].created_at,
      documents_count: parseInt(project.rows[0].documents_count),
      last_document_update: project.rows[0].last_document_update,
      documents: documents.rows,
      recent_changes: recentChanges.rows,
      baseline: baseline.rows[0] || null
    }
    
    res.json(context)
  } catch (error) {
    next(error)
  }
})
```

#### 2. Document Creation Endpoint

`server/src/routes/documents.ts`:

```typescript
// POST /api/projects/:projectId/documents
router.post('/:projectId/documents', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params
    const { title, content, template_id, generation_metadata } = req.body
    const userId = req.user!.id
    
    // Verify user has access to project
    const project = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    )
    
    if (project.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    // Create document
    const result = await pool.query(
      `INSERT INTO documents 
       (id, project_id, title, content, template_id, generation_metadata, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        uuidv4(),
        projectId,
        title,
        content,
        template_id,
        JSON.stringify(generation_metadata),
        userId
      ]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})
```

---

## Benefits

### For Users
- ✅ **Intuitive**: Change Requests go to existing projects (where they belong)
- ✅ **Faster**: No need to create dummy projects
- ✅ **Organized**: Documents stay with their projects
- ✅ **Flexible**: Can still create new projects when needed
- ✅ **Context-Aware**: AI generates CRs that consider project history and existing documents
- ✅ **Consistent**: CRs reference actual project documents and baseline
- ✅ **Relevant**: AI understands what's already been done vs. what's new

### For System
- ✅ **Leverages existing infrastructure**: AI generation + templates already work
- ✅ **No orphaned projects**: CRs don't create unnecessary projects
- ✅ **Proper document organization**: Documents in correct project context
- ✅ **Simple implementation**: Minor UI change, one new API endpoint
- ✅ **Enhanced AI Quality**: Context makes AI responses much more accurate
- ✅ **Reduced Conflicts**: AI avoids suggesting changes that conflict with existing docs

### Enhanced Context Benefits

When user selects an existing project, the AI receives:

```typescript
PROJECT CONTEXT:
Project: ADPA Platform Development
Description: Enterprise document processing platform with AI-powered generation
Current Status: In Development
Key Documents: Project Charter, Requirements Analysis, Scope Management Plan, Cost Management Plan, User Personas
Recent Changes: 
- Updated Requirements Analysis (2 days ago)
- Created User Personas (1 week ago)
- Modified Scope Management Plan (3 days ago)

Baseline: Version 1.0 (Approved, 1 week ago)

USER REQUEST:
I want to add a new feature for automated change request generation from baseline drift detection.

Please create a Change Request that considers the project context above and ensures consistency with existing project documentation.
```

**Result**: AI generates a CR that:
- References existing documents appropriately
- Considers the current project status
- Builds on recent changes
- Aligns with the approved baseline
- Uses consistent terminology from the project

---

## Edge Cases

### 1. User has no projects
- Show message: "You don't have any projects yet. Please create a new project first."
- Disable "Save to Existing Project" option

### 2. Project is archived
- Don't show archived projects in dropdown
- OR: Show with (Archived) label and prevent selection

### 3. User lacks permissions
- Only show projects user has write access to
- Backend validates permissions before saving

### 4. Document title conflict
- Auto-append timestamp to title
- Format: `{Template Name} - {Date}`
- Example: `Change Request - 20/10/2025`

---

## Testing Checklist

- [ ] User can select "Save to Existing Project"
- [ ] Project dropdown shows all user's projects
- [ ] Selecting a project shows confirmation message
- [ ] Generated document saves to correct project
- [ ] Document appears in project's document library
- [ ] No new project is created
- [ ] User is redirected to project page (Documents tab)
- [ ] Toast notification confirms success
- [ ] Error handling for missing project selection
- [ ] Error handling for invalid project ID
- [ ] Backend validates user has project access
- [ ] Works with all document templates (not just CR)

---

## Future Enhancements

### Phase 2: Document Type Tagging
- Automatically tag Change Requests for special handling
- Enable version control for CRs
- Track CR approval status
- Link CRs to affected documents (cascading updates)

### Phase 3: Quick Actions
- "Create CR for this project" button on project page
- Pre-fills project context
- Links to relevant documents automatically

---

## Related Features

- **Document Version Control**: Track changes to CRs
- **Cascading Updates**: Update affected documents when CR approved
- **Baseline Drift Detection**: Compare CRs against project baseline

---

## Conclusion

This is a **much better solution** than automated CR generation from drift detection:

- **Simpler**: Uses existing infrastructure
- **More intuitive**: Users understand the flow
- **More flexible**: Works for any document type
- **Better UX**: Documents go where they should

**Recommendation**: Implement this FIRST before any drift detection features.

