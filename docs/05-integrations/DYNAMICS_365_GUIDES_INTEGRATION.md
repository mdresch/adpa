# Microsoft Dynamics 365 Guides Integration

## Executive Summary

This document describes ADPA's integration with **Microsoft Dynamics 365 Guides**, enabling automated generation of step-by-step holographic instructions from ADPA's Digital Twin framework. By connecting ADPA's L0-L2 asset data with D365 Guides' mixed reality authoring capabilities, organizations can automatically generate training content, maintenance procedures, and operational guides that display as AR overlays on HoloLens 2 and mobile devices.

**Key Value**: Transform static documentation into interactive, spatial learning experiences without manual content creation.

---

## 1. Integration Overview

### 1.1 What is Dynamics 365 Guides?

Microsoft Dynamics 365 Guides is a mixed reality application that enables:
- **Step-by-step holographic instructions** anchored to physical equipment
- **Hands-free operation** via HoloLens 2
- **Mobile AR support** via iOS and Android
- **Analytics** on guide usage, completion rates, and time-per-step
- **Integration** with Dynamics 365 Field Service, Supply Chain, and Power Platform

### 1.2 ADPA + D365 Guides Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADPA Platform                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │ L0 Asset │ → │ L1 Topo- │ → │ L2 Tele- │ → │ L3 Visualization │ │
│  │ Register │   │ logy     │   │ metry    │   │ (AR/VR)          │ │
│  └──────────┘   └──────────┘   └──────────┘   └────────┬─────────┘ │
│                                                         │           │
│  ┌──────────────────────────────────────────────────────┴─────────┐ │
│  │              D365 Guides Export Layer                          │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │ │
│  │  │ Guide       │  │ Step        │  │ 3D Content              │ │ │
│  │  │ Generator   │  │ Sequencer   │  │ Mapper                  │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼ Dataverse API
┌─────────────────────────────────────────────────────────────────────┐
│                   Microsoft Dynamics 365 Guides                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Guide       │  │ Step        │  │ 3D Content  │                 │
│  │ Entities    │  │ Entities    │  │ Library     │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                      │
│  Delivery Channels:                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ HoloLens 2  │  │ iOS/Android │  │ PC Author   │                 │
│  │ App         │  │ Mobile App  │  │ App         │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Integration Capabilities

| Capability | Description | ADPA Source |
|------------|-------------|-------------|
| **Guide Generation** | Create complete guides from templates | Document templates |
| **Step Sequencing** | Auto-generate step order from procedures | Process flows |
| **3D Anchoring** | Map steps to physical locations | L1 topology |
| **Content Population** | Fill steps with text, images, video | L0 asset data |
| **Telemetry Integration** | Show live data in guides | L2 telemetry |
| **Validation** | Ensure guide completeness | Governance engine |

---

## 2. Content Mapping

### 2.1 ADPA to D365 Guides Entity Mapping

| ADPA Entity | D365 Guides Entity | Mapping Logic |
|-------------|-------------------|---------------|
| `Document` (type: procedure) | `msmrw_guide` | 1:1 guide creation |
| `Document.sections[]` | `msmrw_guidestep` | Section → Step |
| `Asset` (L0) | `msmrw_3dmodel` reference | Asset → 3D anchor |
| `Relationship` (L1) | Step sequence | Topology → Flow |
| `Telemetry` (L2) | Dynamic content | Live data overlay |
| `Template` | Guide template | Reusable structure |

### 2.2 Guide Structure Generation

**Input: ADPA Procedure Document**

```yaml
document:
  id: "proc-hvac-filter-001"
  type: "procedure"
  title: "HVAC Filter Replacement Procedure"
  asset_ref: "asset-hvac-ahu-01"
  sections:
    - id: "step-1"
      title: "Safety Preparation"
      content: "Ensure unit is powered off and locked out"
      warnings:
        - "High voltage hazard"
      media:
        - type: "image"
          ref: "img-lockout-panel.png"
    - id: "step-2"
      title: "Access Filter Compartment"
      content: "Remove the four Phillips screws from the access panel"
      tools_required:
        - "Phillips screwdriver (#2)"
      media:
        - type: "3d_arrow"
          target: "screw-location-1"
    - id: "step-3"
      title: "Remove Old Filter"
      content: "Slide filter out noting airflow direction arrow"
      media:
        - type: "video"
          ref: "vid-filter-removal.mp4"
    - id: "step-4"
      title: "Install New Filter"
      content: "Insert new filter with arrow pointing in airflow direction"
      validation:
        - "Filter size matches: 20x25x4"
        - "Airflow arrow correctly oriented"
    - id: "step-5"
      title: "Reassemble and Test"
      content: "Replace access panel and restore power"
      telemetry_check:
        - state_key: "differential_pressure_pa"
          expected_range: [50, 150]
```

