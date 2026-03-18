# Reference Case: Ideation Template

## Template Metadata
- **Name**: Ideation Template
- **Framework**: Custom
- **Category**: Documentation
- **Current Status**: 🟢 Production (v3)
- **Primary Purpose**: Creative brainstorming to organize scattered thoughts into structured concept documents.

## Performance Metrics (Live Snapshot)
- **Validation Runs**: 56
- **Success Rate**: 98.21% (55 Successful / 1 Failure)
- **Health Rating**: Excellent
- **Total Documents Generated**: 18
- **Total Semantic Units (Entities) Extracted**: 1,606

## Entity Profile (Extraction Distribution)
This template primarily drives the following entity types in the Governance Knowledge Graph (GKG):

| Entity Type | Count |
| :--- | :--- |
| **Requirement** | 282 |
| **Activity** | 242 |
| **Deliverable** | 176 |
| **BestPractice** | 175 |
| **Constraint** | 143 |
| **WorkItem** | 134 |
| **SuccessCriteria** | 128 |
| **Risk** | 107 |
| **Milestone** | 73 |
| **Opportunity** | 67 |
| **Phase** | 51 |
| **GovernanceDecision** | 21 |

## Optimization History (Continuous Learning)
The template has evolved through automated recommendations:
- **v1.0.0 - v1.0.3**: Initial seeding and structural stabilizing.
- **v2.0**: Major update driven by quality gate feedback. Improvements included:
    - **Completeness**: Automated detection of unpopulated placeholders.
    - **Accuracy**: Logic added to prevent "future date" hallucinations and "invented metrics."
    - **Prompt Enhancement**: Refinement of system prompts to reduce passive voice and improve source attribution consistency.
- **v3.0**: Production-ready version with batch generation support (up to 10 docs).

## Learning Loop Context
The Ideation Template acts as a **Foundational Template**. In sequential orchestration, it is often run first to establish the high-level project structure, requirements, and risks, which then provide the necessary context for downstream technical or financial templates.
