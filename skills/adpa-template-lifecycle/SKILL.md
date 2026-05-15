---
name: adpa-template-lifecycle
description: Manage the ADPA Template Lifecycle including creation, versioning, quality gates, HITL management, entity profiling, GKG integration, and continuous prompt optimization. Use when architecting, building, or refining dynamic templates and document generation pipelines.
---

# ADPA Template Lifecycle & Learning Management

## Overview
This skill defines the end-to-end continuous learning and management lifecycle for ADPA templates. It covers everything from initial template creation and versioning to dynamic entity extraction, human-in-the-loop (HITL) quality gating, and the continuous AI-driven optimization loop that refines system and user prompts.

## 1. Template Development Lifecycle
Templates in ADPA are treated as living, version-controlled software assets.
- **Phases**: `Draft` -> `Testing` -> `Active` (Production) -> `Deprecated`.
- **Version Control**: Every change to a template's content or system prompt is versioned. Updates track what changed and why, enabling rollbacks if generation quality drops.
- **System Prompts**: The core logic defining *how* the LLM should process the template context. This includes the `system_prompt` field in the database, defining tone, structure, and extraction rules.

## 2. Dynamic Entity Extraction & Knowledge Domains
Templates do not exist in isolation; they drive the knowledge graph.
- **Entity Profiling**: Each template defines an "entity profile" indicating which data points it requires (inputs) and which it produces (outputs).
- **Knowledge Domains**: Templates are categorized by primary knowledge domains (e.g., Risk Management, Resource Planning). 
- **Sequential Execution**: The system orchestrates document generation by running templates in sequence. It ensures that prerequisite context (extracted entities from previous documents) is available *before* running a downstream template.

## 3. GKG (Governance Knowledge Graph) Integration
The GKG forms the contextual backbone of the generation process.
- **Pre-Flight Context**: Before a template is executed, the system queries the GKG to inject relevant historical context, policies, and prior entities.
- **Post-Flight Sync**: Newly generated documents undergo entity extraction, and the resulting nodes are immediately synced back into the GKG, continuously evolving the knowledge base.

## 4. Quality Gates & HITL Management
Document generation must meet strict quality standards.
- **Quality Gates**: Automated checks (Phase 10 evaluation) verify that generated documents contain required sections, adhere to the system prompt, and lack hallucinations.
- **HITL (Human-in-the-Loop)**: High-risk or low-confidence generations are flagged for human review. 
- **Validation Metrics**: The system tracks validation progress, tracking how many generated documents pass quality gates vs. require HITL intervention.

## 5. Metrics & Health Tracking
Each template maintains a live health dashboard.
- **Usage Tracking**: Count of documents generated using the template.
- **Success Rate**: Percentage of documents that pass quality gates without HITL modification.
- **Health Status**: An aggregated score combining success rate, generation latency, and user feedback. 

## 6. The Recommendation & Optimization Loop (Continuous Learning)
The template system is self-improving based on outcomes.
- **Feedback Ingestion**: Failures at quality gates or heavy HITL edits trigger the optimization loop.
- **Prompt Refinement**: The system analyzes patterns in failures (e.g., "The model consistently misses the risk severity") and generates **recommendations** to improve the template's `system_prompt` or user instructions.
- **Evolution**: Better templates with refined prompts generate higher-quality documents, which in turn feed cleaner entities into the GKG, creating a virtuous cycle of continuous improvement.

## Invocation & Actions
Use this skill to guide architectural decisions when:
- Designing new templates that require complex data orchestration.
- Implementing quality gates or HITL review screens for document generation.
- Building the analytics pipelines that measure template success rates.
- Tuning system prompts based on extraction or generation failures.
## Resources
- **Database Schema**: [schema.md](references/schema.md)
- **API Endpoints**: [endpoints.md](references/endpoints.md)
- **Case Study**: [ideation-example.md](references/ideation-example.md) (Live metrics and entity profile)