**Output: D365 Guides Structure**

```json
{
  "msmrw_guide": {
    "msmrw_name": "HVAC Filter Replacement Procedure",
    "msmrw_description": "Step-by-step guide for replacing HVAC AHU-01 filters",
    "msmrw_guideid": "guid-hvac-filter-001",
    "adpa_source_document": "proc-hvac-filter-001",
    "adpa_asset_ref": "asset-hvac-ahu-01"
  },
  "msmrw_guidesteps": [
    {
      "msmrw_stepnumber": 1,
      "msmrw_name": "Safety Preparation",
      "msmrw_instructiontext": "Ensure unit is powered off and locked out",
      "msmrw_warningtext": "⚠️ High voltage hazard",
      "msmrw_mediatype": "image",
      "msmrw_mediaref": "img-lockout-panel.png",
      "msmrw_anchortype": "QR",
      "msmrw_anchorid": "anchor-ahu-01-panel"
    },
    {
      "msmrw_stepnumber": 2,
      "msmrw_name": "Access Filter Compartment",
      "msmrw_instructiontext": "Remove the four Phillips screws from the access panel",
      "msmrw_toolsrequired": "Phillips screwdriver (#2)",
      "msmrw_3darrowenabled": true,
      "msmrw_3darrowtarget": "screw-location-1"
    },
    {
      "msmrw_stepnumber": 3,
      "msmrw_name": "Remove Old Filter",
      "msmrw_instructiontext": "Slide filter out noting airflow direction arrow",
      "msmrw_mediatype": "video",
      "msmrw_mediaref": "vid-filter-removal.mp4"
    },
    {
      "msmrw_stepnumber": 4,
      "msmrw_name": "Install New Filter",
      "msmrw_instructiontext": "Insert new filter with arrow pointing in airflow direction",
      "msmrw_validationchecklist": [
        "Filter size matches: 20x25x4",
        "Airflow arrow correctly oriented"
      ]
    },
    {
      "msmrw_stepnumber": 5,
      "msmrw_name": "Reassemble and Test",
      "msmrw_instructiontext": "Replace access panel and restore power",
      "msmrw_telemetrycheck": {
        "stateKey": "differential_pressure_pa",
        "expectedMin": 50,
        "expectedMax": 150,
        "displayFormat": "Current: {value} Pa (Expected: 50-150 Pa)"
      }
    }
  ]
}
```

---

## 3. Automated Guide Generation

### 3.1 Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Guide Generation Pipeline                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. TRIGGER                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Manual: User requests guide generation                  │   │
│  │ • Automatic: Document approved/baselined                  │   │
│  │ • Scheduled: Periodic sync                                │   │
│  │ • Event: Asset updated in L0                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  2. EXTRACTION                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Parse source document (procedure, work instruction)     │   │
│  │ • Identify steps, warnings, tools, media                  │   │
│  │ • Resolve asset references from L0                        │   │
│  │ • Map spatial relationships from L1                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  3. AI ENHANCEMENT                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Generate concise step instructions (≤100 chars)         │   │
│  │ • Suggest 3D arrow placements                             │   │
│  │ • Identify missing safety warnings                        │   │
│  │ • Recommend media attachments                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  4. VALIDATION                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Schema validation (D365 Guides requirements)            │   │
│  │ • Completeness check (all steps have instructions)        │   │
│  │ • Media validation (files exist, correct format)          │   │
│  │ • Anchor validation (QR codes or 3D models assigned)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  5. EXPORT                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Create/update guide in Dataverse                        │   │
│  │ • Upload media to D365 storage                            │   │
│  │ • Link 3D models from library                             │   │
│  │ • Set permissions and assignments                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│  6. TRACKING                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ • Record export in audit log                              │   │
│  │ • Link guide back to source document                      │   │
│  │ • Enable drift detection (source ↔ guide)                 │   │
│  │ • Notify stakeholders                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Guide Types and Templates

