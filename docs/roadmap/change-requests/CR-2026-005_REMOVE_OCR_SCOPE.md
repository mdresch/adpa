# Change Request: Remove OCR from ADPA Project Scope

**CR ID**: CR-2026-005  
**Project**: ADPA - Advanced Data Processing Analytics Framework  
**Project ID**: 45083436-7e90-4ecf-aa42-e4a73c4b64b7  
**Submitted By**: Menno Drescher (Project Manager)  
**Submitted Date**: October 20, 2025  
**Priority**: High  
**Type**: Scope Reduction  
**Status**: 📋 Draft (Pending CCB Approval)

---

## Executive Summary

**Proposed Change**: Remove Optical Character Recognition (OCR) capabilities and all Python-based ML model training from the ADPA project scope.

**Reason**: The current baseline includes OCR integration and custom ML model training, but the actual implementation uses API-based AI services (OpenAI, Google AI) that don't require OCR or Python. This creates a scope-reality mismatch that inflates budget/timeline estimates.

**Impact**: 
- ✅ **Positive Budget Impact**: ~$15,000-20,000 savings
- ✅ **Faster Delivery**: ~3-4 weeks time savings
- ✅ **Reduced Complexity**: Simpler architecture
- ✅ **Lower Risk**: No custom ML model uncertainty

**Recommendation**: **APPROVE** - Aligns scope with actual implementation approach.

---

## Current Baseline (What We Said We'd Do)

### Scope Baseline - Current References to OCR:

**From Project Documents:**

1. **Scope Management Plan** states:
   > "Implementation and fine-tuning of advanced OCR capabilities for text extraction"

2. **Technical Baseline** includes:
   > "OCR Integration (implementation and fine-tuning of advanced OCR capabilities)"

3. **Technology Stack** lists:
   - Optical Character Recognition (OCR)
   - Python (for ML/NLP, e.g., Spacy, NLTK)
   - TensorFlow, PyTorch (for AI/ML model development)
   - AWS Textract/Azure AI Document Intelligence
   - ImageMagick (for image manipulation)
   - Apache Tika (document type detection)

4. **Activity List** includes:
   - ACT-402: "Implement Image Pre-processing Service" (Python, OpenCV)
   - ACT-501: "Research and Select OCR & NLP Models"
   - ACT-502: "Develop and Train Custom Entity Extraction Model" (Python)

5. **Resource Estimates** allocate:
   - ML Engineer (100% x 6 weeks) for model training
   - Data Scientist (NLP) for entity extraction
   - Python development expertise

6. **Cost Baseline** includes:
   - OCR licensing/service costs: $2,000-5,000
   - ML model training infrastructure: $2,000-3,000
   - Python ML engineer labor: ~120 hours

**Total OCR-Related Scope**: ~15-20% of project effort

---

## Proposed Change (What We'll Actually Do)

### New Technical Approach: API-Based AI

**ADPA's Actual Implementation:**

**Technology Stack (Revised):**
- ✅ Node.js/TypeScript (backend) - **No Python**
- ✅ OpenAI SDK (pre-trained models via API)
- ✅ Google AI SDK (Gemini via API)
- ✅ Anthropic SDK (Claude via API)
- ✅ Mistral AI SDK (via API)
- ❌ ~~OCR libraries~~ - **Not needed**
- ❌ ~~TensorFlow/PyTorch~~ - **Not needed**
- ❌ ~~Python ML development~~ - **Not needed**

**What ADPA Does:**
```typescript
// Instead of custom OCR + ML training:
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Use pre-trained models via API
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ 
    role: "user", 
    content: "Analyze this document and extract project baseline..." 
  }]
});
```

**Benefits:**
- ✅ Faster: No model training required
- ✅ Cheaper: No GPU infrastructure needed
- ✅ Better: Pre-trained models are superior
- ✅ Simpler: Node.js stack only
- ✅ Scalable: Cloud-managed AI services

---

## Impact Analysis

### 1. Scope Impact

**Remove from Scope:**
- ❌ OCR integration (AWS Textract, Tesseract)
- ❌ Image pre-processing service
- ❌ Custom ML model training
- ❌ Python development
- ❌ NLP library integration (spaCy, NLTK)
- ❌ GPU infrastructure for model training

**Add to Scope (Clarification):**
- ✅ Multi-provider AI API integration (OpenAI, Google, Anthropic, Mistral)
- ✅ AI Gateway for provider failover
- ✅ API-based document analysis

**Net Scope Change:** Reduction of ~15-20% of technical work

---

### 2. Schedule Impact

**Activities to Remove:**

| Activity ID | Activity Name | Duration | Savings |
|-------------|---------------|----------|---------|
| ACT-402 | Implement Image Pre-processing Service | 8 days | -8 days |
| ACT-501 | Research and Select OCR & NLP Models | 10 days | -10 days |
| ACT-502 | Develop and Train Custom Entity Extraction Model | 15 days | -15 days |
| **Total** | | | **-33 days** |

**Timeline Impact:**
- Current: 119.4 workdays
- Revised: ~86 workdays (29% faster)
- **New Completion Date**: ~Mid-January 2026 (vs Feb 26, 2026)

**OR**: Use saved time as additional buffer/testing

---

### 3. Cost Impact

**Cost Reductions:**

