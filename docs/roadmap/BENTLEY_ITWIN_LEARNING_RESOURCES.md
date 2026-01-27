# Bentley iTwin Learning Resources

**Last Updated**: 2026-01-24  
**Purpose**: Reference guide for developers working on iTwin Platform integration

---

## Overview

This document provides learning resources and accreditation information for developers working on ADPA's iTwin Platform integration. The resources cover essential concepts including data synchronization, federation, visualization, and querying iTwin data.

---

## Bentley Accredited Developer Program

### Program: iTwin Platform - Associate Level

**What is Accreditation?**

Accreditation is an endorsement from Bentley Systems that verifies learners have the essential skills in the latest Bentley applications to be a productive asset to their employer. Users acquire professional expertise through courseware that is project and role-oriented.

**Benefits:**
- ✅ Professional expertise through project and role-oriented courseware
- ✅ Best practices and Bentley-recommended workflows
- ✅ Increased productivity through proven methodologies
- ✅ Join the community of Bentley accredited professionals
- ✅ Peer recognition and professional networking
- ✅ Publicly verifiable digital badge via Credly
- ✅ Ability to advertise professional skills for AEC projects

---

## Program Requirements

### Step 1: Complete the Course

**Course**: Introduction to the iTwin Platform  
**Location**: [developer.bentley.com](https://developer.bentley.com)

The main course content is hosted at developer.bentley.com. You need to review the course content using the link: [Introduction to the iTwin Platform](https://developer.bentley.com)

### Step 2: Pass the Assessment

**Assessment Details:**
- **Duration**: 75 minutes
- **Questions**: 50 questions
- **Passing Score**: 74%
- **Attempts**: Maximum 5 attempts
- **Lockout Period**: 24 hours between failed attempts
- **After 5 Failures**: Course locks out; contact Bentley Accreditation Team for reset

**Assessment Access:**
Upon completion of the Bentley Accredited Developer: iTwin Platform - Associate - Program Overview course, the participant can access the online assessment using the assessment course module.

**Badge Issuance:**
Upon successful completion of the Assessment (with a passing score), a digital badge will be issued to the participant within 24 hours via Credly, our official credential partner.

---

## Relevance to ADPA Digital Twin Implementation

This accreditation program covers key concepts directly relevant to our Digital Twin implementation:

### 1. Data Synchronization and Federation
- **Our Implementation**: Event ingestion, state snapshots, multi-platform connectors
- **Relevance**: Understanding how iTwin handles data synchronization helps optimize our event-driven architecture
- **Components**: 
  - `digitalTwinEventService.ts` - Event ingestion
  - `digitalTwinStateUtils.ts` - State management
  - `connectorManager.ts` - Multi-platform federation

### 2. Visualization
- **Our Implementation**: iTwin Viewer component for 3D iModel visualization
- **Relevance**: Best practices for viewer implementation and user experience
- **Components**:
  - `components/digital-twin/iTwinViewer.tsx` - Viewer component
  - `app/projects/[id]/digital-twins/imodel-viewer/page.tsx` - Full-page viewer

### 3. Querying iTwin Data
- **Our Implementation**: iTwin connector for fetching asset data
- **Relevance**: Efficient data retrieval patterns and API usage
- **Components**:
  - `server/src/services/connectors/iTwinConnector.ts` - Platform API integration
  - `server/src/config/itwin.config.ts` - Configuration

---

## Who Should Pursue This Accreditation?

### Recommended For:

1. **Backend Developers**
   - Working on `iTwinConnector.ts`
   - Implementing event ingestion and state management
   - Building platform integrations

2. **Frontend Developers**
   - Implementing `iTwinViewer.tsx`
   - Building Digital Twin UI components
   - Working on visualization features

3. **Full-Stack Developers**
   - End-to-end Digital Twin feature development
   - Platform connector development
   - Integration testing

4. **Technical Leads**
   - Architecture decisions
   - Best practices implementation
   - Team knowledge transfer

---

## Getting Started

### 1. Register at Bentley Developer Portal

1. Visit [developer.bentley.com](https://developer.bentley.com)
2. Click **Sign In** and sign in using your Bentley account credentials
3. If you have not already registered, click **Register now** and complete the registration process

### 2. Access the Course

1. Navigate to the **Introduction to the iTwin Platform** course
2. Review all course content
3. Complete any practice exercises

### 3. Take the Assessment

1. Access the assessment via the assessment course module
2. Allocate 75 minutes for the assessment
3. Answer all 50 questions
4. Achieve a passing score of 74% or higher

### 4. Receive Your Badge

- Digital badge issued within 24 hours via Credly
- Badge is publicly verifiable
- Can be shared on LinkedIn, resumes, and professional profiles

---

## Contact Information

**Bentley Accreditation Team:**
- **Email**: `accreditation@bentley.com` or `iTwinDevProgram@bentley.com`
- **Subject Line**: "iTwin Developer Accreditation"

**For Questions About:**
- Course content
- Assessment issues
- Badge issuance
- Program requirements
- Course resets (after 5 failed attempts)

---

## Additional Learning Resources

### Official Documentation

- **[iTwin.js Documentation](https://www.itwinjs.org/)** - Complete API reference and guides
- **[iTwin Viewer Tutorials](https://www.itwinjs.org/learning/tutorials/)** - Step-by-step viewer tutorials
- **[iTwinUI React Components](https://itwinui.bentley.com/docs)** - Bentley React UI library
- **[Bentley Developer Portal](https://developer.bentley.com)** - Registration, apps, and resources

### Code Examples

- **[iTwin Viewer Vite Template](https://www.npmjs.com/package/@itwin/web-viewer)** - Official viewer template
- **[iTwin.js GitHub](https://github.com/iTwin)** - Open source repositories and examples

### ADPA-Specific Resources

- **[ITWIN_VIEWER_SETUP.md](./ITWIN_VIEWER_SETUP.md)** - Setup guide for ADPA's iTwin Viewer
- **[DIGITAL_TWIN_IMPLEMENTATION_STATUS.md](./DIGITAL_TWIN_IMPLEMENTATION_STATUS.md)** - Current implementation status
- **[DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md](../../plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md)** - Implementation plan

---

## Study Tips

### Before Taking the Assessment

1. **Complete the Full Course**: Don't skip any modules
2. **Take Notes**: Document key concepts, especially around:
   - Data synchronization patterns
   - Federation architecture
   - Visualization best practices
   - Query optimization
3. **Review ADPA Implementation**: Connect course concepts to our codebase
4. **Practice**: Use our development environment to experiment with concepts

### During the Assessment

1. **Time Management**: 75 minutes for 50 questions = ~1.5 minutes per question
2. **Read Carefully**: Questions may have multiple correct answers; choose the best one
3. **Use Process of Elimination**: Eliminate obviously wrong answers first
4. **Don't Rush**: You have enough time; use it wisely

### After Passing

1. **Update Your Profile**: Add the Credly badge to LinkedIn and professional profiles
2. **Share Knowledge**: Help team members understand key concepts
3. **Apply Learning**: Implement best practices in our codebase
4. **Continue Learning**: Consider advanced Bentley courses

---

## Integration with ADPA Development

### Applying Accreditation Knowledge

**Data Synchronization:**
- Review our event ingestion patterns in `digitalTwinEventService.ts`
- Optimize state snapshot creation in `digitalTwinStateUtils.ts`
- Improve connector polling strategies

**Visualization:**
- Enhance `iTwinViewer.tsx` with best practices
- Improve user experience in viewer components
- Implement proper error handling and loading states

**Querying:**
- Optimize API calls in `iTwinConnector.ts`
- Implement efficient caching strategies
- Reduce unnecessary data fetching

---

## Success Stories

*This section can be updated as team members complete the accreditation.*

---

**Last Updated**: 2026-01-24  
**Status**: Active Learning Resource  
**Next Review**: After first team member completes accreditation