| Guide Type | Use Case | Auto-Generation Source |
|------------|----------|----------------------|
| **Maintenance Procedure** | Scheduled maintenance tasks | ADPA procedure documents |
| **Troubleshooting Guide** | Fault diagnosis and repair | Decision trees + asset data |
| **Training Module** | New employee onboarding | Training curriculum documents |
| **Safety Briefing** | Pre-work safety review | Safety procedures + hazard data |
| **Inspection Checklist** | Quality/compliance checks | Inspection templates |
| **Assembly Guide** | Equipment installation | Assembly procedures |
| **Operational Procedure** | Standard operating procedures | SOP documents |

### 3.3 AI-Assisted Content Generation

**Prompt Template for Step Generation:**

```
You are generating step-by-step instructions for a Dynamics 365 Guide.

CONTEXT:
- Asset: {asset_name} ({asset_type})
- Location: {location_path}
- Procedure Type: {procedure_type}

SOURCE CONTENT:
{section_content}

REQUIREMENTS:
1. Instruction text must be ≤100 characters (HoloLens display limit)
2. Use active voice, imperative mood ("Remove the panel" not "The panel should be removed")
3. Include specific measurements, part numbers, or values when available
4. Identify any implicit safety warnings
5. Suggest 3D arrow placement if spatial reference is mentioned

OUTPUT FORMAT (JSON):
{
  "instruction_text": "...",
  "extended_description": "...",
  "warnings": ["..."],
  "tools_required": ["..."],
  "suggested_3d_elements": [{"type": "arrow", "target": "..."}],
  "validation_checks": ["..."]
}
```

---

## 4. Technical Implementation

### 4.1 Dataverse API Integration

**Authentication:**

```typescript
// server/src/integrations/dynamics365/auth.ts
import { ConfidentialClientApplication } from '@azure/msal-node';

const msalConfig = {
  auth: {
    clientId: process.env.D365_CLIENT_ID,
    clientSecret: process.env.D365_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.D365_TENANT_ID}`
  }
};

const cca = new ConfidentialClientApplication(msalConfig);

export async function getDataverseToken(): Promise<string> {
  const result = await cca.acquireTokenByClientCredential({
    scopes: [`${process.env.D365_ENVIRONMENT_URL}/.default`]
  });
  return result.accessToken;
}
```

**Guide Creation:**

```typescript
// server/src/integrations/dynamics365/guidesService.ts
import axios from 'axios';
import { getDataverseToken } from './auth';

interface GuideStep {
  stepNumber: number;
  name: string;
  instructionText: string;
  warningText?: string;
  mediaType?: 'image' | 'video' | '3d';
  mediaRef?: string;
  toolsRequired?: string;
  validationChecklist?: string[];
}

interface Guide {
  name: string;
  description: string;
  steps: GuideStep[];
  sourceDocumentId: string;
  assetRef?: string;
}