| Cost Category | Current | Revised | Savings |
|---------------|---------|---------|---------|
| **Labor - ML Engineer** | $24,000 | $0 | **-$24,000** |
| **Labor - Data Scientist (NLP)** | $5,400 | $0 | **-$5,400** |
| **OCR Services/Licensing** | $3,000 | $0 | **-$3,000** |
| **GPU Training Infrastructure** | $2,000 | $0 | **-$2,000** |
| **Python ML Libraries** | $500 | $0 | **-$500** |
| **AI API Costs (NEW)** | $0 | $3,000 | **+$3,000** |
| **Net Savings** | | | **-$31,900** |

**New Budget:**
- Current: $75,000
- Revised: $43,100
- **42.5% cost reduction!** 🎉

**OR**: Reallocate $31,900 to other priorities (better AI models, more features)

---

### 4. Resource Impact

**Resources No Longer Needed:**
- ❌ ML Engineer (100% x 6 weeks)
- ❌ Data Scientist (NLP) (25% x 6 weeks)
- ❌ Python developers

**Resources Still Required:**
- ✅ Node.js/TypeScript developers
- ✅ API integration expertise
- ✅ DevOps for cloud deployment

**Net Resource Impact**: -1.25 FTE (freed up for other work)

---

### 5. Quality Impact

**Quality Improvements:**
- ✅ **Better Accuracy**: Pre-trained models (GPT-4, Gemini) > custom models
- ✅ **Faster Iteration**: No model training cycles
- ✅ **Lower Maintenance**: Cloud-managed services
- ✅ **Better Support**: Enterprise SLAs from providers

**No Negative Quality Impact** ✅

---

### 6. Risk Impact

**Risks Eliminated:**

| Risk ID | Risk Description | Probability | Impact |
|---------|------------------|-------------|--------|
| R-T-02 | AI/ML model accuracy below 95% threshold | Medium | High |
| R-T-05 | Insufficient training data for ML models | Medium | Medium |
| R-014 | Data quality issues impact model training | Medium | Medium |

**New Risks Introduced:**

| Risk ID | Risk Description | Mitigation |
|---------|------------------|------------|
| R-NEW-01 | API provider outages | Multi-provider failover already implemented |
| R-NEW-02 | API cost increases | Monitor usage, set budget alerts, multiple providers |

**Net Risk Impact**: **Positive** (high technical risks removed)

---

## Recommended Actions

### Immediate Actions (If Approved):

1. **Update Baseline Documents:**
   - Scope Management Plan
   - Technical Baseline
   - Activity List (remove ACT-402, ACT-501, ACT-502)
   - Resource Estimates by Activity
   - Cost Management Plan
   - Schedule Management Plan

2. **Update Project Budget:**
   - Reduce from $75,000 to $43,100
   - **OR** reallocate savings to enhancements

3. **Update Timeline:**
   - Remove 33 days from critical path
   - Adjust milestones
   - **OR** increase contingency buffer

4. **Rerun Baseline Extraction:**
   - Generate Baseline V3.0 with corrected scope
   - Verify no OCR references in new baseline
   - Confirm improved feasibility score

---

## Change Control Board (CCB) Decision

**Voting Members:**
- Executive Sponsor: ______________
- Project Manager (Menno Drescher): ______________
- Business Analyst: ______________

**Recommendation**: **APPROVE**

**Rationale:**
- Aligns scope with actual technical approach
- Significant cost savings ($31,900)
- Faster delivery (33 days saved)
- Lower technical risk
- Better quality outcomes (pre-trained models)
- No negative impact on core objectives

---

## Approval Signatures

| Role | Name | Decision | Date | Signature |
|------|------|----------|------|-----------|
| **Project Manager** | Menno Drescher | Recommended | Oct 20, 2025 | |
| **Executive Sponsor** | TBD | | | |
| **Business Analyst** | TBD | | | |

---

## Implementation Plan (If Approved)

**Phase 1: Documentation Update (Week 1)**
- Update all baseline documents
- Remove OCR references
- Update tech stack documentation

**Phase 2: Baseline Rebaseline (Week 1)**
- Archive current baseline (V2.0)
- Extract new baseline (V3.0) with corrected scope
- Validate no OCR references

**Phase 3: Communication (Week 1)**
- Notify all stakeholders of scope change
- Update project charter
- Update stakeholder expectations

**Phase 4: Budget/Schedule Adjustment (Week 2)**
- Decide: Return savings to budget OR reallocate
- Decide: Accelerate timeline OR increase buffer
- Update financial reports

---

## Appendix: Detailed Scope Changes

### Documents Requiring Updates:

1. **Scope Management Plan** - Remove OCR from in-scope items
2. **Technical Baseline** - Remove Python, OCR, ML training
3. **Activity List** - Remove 3 activities (ACT-402, 501, 502)
4. **Activity Duration Estimates** - Remove associated estimates
5. **Resource Estimates by Activity** - Remove ML Engineer, Data Scientist
6. **Cost Management Plan** - Reduce budget by $31,900
7. **Schedule Management Plan** - Adjust timeline by -33 days
8. **Risk Register** - Remove R-T-02, R-T-05, R-014

**Total Documents Impacted**: 8

---

**Status**: Ready for CCB review and approval.

**Next Steps**: Present to CCB, obtain decision, implement if approved.

