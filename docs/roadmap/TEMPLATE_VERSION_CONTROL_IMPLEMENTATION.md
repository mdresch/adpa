# Template Version Control System - Implementation Plan

**Feature:** Vercel-Style Template Version Control  
**CR Reference:** CR-2027-002  
**Version:** 1.0  
**Date:** 2025-01-21  
**Status:** Approved  
**Duration:** 8 weeks

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Integration Points](#integration-points)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Monitoring & Observability](#monitoring--observability)

---

## Overview

### Purpose

Implement a Vercel-inspired deployment versioning system for document templates that provides:

- **Immutable Versioning**: Every template change creates a new immutable version
- **Environment Management**: Production, preview, and latest pointers to versions
- **Instant Rollback**: Switch production to any previous version in <1 second
- **Preview Testing**: Test template changes before promoting to production
- **Complete Audit Trail**: Track all changes with who/when/why information
- **Zero Downtime**: Atomic pointer swaps ensure no service interruption

### Core Principles

1. **Never Modify Existing Versions**: Versions are immutable snapshots
2. **Pointer-Based Lookups**: Fast environment-based version resolution
3. **Atomic Operations**: All deployment actions are transactional
4. **Complete Snapshots**: Store full template state per version (not diffs)
5. **Human-Readable IDs**: Git-style short hash identifiers (`tmpl_a3f9c2d`)

### Success Criteria

✅ All templates support immutable versioning  
✅ Preview environment fully functional  
✅ Production promotion/rollback working  
✅ Zero-downtime deployments achieved  
✅ Complete audit trail captured  
✅ User adoption >90% within 4 weeks  

---

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Template Version Control Flow            │
└─────────────────────────────────────────────────────────────┘

Template Update:
  Edit Template → Create New Version (immutable)
                  ↓
  Set as Latest → Available in Preview
                  ↓
  User Promotes → Atomic Swap to Production
                  ↓
  Old Production → Archived (still accessible)

Document Generation:
  Request Template → Lookup Production Pointer
                     ↓
  Resolve Version  → Load from template_versions
                     ↓
  Generate Document → Tag with version_hash
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                 │
├─────────────────────────────────────────────────────────┤
│  • Version Timeline Page                               │
│  • Promote to Production UI                            │
│  • Rollback UI with confirmation                       │
│  • Version Comparison Tool                            │
│  • Deployment History View                             │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
                     ↓
┌─────────────────────────────────────────────────────────┐
│                 Backend Services (Express)              │
├─────────────────────────────────────────────────────────┤
│  • template-versions.ts (API routes)                   │
│  • TemplateVersionService (core logic)                 │
│  • TemplateVersioningMiddleware (auto-versioning)     │
│  • Version comparison/diff engine                      │
└────────────────────┬────────────────────────────────────┘
                     │ Database
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                │
├─────────────────────────────────────────────────────────┤
│  • template_versions (immutable snapshots)              │
│  • template_deployments (environment pointers)         │
│  • template_version_comparisons (diff cache)           │
│  • templates (updated with pointers)                   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**Version Creation Flow:**
```
1. User edits template → POST /api/templates/:id
2. Middleware intercepts → capture current state
3. Service creates new version → template_versions table
4. Update latest pointer → templates.latest_version_id
5. Return new version hash → tmpl_a3f9c2d
```

**Document Generation Flow:**
```
1. Request document generation → POST /api/generate
2. Lookup production version → templates.production_version_id
3. Resolve version data → template_versions table
4. Generate document using version data
5. Tag document with version_hash
```

**Production Promotion Flow:**
```
1. User clicks "Promote to Production"
2. Validate version exists and is ready
3. Begin transaction
4. Update production pointer → atomic swap
5. Archive old production version
6. Update templates.production_version_id
7. Create deployment record
8. Commit transaction → complete in <200ms
```

---

## Database Schema

### Migration File: `server/migrations/020_template_version_control.sql`

```sql
-- Migration 020: Template Version Control System
-- Vercel-Style Immutable Versioning for Templates

-- ============================================================================
-- 1. Template Versions Table (Immutable Snapshots)
-- ============================================================================

CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Vercel-style versioning
  version_hash VARCHAR(50) NOT NULL UNIQUE, -- e.g., "tmpl_a3f9c2d"
  version_number INTEGER NOT NULL, -- Sequential: 1, 2, 3...
  deployment_status VARCHAR(20) DEFAULT 'preview' 
    CHECK (deployment_status IN ('preview', 'production', 'archived')),
  
  -- Complete template snapshot (immutable)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  framework VARCHAR(50),
  category VARCHAR(100),
  content JSONB NOT NULL,
  variables JSONB,
  system_prompt TEXT,
  template_paragraphs JSONB,
  development_status VARCHAR(20), -- Preserved from original
  
  -- Version metadata
  change_summary TEXT, -- What changed in this version
  change_type VARCHAR(20) -- 'major', 'minor', 'patch', 'rollback'
    CHECK (change_type IN ('major', 'minor', 'patch', 'rollback')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Production promotion tracking
  promoted_to_production_at TIMESTAMP,
  promoted_by UUID REFERENCES users(id),
  
  -- Performance metrics (snapshot at version creation)
  validation_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  avg_generation_time INTEGER, -- milliseconds
  
  -- Version lineage (for rollback tracking)
  parent_version_id UUID REFERENCES template_versions(id),
  is_rollback BOOLEAN DEFAULT FALSE,
  rollback_from_version_id UUID REFERENCES template_versions(id),
  
  UNIQUE(template_id, version_number)
);

-- Indexes for performance
CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_hash ON template_versions(version_hash);
CREATE INDEX idx_template_versions_status ON template_versions(deployment_status);
CREATE INDEX idx_template_versions_created_at ON template_versions(created_at DESC);
CREATE INDEX idx_template_versions_parent ON template_versions(parent_version_id);

-- ============================================================================
-- 2. Template Deployments Table (Environment Pointers)
-- ============================================================================

CREATE TABLE template_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Environment and version pointer
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('production', 'preview', 'latest')),
  version_id UUID NOT NULL REFERENCES template_versions(id),
  
  -- Deployment metadata
  deployed_by UUID NOT NULL REFERENCES users(id),
  deployed_at TIMESTAMP DEFAULT NOW(),
  deployment_notes TEXT,
  
  -- Rollback tracking
  previous_version_id UUID REFERENCES template_versions(id),
  rollback_reason TEXT,
  
  UNIQUE(template_id, environment)
);

-- Indexes
CREATE INDEX idx_template_deployments_template ON template_deployments(template_id);
CREATE INDEX idx_template_deployments_env ON template_deployments(environment);
CREATE INDEX idx_template_deployments_version ON template_deployments(version_id);
CREATE INDEX idx_template_deployments_deployed_at ON template_deployments(deployed_at DESC);

-- ============================================================================
-- 3. Template Version Comparisons Table (Diff Cache)
-- ============================================================================

CREATE TABLE template_version_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version_id UUID NOT NULL REFERENCES template_versions(id),
  to_version_id UUID NOT NULL REFERENCES template_versions(id),
  
  -- Cached diff summary (computed on-demand)
  diff_summary JSONB NOT NULL, -- {added: [], modified: [], removed: []}
  computed_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(from_version_id, to_version_id)
);

CREATE INDEX idx_template_version_comparisons_from ON template_version_comparisons(from_version_id);
CREATE INDEX idx_template_version_comparisons_to ON template_version_comparisons(to_version_id);

-- ============================================================================
-- 4. Update Templates Table (Add Pointers)
-- ============================================================================

ALTER TABLE templates
ADD COLUMN IF NOT EXISTS production_version_id UUID REFERENCES template_versions(id),
ADD COLUMN IF NOT EXISTS latest_version_id UUID REFERENCES template_versions(id),
ADD COLUMN IF NOT EXISTS total_versions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_deployed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deployment_frequency VARCHAR(20) DEFAULT 'manual';

CREATE INDEX idx_templates_production_version ON templates(production_version_id);
CREATE INDEX idx_templates_latest_version ON templates(latest_version_id);

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Generate version hash (Git-style short hash)
CREATE OR REPLACE FUNCTION generate_version_hash(template_data JSONB)
RETURNS VARCHAR(50) AS $$
DECLARE
  content_text TEXT;
  hash_result TEXT;
BEGIN
  -- Serialize template data
  content_text := jsonb_pretty(template_data);
  
  -- Generate SHA-256 hash
  hash_result := encode(digest(content_text || extract(epoch from now())::TEXT, 'sha256'), 'hex');
  
  -- Return first 7 characters (like Git)
  RETURN 'tmpl_' || substring(hash_result FROM 1 FOR 7);
END;
$$ LANGUAGE plpgsql;

-- Get next version number for a template
CREATE OR REPLACE FUNCTION get_next_version_number(p_template_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO v_current_version
  FROM template_versions
  WHERE template_id = p_template_id;
  
  RETURN v_current_version + 1;
END;
$$ LANGUAGE plpgsql;

-- Atomic pointer swap (for production promotion)
CREATE OR REPLACE FUNCTION promote_to_production(
  p_template_id UUID,
  p_version_hash VARCHAR(50),
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_old_production_id UUID;
  v_deployment_id UUID;
BEGIN
  -- Get version ID
  SELECT id INTO v_version_id
  FROM template_versions
  WHERE template_id = p_template_id AND version_hash = p_version_hash;
  
  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Version not found: %', p_version_hash;
  END IF;
  
  -- Get current production version
  SELECT production_version_id INTO v_old_production_id
  FROM templates
  WHERE id = p_template_id;
  
  -- Update production pointer (atomic)
  UPDATE templates
  SET 
    production_version_id = v_version_id,
    last_deployed_at = NOW()
  WHERE id = p_template_id;
  
  -- Archive old production version
  IF v_old_production_id IS NOT NULL THEN
    UPDATE template_versions
    SET deployment_status = 'archived'
    WHERE id = v_old_production_id;
  END IF;
  
  -- Mark new version as production
  UPDATE template_versions
  SET 
    deployment_status = 'production',
    promoted_to_production_at = NOW(),
    promoted_by = p_user_id
  WHERE id = v_version_id;
  
  -- Create deployment record
  INSERT INTO template_deployments (
    template_id,
    environment,
    version_id,
    deployed_by,
    deployment_notes,
    previous_version_id
  ) VALUES (
    p_template_id,
    'production',
    v_version_id,
    p_user_id,
    p_notes,
    v_old_production_id
  )
  RETURNING id INTO v_deployment_id;
  
  RETURN v_deployment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Views for Common Queries
-- ============================================================================

-- View: Current production version for each template
CREATE OR REPLACE VIEW template_production_versions AS
SELECT 
  t.id as template_id,
  t.name as template_name,
  t.framework,
  tv.id as version_id,
  tv.version_hash,
  tv.version_number,
  tv.created_at,
  tv.created_by,
  u.name as created_by_name,
  td.deployed_at as promoted_at,
  t.last_deployed_at
FROM templates t
JOIN template_versions tv ON t.production_version_id = tv.id
JOIN users u ON tv.created_by = u.id
LEFT JOIN template_deployments td ON t.id = td.template_id AND td.environment = 'production'
WHERE t.deleted_at IS NULL;

-- View: Template version history
CREATE OR REPLACE VIEW template_version_history AS
SELECT 
  t.id as template_id,
  t.name as template_name,
  tv.version_number,
  tv.version_hash,
  tv.deployment_status,
  tv.change_summary,
  tv.change_type,
  tv.created_at,
  tv.promoted_to_production_at,
  u.name as created_by_name,
  COUNT(d.id) as document_count -- Documents generated with this version
FROM templates t
JOIN template_versions tv ON t.id = tv.template_id
JOIN users u ON tv.created_by = u.id
LEFT JOIN documents d ON d.template_version_hash = tv.version_hash
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name, tv.id, tv.version_number, tv.version_hash, 
         tv.deployment_status, tv.change_summary, tv.change_type, 
         tv.created_at, tv.promoted_to_production_at, u.name
ORDER BY tv.created_at DESC;

-- ============================================================================
-- 7. Comments and Documentation
-- ============================================================================

COMMENT ON TABLE template_versions IS 'Immutable template versions with complete snapshots';
COMMENT ON TABLE template_deployments IS 'Environment pointers for version promotion';
COMMENT ON TABLE template_version_comparisons IS 'Cached diff results for version comparison';
COMMENT ON COLUMN templates.production_version_id IS 'Pointer to current production version';
COMMENT ON COLUMN templates.latest_version_id IS 'Pointer to most recent version';
COMMENT ON FUNCTION generate_version_hash IS 'Creates Git-style version hash from template data';
COMMENT ON FUNCTION get_next_version_number IS 'Gets next sequential version number for template';
COMMENT ON FUNCTION promote_to_production IS 'Atomically promotes version to production';

-- ============================================================================
-- 8. Initial Data Migration
-- ============================================================================

-- Create initial version for all existing templates
INSERT INTO template_versions (
  template_id,
  version_hash,
  version_number,
  deployment_status,
  name,
  description,
  framework,
  category,
  content,
  variables,
  system_prompt,
  template_paragraphs,
  development_status,
  created_by,
  change_summary,
  change_type
)
SELECT 
  t.id,
  generate_version_hash(t.content),
  1, -- First version
  'production', -- All existing templates are production
  t.name,
  t.description,
  t.framework,
  t.category,
  t.content,
  t.variables,
  t.system_prompt,
  t.template_paragraphs,
  t.development_status,
  t.created_by,
  'Initial version migration',
  'major'
FROM templates t
WHERE t.deleted_at IS NULL;

-- Set production pointers
UPDATE templates t
SET 
  production_version_id = (
    SELECT id FROM template_versions tv 
    WHERE tv.template_id = t.id AND tv.version_number = 1
  ),
  latest_version_id = (
    SELECT id FROM template_versions tv 
    WHERE tv.template_id = t.id AND tv.version_number = 1
  ),
  total_versions = 1
WHERE t.deleted_at IS NULL;

-- Create initial deployments
INSERT INTO template_deployments (template_id, environment, version_id, deployed_by)
SELECT 
  t.id,
  'production',
  t.production_version_id,
  t.created_by
FROM templates t
WHERE t.production_version_id IS NOT NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================
```

---

## Backend Implementation

### File: `server/src/services/templateVersionService.ts`

**Core service for template versioning:**

```typescript
import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import crypto from 'crypto'

export interface TemplateVersion {
  id: string
  template_id: string
  version_hash: string
  version_number: number
  deployment_status: 'preview' | 'production' | 'archived'
  name: string
  description: string
  framework: string
  category: string
  content: any
  variables: any
  system_prompt: string
  template_paragraphs: any[]
  change_summary: string
  change_type: 'major' | 'minor' | 'patch' | 'rollback'
  created_by: string
  created_at: Date
  promoted_to_production_at?: Date
  parent_version_id?: string
}

export interface Deployment {
  id: string
  template_id: string
  environment: string
  version_id: string
  deployed_by: string
  deployed_at: Date
  previous_version_id?: string
}

export class TemplateVersionService {
  /**
   * Create a new immutable version of a template
   */
  async createVersion(
    templateId: string,
    templateData: any,
    userId: string,
    changeSummary: string,
    changeType: 'major' | 'minor' | 'patch' = 'patch'
  ): Promise<TemplateVersion> {
    const log = logger.child({ templateId, userId })
    
    try {
      // Get next version number
      const versionNumberResult = await pool.query(
        'SELECT get_next_version_number($1) as next_version',
        [templateId]
      )
      const versionNumber = versionNumberResult.rows[0].next_version
      
      // Generate version hash
      const versionHash = this.generateVersionHash(templateData)
      
      // Get parent version ID
      const parentVersion = await this.getLatestVersion(templateId)
      
      // Create new version
      const result = await pool.query(
        `INSERT INTO template_versions (
          template_id, version_hash, version_number, deployment_status,
          name, description, framework, category, content, variables,
          system_prompt, template_paragraphs, change_summary, change_type,
          created_by, parent_version_id
        ) VALUES (
          $1, $2, $3, 'preview', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING *`,
        [
          templateId, versionHash, versionNumber,
          templateData.name, templateData.description,
          templateData.framework, templateData.category,
          JSON.stringify(templateData.content || {}),
          JSON.stringify(templateData.variables || []),
          templateData.system_prompt || '',
          JSON.stringify(templateData.template_paragraphs || []),
          changeSummary, changeType, userId,
          parentVersion?.id
        ]
      )
      
      const version = this.mapRowToVersion(result.rows[0])
      
      // Update latest pointer
      await pool.query(
        'UPDATE templates SET latest_version_id = $1 WHERE id = $2',
        [version.id, templateId]
      )
      
      // Increment version counter
      await pool.query(
        'UPDATE templates SET total_versions = total_versions + 1 WHERE id = $1',
        [templateId]
      )
      
      log.info('Version created', { versionHash, versionNumber })
      return version
      
    } catch (error) {
      log.error('Failed to create version', error)
      throw error
    }
  }
  
  /**
   * Promote a version to production (atomic swap)
   */
  async promoteToProduction(
    templateId: string,
    versionHash: string,
    userId: string,
    notes?: string
  ): Promise<Deployment> {
    const log = logger.child({ templateId, versionHash, userId })
    
    try {
      const result = await pool.query(
        'SELECT promote_to_production($1, $2, $3, $4) as deployment_id',
        [templateId, versionHash, userId, notes]
      )
      
      const deploymentId = result.rows[0].deployment_id
      
      // Fetch deployment record
      const deploymentResult = await pool.query(
        'SELECT * FROM template_deployments WHERE id = $1',
        [deploymentId]
      )
      
      const deployment = this.mapRowToDeployment(deploymentResult.rows[0])
      
      log.info('Version promoted to production', { versionHash })
      return deployment
      
    } catch (error) {
      log.error('Failed to promote version', error)
      throw error
    }
  }
  
  /**
   * Rollback production to a previous version
   */
  async rollbackProduction(
    templateId: string,
    targetVersionHash: string,
    userId: string,
    reason: string
  ): Promise<Deployment> {
    const log = logger.child({ templateId, targetVersionHash, userId })
    
    try {
      // Validate target version exists and was previously in production
      const versionResult = await pool.query(
        `SELECT * FROM template_versions
         WHERE template_id = $1 AND version_hash = $2
         AND deployment_status = 'archived'`,
        [templateId, targetVersionHash]
      )
      
      if (versionResult.rows.length === 0) {
        throw new Error('Target version not found or was never in production')
      }
      
      const targetVersion = this.mapRowToVersion(versionResult.rows[0])
      
      // Mark as rollback and re-promote
      await pool.query(
        `UPDATE template_versions
         SET is_rollback = TRUE,
         rollback_from_version_id = (SELECT production_version_id FROM templates WHERE id = $1)
         WHERE id = $2`,
        [templateId, targetVersion.id]
      )
      
      // Promote the rollback version
      return await this.promoteToProduction(templateId, targetVersionHash, userId, `Rollback: ${reason}`)
      
    } catch (error) {
      log.error('Failed to rollback', error)
      throw error
    }
  }
  
  /**
   * Get current production version for a template
   */
  async getProductionVersion(templateId: string): Promise<TemplateVersion | null> {
    const result = await pool.query(
      `SELECT tv.* FROM template_versions tv
       JOIN templates t ON t.production_version_id = tv.id
       WHERE t.id = $1`,
      [templateId]
    )
    
    return result.rows.length > 0 ? this.mapRowToVersion(result.rows[0]) : null
  }
  
  /**
   * List all versions for a template
   */
  async listVersions(
    templateId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ versions: TemplateVersion[], total: number }> {
    const versionsResult = await pool.query(
      `SELECT * FROM template_versions
       WHERE template_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [templateId, limit, offset]
    )
    
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM template_versions WHERE template_id = $1',
      [templateId]
    )
    
    return {
      versions: versionsResult.rows.map(row => this.mapRowToVersion(row)),
      total: parseInt(countResult.rows[0].total)
    }
  }
  
  /**
   * Compare two versions
   */
  async compareVersions(fromHash: string, toHash: string) {
    const fromVersion = await this.getVersionByHash(fromHash)
    const toVersion = await this.getVersionByHash(toHash)
    
    return {
      added: this.findAddedFields(fromVersion, toVersion),
      modified: this.findModifiedFields(fromVersion, toVersion),
      removed: this.findRemovedFields(fromVersion, toVersion)
    }
  }
  
  /**
   * Generate Vercel-style version hash
   */
  private generateVersionHash(templateData: any): string {
    const content = JSON.stringify({
      name: templateData.name,
      content: templateData.content,
      system_prompt: templateData.system_prompt,
      template_paragraphs: templateData.template_paragraphs,
      timestamp: Date.now()
    })
    
    const hash = crypto.createHash('sha256').update(content).digest('hex')
    const shortHash = hash.substring(0, 7)
    
    return `tmpl_${shortHash}`
  }
  
  // Helper methods...
  private async getVersionByHash(versionHash: string) {
    // Implementation
  }
  
  private async getLatestVersion(templateId: string) {
    // Implementation
  }
  
  private findAddedFields(from: any, to: any): string[] {
    // Implementation
  }
  
  private findModifiedFields(from: any, to: any): string[] {
    // Implementation
  }
  
  private findRemovedFields(from: any, to: any): string[] {
    // Implementation
  }
  
  private mapRowToVersion(row: any): TemplateVersion {
    // Implementation
  }
  
  private mapRowToDeployment(row: any): Deployment {
    // Implementation
  }
}

