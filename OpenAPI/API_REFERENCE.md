# ADPA Platform API Reference

This document provides a reference for the ADPA Platform API, based on the OpenAPI specifications.

**Base URL**: `http://localhost:5000` (Local) / `https://{backendHost}` (Production)

## Table of Contents
- [Authentication](#authentication)
- [Projects](#projects)
- [Documents](#documents)
- [Document Generation](#document-generation)
- [Document Templates](#document-templates)
- [Jobs](#jobs)
- [GKG (Governance Knowledge Graph)](#gkg)
- [Context Injection](#context-injection)

---

## Authentication

### Register
`POST /api/auth/register`

Register a new user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "companyName": "Acme Corp"
}
```

**Response (201):**
- Returns user summary and JWT token.

### Login
`POST /api/auth/login`

Authenticate an existing user.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200):**
- Returns user summary and JWT token.

---

## Projects

### List Projects
`GET /api/projects`

Retrieve a paginated list of projects.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status
- `framework`: Filter by framework
- `search`: Search term

### Create Project
`POST /api/projects`

**Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "status": "active",
  "framework": "TOGAF"
}
```

### Get Project
`GET /api/projects/{id}`

### Update Project
`PUT /api/projects/{id}`

### Delete Project
`DELETE /api/projects/{id}`

---

## Documents

### Get Project Document
`GET /api/projects/{projectId}/documents/{documentId}`

Retrieve a specific document within a project.

### Get Document by ID
`GET /api/documents/{id}`

Retrieve a document by its global ID.

---

## Document Generation

### Check Template Conflict
`POST /api/document-generation/check-template`

Check if a template can be used for a project without conflict.

**Body:**
```json
{
  "projectId": "uuid",
  "templateId": "uuid"
}
```

### Generate Document
`POST /api/document-generation/generate`

Generate a document using AI.

**Body:**
```json
{
  "projectId": "uuid",
  "name": "Doc Name",
  "userPrompt": "Write a security policy...",
  "provider": "openai",
  "model": "gpt-4",
  "templateId": "uuid"
}
```

---

## Document Templates

*Note: The platform exposes two sets of endpoints for templates. The `/api/document-templates` endpoints provide advanced management features.*

### Advanced Template Management (Base: `/api/document-templates`)

#### List Templates
`GET /api/document-templates`

**Query Parameters:**
- `framework`: TOGAF, SABSA, etc.
- `category`: String
- `search`: String
- `is_public`: Boolean

#### Create Template
`POST /api/document-templates`

#### Get Template
`GET /api/document-templates/{id}`

#### Update Template
`PUT /api/document-templates/{id}`

#### Delete Template
`DELETE /api/document-templates/{id}` (Soft delete)

#### Clone Template
`POST /api/document-templates/{id}/clone`

#### Record Usage
`POST /api/document-templates/{id}/use`

#### Trash / Restore
- `GET /api/document-templates/trash`: View deleted templates
- `POST /api/document-templates/{id}/restore`: Restore template
- `DELETE /api/document-templates/{id}/permanent`: Permanently delete

### Basic Template Access (Base: `/api/templates`)

- `GET /api/templates`: List templates (simpler view)
- `POST /api/templates`: Create template
- `GET /api/templates/{id}`: Get template

---

## Jobs

### List Jobs
`GET /api/jobs`

Monitor background jobs (e.g., document generation, sync).

**Query Parameters:**
- `status`: pending, processing, completed, failed, cancelled
- `type`: Job type

---

## GKG

Governance Knowledge Graph operations.

### Enqueue GKG Sync
`POST /api/gkg/sync`

Trigger a synchronization of project/document data to Neo4j.

**Body:**
```json
{
  "projectId": "uuid"
  // OR
  "documentId": "uuid"
}
```

### GKG Summary
`GET /api/gkg/summary`

Get dashboard statistics from the Knowledge Graph.

---

## Context Injection

### Inject Context
`POST /api/context-injection/inject`

Process a template and inject variable/context data.

**Body:**
```json
{
  "templateContent": "Raw markdown...",
  "projectId": "uuid",
  "config": {}
}
```