export class Dynamics365GuidesService {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = `${process.env.D365_ENVIRONMENT_URL}/api/data/v9.2`;
  }

  async createGuide(guide: Guide): Promise<string> {
    const token = await getDataverseToken();
    
    // Create the guide entity
    const guideResponse = await axios.post(
      `${this.baseUrl}/msmrw_guides`,
      {
        msmrw_name: guide.name,
        msmrw_description: guide.description,
        adpa_sourcedocumentid: guide.sourceDocumentId,
        adpa_assetref: guide.assetRef
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      }
    );

    const guideId = guideResponse.headers['odata-entityid']
      .match(/\(([^)]+)\)/)[1];

    // Create steps
    for (const step of guide.steps) {
      await this.createGuideStep(guideId, step, token);
    }

    return guideId;
  }

  private async createGuideStep(
    guideId: string, 
    step: GuideStep, 
    token: string
  ): Promise<void> {
    await axios.post(
      `${this.baseUrl}/msmrw_guidesteps`,
      {
        msmrw_stepnumber: step.stepNumber,
        msmrw_name: step.name,
        msmrw_instructiontext: step.instructionText,
        msmrw_warningtext: step.warningText,
        msmrw_toolsrequired: step.toolsRequired,
        'msmrw_GuideId@odata.bind': `/msmrw_guides(${guideId})`
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  async updateGuide(guideId: string, guide: Partial<Guide>): Promise<void> {
    const token = await getDataverseToken();
    
    await axios.patch(
      `${this.baseUrl}/msmrw_guides(${guideId})`,
      {
        msmrw_name: guide.name,
        msmrw_description: guide.description
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  async deleteGuide(guideId: string): Promise<void> {
    const token = await getDataverseToken();
    
    await axios.delete(
      `${this.baseUrl}/msmrw_guides(${guideId})`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
  }

  async syncFromDocument(documentId: string): Promise<string> {
    // Fetch document from ADPA
    const document = await this.fetchAdpaDocument(documentId);
    
    // Transform to guide format
    const guide = this.transformDocumentToGuide(document);
    
    // Check if guide already exists
    const existingGuide = await this.findGuideBySourceDocument(documentId);
    
    if (existingGuide) {
      await this.updateGuide(existingGuide.id, guide);
      await this.syncGuideSteps(existingGuide.id, guide.steps);
      return existingGuide.id;
    } else {
      return await this.createGuide(guide);
    }
  }

  private transformDocumentToGuide(document: any): Guide {
    return {
      name: document.title,
      description: document.description || document.summary,
      sourceDocumentId: document.id,
      assetRef: document.asset_ref,
      steps: document.sections.map((section: any, index: number) => ({
        stepNumber: index + 1,
        name: section.title,
        instructionText: this.truncateInstruction(section.content),
        warningText: section.warnings?.join('; '),
        toolsRequired: section.tools_required?.join(', '),
        validationChecklist: section.validation
      }))
    };
  }

  private truncateInstruction(text: string): string {
    // D365 Guides has a 100 character limit for main instruction
    if (text.length <= 100) return text;
    return text.substring(0, 97) + '...';
  }
}
```

### 4.2 Express Routes

```typescript
// server/src/routes/dynamics365GuidesRoutes.ts
import { Router } from 'express';
import { Dynamics365GuidesService } from '../integrations/dynamics365/guidesService';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
const guidesService = new Dynamics365GuidesService();

// Schema validation
const createGuideSchema = Joi.object({
  documentId: Joi.string().uuid().required(),
  options: Joi.object({
    includeMedia: Joi.boolean().default(true),
    include3DAnchors: Joi.boolean().default(true),
    aiEnhancement: Joi.boolean().default(true)
  }).default()
});

const syncGuideSchema = Joi.object({
  documentIds: Joi.array().items(Joi.string().uuid()).min(1).required()
});

// Generate guide from document
router.post(
  '/generate',
  authenticate,
  validateRequest(createGuideSchema),
  async (req, res, next) => {
    try {
      const { documentId, options } = req.body;
      
      const guideId = await guidesService.syncFromDocument(documentId);
      
      res.json({
        success: true,
        data: {
          guideId,
          documentId,
          message: 'Guide generated successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk sync documents to guides
router.post(
  '/sync',
  authenticate,
  validateRequest(syncGuideSchema),
  async (req, res, next) => {
    try {
      const { documentIds } = req.body;
      
      const results = await Promise.allSettled(
        documentIds.map(id => guidesService.syncFromDocument(id))
      );
      
      const summary = {
        total: documentIds.length,
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        details: results.map((r, i) => ({
          documentId: documentIds[i],
          status: r.status,
          guideId: r.status === 'fulfilled' ? r.value : null,
          error: r.status === 'rejected' ? r.reason.message : null
        }))
      };
      
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
);

// Get sync status
router.get(
  '/status/:documentId',
  authenticate,
  async (req, res, next) => {
    try {
      const { documentId } = req.params;
      
      const guide = await guidesService.findGuideBySourceDocument(documentId);
      
      res.json({
        success: true,
        data: {
          synced: !!guide,
          guideId: guide?.id,
          lastSyncedAt: guide?.modifiedon,
          guideUrl: guide ? `${process.env.D365_ENVIRONMENT_URL}/main.aspx?appid=${process.env.D365_GUIDES_APP_ID}&pagetype=entityrecord&etn=msmrw_guide&id=${guide.id}` : null
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete guide
router.delete(
  '/:guideId',
  authenticate,
  async (req, res, next) => {
    try {
      const { guideId } = req.params;
      
      await guidesService.deleteGuide(guideId);
      
      res.json({
        success: true,
        message: 'Guide deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### 4.3 Environment Configuration

```bash
# server/.env additions for D365 Guides

# Azure AD App Registration
D365_CLIENT_ID=your-app-client-id
D365_CLIENT_SECRET=your-app-client-secret
D365_TENANT_ID=your-tenant-id

# Dynamics 365 Environment
D365_ENVIRONMENT_URL=https://your-org.crm.dynamics.com
D365_GUIDES_APP_ID=your-guides-app-id

# Optional: Power Platform Integration
POWER_PLATFORM_URL=https://your-org.api.powerplatform.com
```

---

## 5. Frontend Integration

### 5.1 Guide Generation UI Component

```typescript
// components/dynamics365/GuideGenerator.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileVideo, CheckCircle, ExternalLink } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { toast } from '@/hooks/use-toast';

interface GuideGeneratorProps {
  documentId: string;
  documentTitle: string;
  assetRef?: string;
}

export function GuideGenerator({ 
  documentId, 
  documentTitle, 
  assetRef 
}: GuideGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    synced: boolean;
    guideId?: string;
    guideUrl?: string;
    lastSyncedAt?: string;
  } | null>(null);
  
  const api = useApi();

  const checkStatus = async () => {
    try {
      const response = await api.get(`/dynamics365-guides/status/${documentId}`);
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Failed to check guide status:', error);
    }
  };

  const generateGuide = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post('/dynamics365-guides/generate', {
        documentId,
        options: {
          includeMedia: true,
          include3DAnchors: true,
          aiEnhancement: true
        }
      });
      
      toast({
        title: 'Guide Generated',
        description: `Successfully created guide in Dynamics 365`
      });
      
      await checkStatus();
    } catch (error: any) {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate guide',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-5 w-5" />
          Dynamics 365 Guides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Generate an interactive AR guide from this document
            </p>
            {assetRef && (
              <p className="text-xs text-muted-foreground mt-1">
                Linked asset: {assetRef}
              </p>
            )}
          </div>
          
          {syncStatus?.synced ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Synced
            </Badge>
          ) : (
            <Badge variant="outline">Not synced</Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={generateGuide} 
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : syncStatus?.synced ? (
              'Update Guide'
            ) : (
              'Generate Guide'
            )}
          </Button>
          
          {syncStatus?.guideUrl && (
            <Button variant="outline" asChild>
              <a 
                href={syncStatus.guideUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        {syncStatus?.lastSyncedAt && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 6. Use Cases

### 6.1 Maintenance Procedure Automation

**Scenario**: Facility has 500+ pieces of equipment, each with maintenance procedures.

**Traditional Workflow**:
1. Technician receives work order
2. Searches for paper manual or PDF
3. Interprets instructions
4. Performs task
5. Documents completion

**ADPA + D365 Guides Workflow**:
1. Work order triggers guide push to technician's HoloLens
2. Technician dons HoloLens, guide auto-loads
3. AR arrows point to exact locations
4. Step-by-step instructions overlay on equipment
5. Completion auto-recorded in system

**Impact**:
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Task completion time | 45 min | 28 min | 38% faster |
| Error rate | 8% | 1.2% | 85% reduction |
| Training time for new procedure | 4 hours | 30 min | 87% reduction |

### 6.2 Safety Training

**Scenario**: New employees need equipment-specific safety training.

**ADPA-Generated Safety Guide Structure**:
1. **Introduction**: Equipment overview with 3D model
2. **Hazard Identification**: AR highlights danger zones
3. **PPE Requirements**: Visual checklist
4. **Emergency Procedures**: Interactive walkthrough
5. **Knowledge Check**: AR-based quiz
6. **Certification**: Digital sign-off

### 6.3 Quality Inspection

**Scenario**: Quality inspectors perform 50+ point checks.

**ADPA Integration**:
- Inspection template → D365 Guide with validation steps
- Each inspection point anchored to physical location
- Pass/fail recorded per step
- Defects photographed and linked to guide
- Auto-generated inspection report in ADPA

---

## 7. Governance & Drift Detection

### 7.1 Source-Guide Synchronization

```
┌─────────────────────────────────────────────────────────────┐
│                    Drift Detection Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ADPA Document                    D365 Guide                 │
│  ┌─────────────┐                 ┌─────────────┐            │
│  │ Version 1.0 │ ═══════════════ │ Synced      │            │
│  └─────────────┘                 └─────────────┘            │
│        │                                                     │
│        ↓ Edit                                                │
│  ┌─────────────┐                 ┌─────────────┐            │
│  │ Version 1.1 │                 │ Out of Sync │            │
│  └─────────────┘                 └─────────────┘            │
│        │                               │                     │
│        │         DRIFT DETECTED        │                     │
│        │      ┌─────────────────┐     │                     │
│        └─────→│ Notification    │←────┘                     │
│               │ • Email         │                            │
│               │ • Dashboard     │                            │
│               │ • Auto-resync   │                            │
│               └─────────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Version Control

| Event | ADPA Action | D365 Guides Action |
|-------|-------------|-------------------|
| Document created | Record version | N/A (not synced) |
| Guide generated | Link guide ID | Create guide |
| Document edited | Increment version | Flag as stale |
| Document approved | Baseline created | Auto-resync if configured |
| Guide edited in D365 | Detect external change | Version incremented |
| Conflict detected | Alert user | Prevent overwrite |

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Task | Description | Deliverable |
|------|-------------|-------------|
| Azure AD setup | Register app, configure permissions | Auth working |
| Dataverse connection | API integration | CRUD operations |
| Basic guide creation | Single document → guide | End-to-end flow |
| UI component | Generate button | User can trigger |

### Phase 2: Enhancement (Weeks 5-8)

| Task | Description | Deliverable |
|------|-------------|-------------|
| AI step optimization | Truncate/enhance instructions | Better UX |
| Media handling | Upload images/videos | Rich guides |
| Bulk operations | Multi-document sync | Efficiency |
| Drift detection | Track sync status | Governance |

### Phase 3: Advanced (Weeks 9-12)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 3D anchor mapping | L1 topology → spatial anchors | AR precision |
| Telemetry integration | L2 data in guides | Live data |
| Analytics | Usage tracking from D365 | Insights |
| Templates | Reusable guide structures | Faster creation |

---

## 9. Configuration Reference

### 9.1 Required Permissions

**Azure AD App Permissions**:
```
Dynamics CRM:
  - user_impersonation (Delegated)

Microsoft Graph (optional for user lookup):
  - User.Read.All (Application)
```

**Dataverse Security Roles**:
- Guides Author
- Guides Content Author
- System Customizer (for schema extensions)

### 9.2 Custom Columns in Dataverse

Add to `msmrw_guide` entity:
```
adpa_sourcedocumentid  (Text, 100 chars)
adpa_assetref          (Text, 100 chars)
adpa_lastsyncversion   (Text, 50 chars)
adpa_syncstatus        (Choice: Synced, Stale, Conflict)
```

### 9.3 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/dynamics365-guides/generate` | Generate guide from document |
| POST | `/api/dynamics365-guides/sync` | Bulk sync documents |
| GET | `/api/dynamics365-guides/status/:documentId` | Check sync status |
| DELETE | `/api/dynamics365-guides/:guideId` | Delete guide |
| GET | `/api/dynamics365-guides/analytics` | Usage analytics |

---

## 10. Appendix

### 10.1 D365 Guides Entity Reference

| Entity | Logical Name | Purpose |
|--------|--------------|---------|
| Guide | msmrw_guide | Main guide container |
| Guide Step | msmrw_guidestep | Individual steps |
| 3D Object | msmrw_3dobject | 3D models/anchors |
| Guide Analytics | msmrw_guideanalytics | Usage data |

### 10.2 Sample Procedure Template

```yaml
# ADPA Procedure Template for D365 Guides Export
template:
  id: "tpl-maintenance-procedure"
  name: "Standard Maintenance Procedure"
  output_formats: ["markdown", "d365-guides"]
  
  sections:
    - id: "safety"
      title: "Safety Preparation"
      required: true
      fields:
        - name: "hazards"
          type: "array"
          items: "string"
        - name: "ppe_required"
          type: "array"
          items: "string"
        - name: "lockout_required"
          type: "boolean"
          
    - id: "steps"
      title: "Procedure Steps"
      required: true
      repeatable: true
      fields:
        - name: "instruction"
          type: "string"
          max_length: 100  # D365 Guides limit
        - name: "details"
          type: "text"
        - name: "tools"
          type: "array"
        - name: "media"
          type: "file"
          accept: ["image/*", "video/*"]
        - name: "anchor_point"
          type: "reference"
          entity: "asset"
          
    - id: "verification"
      title: "Verification"
      required: true
      fields:
        - name: "checklist"
          type: "array"
          items: "string"
        - name: "sign_off_required"
          type: "boolean"
```

---

*Document Version: 1.0*
*Last Updated: January 27, 2026*
*Classification: Technical Integration Guide*