export const templateVersionService = new TemplateVersionService()
```

### File: `server/src/routes/template-versions.ts`

**API routes for version management:**

```typescript
import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { templateVersionService } from '../services/templateVersionService'
import Joi from 'joi'
import { validateParams, validateQuery, validateBody } from '../middleware/validation'

const router = express.Router()

// Create new version
router.post('/:id/versions',
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateBody(Joi.object({
    change_summary: Joi.string().required(),
    change_type: Joi.string().valid('major', 'minor', 'patch').default('patch')
  })),
  async (req, res) => {
    try {
      const version = await templateVersionService.createVersion(
        req.params.id,
        req.body,
        req.user.id,
        req.body.change_summary,
        req.body.change_type
      )
      res.json({ version })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// List versions
router.get('/:id/versions',
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validateQuery(Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(50)
  })),
  async (req, res) => {
    try {
      const { page, limit } = req.query
      const offset = (Number(page) - 1) * Number(limit)
      
      const result = await templateVersionService.listVersions(
        req.params.id,
        Number(limit),
        offset
      )
      
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// Promote to production
router.post('/:id/versions/:hash/promote',
  authenticateToken,
  async (req, res) => {
    try {
      const deployment = await templateVersionService.promoteToProduction(
        req.params.id,
        req.params.hash,
        req.user.id,
        req.body.notes
      )
      res.json({ deployment })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// Rollback
router.post('/:id/versions/:hash/rollback',
  authenticateToken,
  validateBody(Joi.object({
    reason: Joi.string().required()
  })),
  async (req, res) => {
    try {
      const deployment = await templateVersionService.rollbackProduction(
        req.params.id,
        req.params.hash,
        req.user.id,
        req.body.reason
      )
      res.json({ deployment })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

// Compare versions
router.get('/:id/versions/compare',
  authenticateToken,
  validateQuery(Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required()
  })),
  async (req, res) => {
    try {
      const diff = await templateVersionService.compareVersions(
        req.query.from,
        req.query.to
      )
      res.json({ diff })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
)

export default router
```

---

## Frontend Implementation

### Components

**File:** `components/template/version-timeline.tsx`
**File:** `components/template/version-diff.tsx`
**File:** `components/template/promote-button.tsx`
**File:** `components/template/rollback-dropdown.tsx`

### Pages

**File:** `app/templates/[id]/versions/page.tsx`

---

## Integration Points

### Document Generator Integration

**File:** `server/src/modules/documentGenerator/`

- Always use `production_version_id` pointer
- Add `template_version_hash` to documents table
- Enable regeneration with specific version

### Template Update Flow

- Intercept template updates via middleware
- Auto-create versions on changes
- Keep production unchanged until promotion

---

## Migration Strategy

**Week 1-2:** Schema creation and data migration  
**Week 3:** Service implementation and testing  
**Week 4:** Integration with document generator  
**Week 5:** Frontend UI development  
**Week 6:** Testing and refinement  
**Week 7:** Documentation and training  
**Week 8:** Production deployment

---

## Testing Strategy

### Unit Tests
- Version service methods
- Hash generation
- Comparison logic

### Integration Tests
- Version creation flow
- Promotion workflow
- Rollback workflow

### E2E Tests
- Create version → Promote → Rollback
- Document generation with versions
- Timeline rendering

---

## Deployment Plan

**Phase 1:** Deploy to staging  
**Phase 2:** Pilot with 1 template  
**Phase 3:** Gradual rollout (10% → 50% → 100%)  
**Phase 4:** Full production

---

## Monitoring & Observability

- Version creation rate
- Promotion frequency
- Rollback rate
- Production stability metrics

---

**Status:** Ready for Development  
**Next Steps:** Begin Phase 1 implementation

