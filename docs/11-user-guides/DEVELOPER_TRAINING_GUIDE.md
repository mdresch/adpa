# ADPA Developer Training Guide
**For: API Integrators & Software Developers**  
**Duration:** 3 hours  
**Level:** Advanced  
**Version:** 1.0.0  
**Last Updated:** November 4, 2025

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [API Architecture](#api-architecture)
3. [Authentication and Security](#authentication-and-security)
4. [Integration Patterns](#integration-patterns)
5. [Custom Context Sources](#custom-context-sources)
6. [Webhook Event Handling](#webhook-event-handling)
7. [Best Practices](#best-practices)
8. [Sample Integration Project](#sample-integration-project)
9. [Troubleshooting](#troubleshooting)
10. [Developer Certification](#developer-certification)

---

## 1. Introduction

### Purpose of This Guide

This guide is designed for developers who want to:
- Integrate ADPA with external systems via API
- Build custom context sources for document generation
- Handle webhook events from ADPA
- Extend ADPA's functionality through plugins
- Understand ADPA's internal architecture for contributions

### Prerequisites

**Required Knowledge:**
- RESTful API concepts
- HTTP methods and status codes
- JSON data structures
- OAuth 2.0 authentication flow
- Webhook/event-driven architecture

**Recommended Skills:**
- TypeScript or JavaScript
- Node.js development
- Git and version control
- Database concepts (PostgreSQL)

### What You'll Learn

By the end of this training, you will be able to:
1. Authenticate and make API calls to ADPA
2. Implement common integration patterns
3. Create custom context sources
4. Handle webhook events
5. Build a complete integration project
6. Follow API best practices and security guidelines

---

## 2. API Architecture

### Overview

ADPA exposes a RESTful API that allows external systems to:
- Create and manage projects and documents
- Trigger document generation
- Retrieve generated content
- Subscribe to events via webhooks
- Manage templates and context sources

### Base URL

```
Production: https://your-adpa-instance.com/api
Development: http://localhost:5000/api
```

### API Structure

```
/api
├── /auth              # Authentication endpoints
├── /projects          # Project management
├── /documents         # Document CRUD operations
├── /templates         # Template management
├── /generation        # Document generation
├── /context           # Context source management
├── /integrations      # Third-party integrations
├── /webhooks          # Webhook management
└── /health            # Health check endpoint
```

### API Versioning

ADPA uses URL path versioning:

```
/api/v1/projects       # Version 1 (current)
/api/v2/projects       # Version 2 (future)
```

**Current Version:** v1

### Data Formats

**Request Format:**
```http
Content-Type: application/json
```

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2025-11-04T14:23:45Z"
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid project ID",
    "details": { ... }
  },
  "timestamp": "2025-11-04T14:23:45Z"
}
```

---

## 3. Authentication and Security

### Authentication Methods

ADPA supports three authentication methods:

1. **API Keys** (Recommended for server-to-server)
2. **OAuth 2.0** (Recommended for user-facing applications)
3. **Session-based** (For web applications)

### API Key Authentication

#### Generate API Key

1. Log into ADPA
2. Go to **Settings → API Keys**
3. Click **"+ Generate New Key"**
4. Save the key securely (shown only once)

#### Using API Keys

**HTTP Header:**
```http
Authorization: Bearer YOUR_API_KEY
```

**Example Request:**
```bash
curl -X GET https://your-adpa.com/api/v1/projects \
  -H "Authorization: Bearer adpa_key_abc123xyz456" \
  -H "Content-Type: application/json"
```

**JavaScript Example:**
```javascript
const API_KEY = 'adpa_key_abc123xyz456';
const BASE_URL = 'https://your-adpa.com/api/v1';

async function getProjects() {
  const response = await fetch(`${BASE_URL}/projects`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return data;
}
```

### OAuth 2.0 Authentication

#### OAuth Flow

```
1. User clicks "Connect to ADPA" in your app
2. Redirect to ADPA authorization URL
3. User grants permission
4. ADPA redirects back with authorization code
5. Exchange code for access token
6. Use access token for API calls
```

#### Step 1: Register Your Application

```
ADPA Settings → Integrations → OAuth Apps → New App

App Details:
Name: Your App Name
Redirect URI: https://yourapp.com/auth/callback
Scopes: 
  - projects:read
  - documents:write
  - templates:read
```

You'll receive:
- **Client ID**: `oauth_client_abc123`
- **Client Secret**: `oauth_secret_xyz789`

#### Step 2: Authorization URL

Direct users to:
```
https://your-adpa.com/oauth/authorize?
  client_id=oauth_client_abc123&
  redirect_uri=https://yourapp.com/auth/callback&
  scope=projects:read documents:write&
  response_type=code&
  state=random_string_for_security
```

#### Step 3: Exchange Code for Token

```javascript
async function exchangeCodeForToken(code) {
  const response = await fetch('https://your-adpa.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: 'oauth_client_abc123',
      client_secret: 'oauth_secret_xyz789',
      code: code,
      redirect_uri: 'https://yourapp.com/auth/callback',
      grant_type: 'authorization_code'
    })
  });
  
  const data = await response.json();
  // {
  //   access_token: "eyJhbG...",
  //   token_type: "Bearer",
  //   expires_in: 3600,
  //   refresh_token: "refresh_token_xyz..."
  // }
  
  return data;
}
```

#### Step 4: Use Access Token

```javascript
async function makeAuthenticatedRequest(accessToken) {
  const response = await fetch('https://your-adpa.com/api/v1/projects', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

#### Step 5: Refresh Token

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://your-adpa.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: 'oauth_client_abc123',
      client_secret: 'oauth_secret_xyz789',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  
  return await response.json();
}
```

### Security Best Practices

✅ **Do:**
- Store API keys and secrets securely (environment variables, secret managers)
- Use HTTPS for all API calls
- Implement rate limiting on your side
- Validate all input data
- Handle errors gracefully
- Rotate API keys periodically

❌ **Don't:**
- Commit API keys to version control
- Expose API keys in client-side code
- Share API keys between environments
- Ignore rate limit responses
- Log sensitive data

---

## 4. Integration Patterns

### Pattern 1: Project Synchronization

**Use Case:** Keep ADPA projects in sync with your project management system.

```javascript
// sync-projects.js
const ADPA_API = 'https://your-adpa.com/api/v1';
const API_KEY = process.env.ADPA_API_KEY;

async function syncProject(externalProject) {
  // Check if project exists in ADPA
  const adpaProject = await findProjectByExternalId(externalProject.id);
  
  if (adpaProject) {
    // Update existing project
    return await updateProject(adpaProject.id, {
      name: externalProject.name,
      description: externalProject.description,
      status: externalProject.status,
      metadata: {
        externalId: externalProject.id,
        lastSyncedAt: new Date().toISOString()
      }
    });
  } else {
    // Create new project
    return await createProject({
      name: externalProject.name,
      description: externalProject.description,
      status: externalProject.status,
      metadata: {
        externalId: externalProject.id,
        createdFrom: 'external_system',
        lastSyncedAt: new Date().toISOString()
      }
    });
  }
}

async function createProject(projectData) {
  const response = await fetch(`${ADPA_API}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(projectData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }
  
  return await response.json();
}

async function updateProject(projectId, updates) {
  const response = await fetch(`${ADPA_API}/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update project: ${response.statusText}`);
  }
  
  return await response.json();
}

async function findProjectByExternalId(externalId) {
  const response = await fetch(
    `${ADPA_API}/projects?filter[metadata.externalId]=${externalId}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  return data.data?.length > 0 ? data.data[0] : null;
}

// Usage
const externalProject = {
  id: 'ext-123',
  name: 'Customer Portal Migration',
  description: 'Migrate legacy portal to React',
  status: 'active'
};

syncProject(externalProject)
  .then(result => console.log('Project synced:', result))
  .catch(error => console.error('Sync failed:', error));
```

### Pattern 2: Automated Document Generation

**Use Case:** Automatically generate status reports when project status changes.

```javascript
// auto-generate-report.js
const ADPA_API = 'https://your-adpa.com/api/v1';
const API_KEY = process.env.ADPA_API_KEY;

async function generateStatusReport(projectId, reportingPeriod) {
  // 1. Get template
  const template = await getTemplateByName('Project Status Report');
  
  // 2. Gather context
  const context = await gatherReportContext(projectId, reportingPeriod);
  
  // 3. Trigger generation
  const generationJob = await triggerDocumentGeneration({
    projectId: projectId,
    templateId: template.id,
    documentName: `Status Report - ${reportingPeriod.start}`,
    context: context,
    customInstructions: `Focus on the ${reportingPeriod.milestone} milestone.`
  });
  
  // 4. Poll for completion
  const document = await waitForGeneration(generationJob.id);
  
  // 5. Export to PDF
  const pdf = await exportDocument(document.id, 'pdf');
  
  return { document, pdf };
}

async function getTemplateByName(name) {
  const response = await fetch(
    `${ADPA_API}/templates?filter[name]=${encodeURIComponent(name)}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data = await response.json();
  if (!data.data || data.data.length === 0) {
    throw new Error(`Template not found: ${name}`);
  }
  
  return data.data[0];
}

async function gatherReportContext(projectId, period) {
  // Gather context from various sources
  const [project, tasks, issues, metrics] = await Promise.all([
    getProject(projectId),
    getTasks(projectId, period),
    getIssues(projectId, period),
    getMetrics(projectId, period)
  ]);
  
  return {
    project: {
      name: project.name,
      budget: project.budget,
      timeline: project.timeline
    },
    period: {
      start: period.start,
      end: period.end
    },
    accomplishments: tasks.completed.map(t => ({
      title: t.title,
      description: t.description,
      completedAt: t.completedAt
    })),
    issues: issues.open.map(i => ({
      title: i.title,
      severity: i.severity,
      status: i.status
    })),
    metrics: {
      tasksCompleted: tasks.completed.length,
      budgetSpent: metrics.budgetSpent,
      percentComplete: metrics.percentComplete
    }
  };
}

async function triggerDocumentGeneration(config) {
  const response = await fetch(`${ADPA_API}/generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });
  
  if (!response.ok) {
    throw new Error(`Generation failed: ${response.statusText}`);
  }
  
  return await response.json();
}

async function waitForGeneration(jobId, maxWaitSeconds = 300) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds
  
  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    const status = await getGenerationStatus(jobId);
    
    if (status.state === 'completed') {
      return status.document;
    } else if (status.state === 'failed') {
      throw new Error(`Generation failed: ${status.error}`);
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Generation timeout');
}

async function getGenerationStatus(jobId) {
  const response = await fetch(`${ADPA_API}/generation/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}

async function exportDocument(documentId, format) {
  const response = await fetch(
    `${ADPA_API}/documents/${documentId}/export?format=${format}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }
  
  // Return as buffer for saving to file
  return await response.arrayBuffer();
}

// Usage
generateStatusReport('project-123', {
  start: '2025-11-01',
  end: '2025-11-07',
  milestone: 'mobile app launch'
})
  .then(({ document, pdf }) => {
    console.log('Report generated:', document.id);
    // Save PDF to file system
    fs.writeFileSync(`report-${document.id}.pdf`, Buffer.from(pdf));
  })
  .catch(error => console.error('Report generation failed:', error));
```

### Pattern 3: Real-Time Updates via WebSocket

**Use Case:** Display real-time document generation progress in your UI.

```javascript
// websocket-client.js
import { io } from 'socket.io-client';

class ADPAWebSocketClient {
  constructor(url, apiKey) {
    this.socket = io(url, {
      auth: { token: apiKey },
      transports: ['websocket']
    });
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to ADPA WebSocket');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from ADPA WebSocket');
    });
    
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  subscribeToProject(projectId, callback) {
    this.socket.emit('subscribe:project', { projectId });
    
    this.socket.on(`project:${projectId}:update`, (data) => {
      callback('update', data);
    });
    
    this.socket.on(`project:${projectId}:generation:start`, (data) => {
      callback('generation:start', data);
    });
    
    this.socket.on(`project:${projectId}:generation:progress`, (data) => {
      callback('generation:progress', data);
    });
    
    this.socket.on(`project:${projectId}:generation:complete`, (data) => {
      callback('generation:complete', data);
    });
  }
  
  unsubscribeFromProject(projectId) {
    this.socket.emit('unsubscribe:project', { projectId });
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

// Usage in React component
function DocumentGenerationMonitor({ projectId }) {
  const [progress, setProgress] = useState(null);
  const [status, setStatus] = useState('idle');
  
  useEffect(() => {
    const client = new ADPAWebSocketClient(
      'wss://your-adpa.com',
      process.env.REACT_APP_ADPA_API_KEY
    );
    
    client.subscribeToProject(projectId, (event, data) => {
      switch (event) {
        case 'generation:start':
          setStatus('generating');
          setProgress({ current: 0, total: data.totalSections });
          break;
          
        case 'generation:progress':
          setProgress({
            current: data.completedSections,
            total: data.totalSections
          });
          break;
          
        case 'generation:complete':
          setStatus('complete');
          setProgress({ current: data.totalSections, total: data.totalSections });
          break;
      }
    });
    
    return () => {
      client.unsubscribeFromProject(projectId);
      client.disconnect();
    };
  }, [projectId]);
  
  return (
    <div>
      <h3>Document Generation</h3>
      {status === 'generating' && (
        <div>
          <p>Progress: {progress.current} / {progress.total} sections</p>
          <ProgressBar 
            value={progress.current} 
            max={progress.total} 
          />
        </div>
      )}
      {status === 'complete' && (
        <p>✅ Generation complete!</p>
      )}
    </div>
  );
}
```

---

## 5. Custom Context Sources

### What are Context Sources?

Context sources provide real-time data to ADPA's AI for generating accurate, relevant document content. You can create custom context sources to integrate data from any system.

### Creating a Context Source

#### 1. Implement the Context Source API

```javascript
// custom-context-source.js
const express = require('express');
const app = express();

app.use(express.json());

// Context source endpoint
app.post('/api/context', async (req, res) => {
  const { projectId, contextType, parameters } = req.body;
  
  try {
    // Fetch data based on context type
    const data = await fetchContextData(projectId, contextType, parameters);
    
    res.json({
      success: true,
      data: data,
      metadata: {
        source: 'custom-jira-integration',
        fetchedAt: new Date().toISOString(),
        dataPoints: data.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function fetchContextData(projectId, contextType, parameters) {
  // Example: Fetch from Jira
  if (contextType === 'issues') {
    return await fetchJiraIssues(projectId, parameters);
  } else if (contextType === 'sprints') {
    return await fetchJiraSprints(projectId, parameters);
  }
  
  throw new Error(`Unsupported context type: ${contextType}`);
}

async function fetchJiraIssues(projectId, parameters) {
  // Your Jira API integration
  const jiraProjectKey = await getJiraProjectKey(projectId);
  
  const response = await fetch(
    `https://your-jira.atlassian.net/rest/api/3/search?jql=project=${jiraProjectKey}`,
    {
      headers: {
        'Authorization': `Basic ${Buffer.from('email:token').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const result = await response.json();
  
  // Transform Jira issues to ADPA context format
  return result.issues.map(issue => ({
    id: issue.key,
    title: issue.fields.summary,
    description: issue.fields.description,
    status: issue.fields.status.name,
    priority: issue.fields.priority.name,
    assignee: issue.fields.assignee?.displayName,
    createdAt: issue.fields.created,
    updatedAt: issue.fields.updated
  }));
}

app.listen(3001, () => {
  console.log('Custom context source running on port 3001');
});
```

#### 2. Register Context Source in ADPA

```javascript
// register-context-source.js
const ADPA_API = 'https://your-adpa.com/api/v1';
const API_KEY = process.env.ADPA_API_KEY;

async function registerContextSource() {
  const response = await fetch(`${ADPA_API}/context/sources`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Jira Issues',
      description: 'Fetch issues from Jira for document context',
      endpoint: 'https://your-server.com/api/context',
      authType: 'api_key',
      authConfig: {
        apiKey: 'your-context-source-api-key'
      },
      contextTypes: [
        {
          type: 'issues',
          description: 'Jira issues for the project',
          parameters: [
            {
              name: 'status',
              type: 'string',
              required: false,
              description: 'Filter by issue status'
            },
            {
              name: 'dateRange',
              type: 'object',
              required: false,
              description: 'Date range for filtering issues'
            }
          ]
        },
        {
          type: 'sprints',
          description: 'Sprint data from Jira',
          parameters: []
        }
      ]
    })
  });
  
  const result = await response.json();
  console.log('Context source registered:', result);
  return result;
}

registerContextSource();
```

#### 3. Use Context Source in Templates

When creating or editing a template in ADPA, you can now select your custom context source:

```markdown
Template Configuration:

Context Sources:
☑ Jira Issues
  Type: issues
  Parameters:
    status: "In Progress"
    dateRange: { start: "2025-11-01", end: "2025-11-07" }

System Prompt:
"Based on the Jira issues provided in context, summarize the top 3 
in-progress issues and their impact on project timeline."
```

---

## 6. Webhook Event Handling

### Setting Up Webhooks

Webhooks allow ADPA to notify your application when events occur.

#### 1. Create Webhook Endpoint

```javascript
// webhook-handler.js
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}

// Webhook endpoint
app.post('/webhooks/adpa', (req, res) => {
  const signature = req.headers['x-adpa-signature'];
  const webhookSecret = process.env.ADPA_WEBHOOK_SECRET;
  
  // Verify signature
  if (!verifyWebhookSignature(req.body, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process event
  const { event, data } = req.body;
  
  console.log(`Received event: ${event}`);
  
  switch (event) {
    case 'document.generated':
      handleDocumentGenerated(data);
      break;
      
    case 'document.updated':
      handleDocumentUpdated(data);
      break;
      
    case 'project.created':
      handleProjectCreated(data);
      break;
      
    case 'generation.failed':
      handleGenerationFailed(data);
      break;
      
    default:
      console.log(`Unknown event: ${event}`);
  }
  
  // Acknowledge receipt
  res.status(200).json({ received: true });
});

async function handleDocumentGenerated(data) {
  console.log('Document generated:', data.documentId);
  
  // Example: Send notification email
  await sendEmail({
    to: data.projectOwner.email,
    subject: `Document Ready: ${data.documentName}`,
    body: `Your document "${data.documentName}" has been generated successfully.`
  });
  
  // Example: Update external system
  await updateExternalSystem({
    documentId: data.documentId,
    status: 'completed',
    url: data.documentUrl
  });
}

async function handleDocumentUpdated(data) {
  console.log('Document updated:', data.documentId);
  // Handle document update
}

async function handleProjectCreated(data) {
  console.log('Project created:', data.projectId);
  // Handle new project
}

async function handleGenerationFailed(data) {
  console.error('Generation failed:', data.error);
  
  // Send alert to admin
  await sendAlert({
    severity: 'error',
    message: `Document generation failed for project ${data.projectId}`,
    error: data.error
  });
}

app.listen(3002, () => {
  console.log('Webhook handler running on port 3002');
});
```

#### 2. Register Webhook in ADPA

```javascript
// register-webhook.js
const ADPA_API = 'https://your-adpa.com/api/v1';
const API_KEY = process.env.ADPA_API_KEY;

async function registerWebhook() {
  const response = await fetch(`${ADPA_API}/webhooks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://your-server.com/webhooks/adpa',
      events: [
        'document.generated',
        'document.updated',
        'project.created',
        'generation.failed'
      ],
      secret: 'your-webhook-secret-key',
      active: true
    })
  });
  
  const result = await response.json();
  console.log('Webhook registered:', result);
  return result;
}

registerWebhook();
```

### Available Webhook Events

```
┌──────────────────────┬─────────────────────────────────────┐
│ Event                │ Description                          │
├──────────────────────┼─────────────────────────────────────┤
│ document.generated   │ Document generation completed        │
│ document.updated     │ Document was edited                  │
│ document.deleted     │ Document was deleted                 │
│ project.created      │ New project created                  │
│ project.updated      │ Project details changed              │
│ project.deleted      │ Project was deleted                  │
│ generation.started   │ Document generation started          │
│ generation.failed    │ Document generation failed           │
│ template.created     │ New template created                 │
│ template.updated     │ Template was modified                │
│ integration.synced   │ Integration sync completed           │
│ integration.failed   │ Integration sync failed              │
└──────────────────────┴─────────────────────────────────────┘
```

---

## 7. Best Practices

### API Rate Limiting

**Respect Rate Limits:**
```javascript
// rate-limit-handler.js
class ADPAClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://your-adpa.com/api/v1';
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimit = 60; // requests per minute
    this.rateLimitWindow = 60000; // 1 minute in ms
  }
  
  async request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, options, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    const { endpoint, options, resolve, reject } = this.requestQueue.shift();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      // Check for rate limit
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');
      
      if (remaining === '0') {
        const resetTime = new Date(reset).getTime();
        const waitTime = resetTime - Date.now();
        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const data = await response.json();
      resolve(data);
    } catch (error) {
      reject(error);
    } finally {
      this.isProcessing = false;
      
      // Process next request after small delay
      setTimeout(() => this.processQueue(), 100);
    }
  }
}

// Usage
const client = new ADPAClient(process.env.ADPA_API_KEY);

async function fetchMultipleProjects() {
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(client.request('/projects'));
  }
  
  const results = await Promise.all(promises);
  console.log(`Fetched ${results.length} projects`);
}
```

### Error Handling

```javascript
// robust-error-handling.js
class ADPAError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'ADPAError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function robustAPICall(endpoint, options) {
  const maxRetries = 3;
  const backoffMultiplier = 2;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await fetch(endpoint, options);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Don't retry client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw new ADPAError(
            errorData.error.message,
            response.status,
            errorData.error.details
          );
        }
        
        // Retry server errors (5xx)
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.statusText}`);
        }
      }
      
      return await response.json();
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        console.error(`Failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      // Exponential backoff
      const waitTime = Math.pow(backoffMultiplier, attempt) * 1000;
      console.log(`Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

### Pagination

```javascript
// pagination-handler.js
async function fetchAllProjects() {
  const allProjects = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `${ADPA_API}/projects?page=${page}&perPage=50`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    allProjects.push(...data.data);
    
    // Check if there are more pages
    hasMore = data.pagination.hasNext;
    page++;
  }
  
  return allProjects;
}

// Using async generator for memory efficiency
async function* paginateProjects() {
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `${ADPA_API}/projects?page=${page}&perPage=50`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    for (const project of data.data) {
      yield project;
    }
    
    hasMore = data.pagination.hasNext;
    page++;
  }
}

// Usage
for await (const project of paginateProjects()) {
  console.log(project.name);
  // Process each project without loading all into memory
}
```

---

## 8. Sample Integration Project

### Complete Integration: Slack Bot

Build a Slack bot that generates status reports on command.

#### Project Structure
```
slack-adpa-bot/
├── package.json
├── .env
├── src/
│   ├── index.js
│   ├── adpa-client.js
│   ├── slack-handler.js
│   └── utils.js
└── README.md
```

#### Code Implementation

**package.json**
```json
{
  "name": "slack-adpa-bot",
  "version": "1.0.0",
  "dependencies": {
    "@slack/bolt": "^3.14.0",
    "dotenv": "^16.3.1",
    "node-fetch": "^3.3.2"
  }
}
```

**src/adpa-client.js**
```javascript
import fetch from 'node-fetch';

export class ADPAClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  async generateStatusReport(projectId) {
    // Get template
    const template = await this.getTemplate('Project Status Report');
    
    // Trigger generation
    const job = await this.request('/generation', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        templateId: template.id,
        documentName: `Status Report - ${new Date().toISOString().split('T')[0]}`
      })
    });
    
    // Wait for completion
    return await this.waitForGeneration(job.data.id);
  }
  
  async getTemplate(name) {
    const response = await this.request(`/templates?filter[name]=${encodeURIComponent(name)}`);
    if (!response.data || response.data.length === 0) {
      throw new Error(`Template not found: ${name}`);
    }
    return response.data[0];
  }
  
  async waitForGeneration(jobId) {
    const maxAttempts = 60; // 2 minutes max
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      const status = await this.request(`/generation/${jobId}`);
      
      if (status.data.state === 'completed') {
        return status.data.document;
      } else if (status.data.state === 'failed') {
        throw new Error(`Generation failed: ${status.data.error}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempt++;
    }
    
    throw new Error('Generation timeout');
  }
  
  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    return await response.json();
  }
}
```

**src/slack-handler.js**
```javascript
import { App } from '@slack/bolt';
import { ADPAClient } from './adpa-client.js';

export function setupSlackBot(config) {
  const app = new App({
    token: config.slackBotToken,
    signingSecret: config.slackSigningSecret,
    socketMode: true,
    appToken: config.slackAppToken
  });
  
  const adpa = new ADPAClient(config.adpaBaseUrl, config.adpaApiKey);
  
  // Command: /status-report [project-id]
  app.command('/status-report', async ({ command, ack, say }) => {
    await ack();
    
    const projectId = command.text.trim();
    
    if (!projectId) {
      await say('Please provide a project ID: `/status-report project-123`');
      return;
    }
    
    await say(`Generating status report for project ${projectId}...`);
    
    try {
      const document = await adpa.generateStatusReport(projectId);
      
      await say({
        text: `✅ Status report generated!`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Status Report Generated*\n\nDocument: ${document.name}\nQuality Score: ${document.qualityScore}/100`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Document' },
                url: `${config.adpaBaseUrl}/documents/${document.id}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      await say(`❌ Failed to generate report: ${error.message}`);
    }
  });
  
  return app;
}
```

**src/index.js**
```javascript
import dotenv from 'dotenv';
import { setupSlackBot } from './slack-handler.js';

dotenv.config();

const config = {
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
  slackAppToken: process.env.SLACK_APP_TOKEN,
  adpaBaseUrl: process.env.ADPA_BASE_URL,
  adpaApiKey: process.env.ADPA_API_KEY
};

const app = setupSlackBot(config);

(async () => {
  await app.start();
  console.log('⚡️ Slack ADPA Bot is running!');
})();
```

**.env**
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
ADPA_BASE_URL=https://your-adpa.com/api/v1
ADPA_API_KEY=adpa_key_abc123xyz456
```

---

## 9. Troubleshooting

### Common Issues

#### Issue: 401 Unauthorized

```
Error: API request failed with status 401
```

**Solutions:**
1. Verify API key is correct
2. Check if API key is expired
3. Ensure proper header format: `Authorization: Bearer YOUR_KEY`
4. Regenerate API key if necessary

---

#### Issue: Rate Limit Exceeded

```
Error: Rate limit exceeded. Try again in 45 seconds.
```

**Solutions:**
1. Implement exponential backoff
2. Use request queuing
3. Cache frequently accessed data
4. Contact ADPA admin to increase limits

---

#### Issue: Webhook Not Receiving Events

**Debugging Steps:**
1. Check webhook is active in ADPA settings
2. Verify endpoint URL is publicly accessible
3. Check webhook secret matches
4. Review webhook logs in ADPA
5. Test with webhook testing tool (e.g., webhook.site)

---

## 10. Developer Certification

### Certification Exam

Complete this exam with at least 80% correct (16/20) to earn your ADPA Developer Certification.

#### Questions

**1. Which authentication method is recommended for server-to-server integrations?**
   - [ ] A. Session-based
   - [ ] B. API Keys
   - [ ] C. Username/Password
   - [ ] D. No authentication

**2. What HTTP header is used for API key authentication?**
   - [ ] A. X-API-Key
   - [ ] B. Authorization: Bearer [key]
   - [ ] C. Authentication: [key]
   - [ ] D. API-Token

**3. What is the correct way to handle rate limiting?**
   - [ ] A. Ignore rate limit errors
   - [ ] B. Implement exponential backoff and request queuing
   - [ ] C. Make unlimited requests
   - [ ] D. Use a different API key

**4. How do you verify webhook signature?**
   - [ ] A. Check IP address
   - [ ] B. HMAC SHA-256 hash of payload with shared secret
   - [ ] C. Compare timestamp
   - [ ] D. Not necessary

**5. What format does the API use for requests and responses?**
   - [ ] A. XML
   - [ ] B. JSON
   - [ ] C. YAML
   - [ ] D. Plain text

**6. Which HTTP status code indicates a successful API call?**
   - [ ] A. 200-299
   - [ ] B. 300-399
   - [ ] C. 400-499
   - [ ] D. 500-599

**7. What is a context source?**
   - [ ] A. A database backup
   - [ ] B. An API that provides real-time data for document generation
   - [ ] C. A user interface component
   - [ ] D. An error log

**8. How should you handle transient API errors (5xx)?**
   - [ ] A. Give up immediately
   - [ ] B. Retry with exponential backoff
   - [ ] C. Change the API endpoint
   - [ ] D. Ignore the error

**9. What is the purpose of OAuth 2.0 refresh tokens?**
   - [ ] A. To refresh the browser
   - [ ] B. To obtain new access tokens when they expire
   - [ ] C. To reset passwords
   - [ ] D. To clear cache

**10. Which event is triggered when document generation completes?**
   - [ ] A. document.created
   - [ ] B. document.generated
   - [ ] C. generation.complete
   - [ ] D. document.ready

**11. How do you paginate through large result sets?**
   - [ ] A. Use page and perPage query parameters
   - [ ] B. Make single large request
   - [ ] C. Pagination is not supported
   - [ ] D. Use POST instead of GET

**12. Where should API keys be stored?**
   - [ ] A. In client-side JavaScript
   - [ ] B. In version control
   - [ ] C. In environment variables or secret managers
   - [ ] D. In comments

**13. What is WebSocket used for in ADPA?**
   - [ ] A. Authentication
   - [ ] B. Real-time updates and event streaming
   - [ ] C. File uploads
   - [ ] D. Database queries

**14. How do you wait for async document generation to complete?**
   - [ ] A. Poll the generation status endpoint
   - [ ] B. Wait exactly 60 seconds
   - [ ] C. Refresh the browser
   - [ ] D. Send another generation request

**15. What should you do with webhook payloads?**
   - [ ] A. Ignore them
   - [ ] B. Verify signature and process asynchronously
   - [ ] C. Delete immediately
   - [ ] D. Forward to all users

**16. Which HTTP method is used to create a new resource?**
   - [ ] A. GET
   - [ ] B. POST
   - [ ] C. DELETE
   - [ ] D. PATCH

**17. How do you filter API results?**
   - [ ] A. filter[field]=value query parameter
   - [ ] B. It's not possible
   - [ ] C. Only through POST requests
   - [ ] D. Using cookies

**18. What is the maximum recommended timeout for API calls?**
   - [ ] A. 1 second
   - [ ] B. 30-60 seconds depending on operation
   - [ ] C. No timeout
   - [ ] D. 5 minutes

**19. How do you handle API versioning?**
   - [ ] A. Ignore versions
   - [ ] B. Use version in URL path (/api/v1/)
   - [ ] C. Always use latest automatically
   - [ ] D. Versions don't exist

**20. What is the best practice for error handling?**
   - [ ] A. Crash the application
   - [ ] B. Implement retries with backoff, log errors, provide user feedback
   - [ ] C. Ignore all errors
   - [ ] D. Only handle successful responses

### Answer Key
1. B, 2. B, 3. B, 4. B, 5. B, 6. A, 7. B, 8. B, 9. B, 10. B, 11. A, 12. C, 13. B, 14. A, 15. B, 16. B, 17. A, 18. B, 19. B, 20. B

**Scoring:**
- 18-20 correct: ⭐⭐⭐ Excellent! You're certified!
- 16-17 correct: ⭐⭐ Good! Review missed topics.
- 14-15 correct: ⭐ Review key sections and retake.
- <14 correct: Please review the training guide thoroughly.

---

## Congratulations! 🎉

You've completed the ADPA Developer Training Guide. You should now be able to:

✅ Authenticate and make API calls to ADPA  
✅ Implement common integration patterns  
✅ Create custom context sources  
✅ Handle webhook events  
✅ Build complete integration projects  
✅ Follow API best practices and security guidelines  

### Next Steps

1. **Build**: Create a simple integration project
2. **Contribute**: Submit improvements to ADPA
3. **Share**: Help other developers with integrations
4. **Learn More**: Explore advanced topics in the API documentation

### Resources

- 📚 [API Reference Documentation](https://your-adpa.com/api/docs)
- 💬 Developer Community Forum
- 🐛 GitHub Issues
- 📧 Developer Support: dev-support@adpa.example.com

---

**Training Guide Version:** 1.0.0  
**Last Updated:** November 4, 2025  
**Feedback:** Please submit feedback to improve this guide
