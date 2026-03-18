---
name: adpa-agent-orchestration
description: Reference and implementation guide for the ADPA 10-Phase Agent Orchestration Framework. Use when debugging, extending, or working with multi-agent orchestration, ECS reasoning, consensus, or temporal memory.
---

# ADPA 10-Phase Agent Orchestration Framework

## Overview
This skill provides the architectural blueprint for ADPA's advanced 10-Phase Agent Orchestration system. It details how the platform handles multi-agent decomposition, ECS (Evidence, Consensus, State) reasoning, tool learning, and unified evaluation.

## The 10 Phases

### Phase 1: Base ReAct Loop
- **Component**: `BaseAgent.ts`
- **Function**: Implements the core Plan-Act-Observe cognitive loop for individual agents.

### Phase 2: Parallel Orchestration
- **Component**: `OrchestratorAgent.ts`, `SubGoalResolver.ts`
- **Function**: Decomposes high-level user goals into discrete subgoals and resolves dependency graphs for parallel or serial execution.

### Phase 3: ECS Evidence Scoring
- **Component**: `ecs/ECSEngine.ts`
- **Function**: Validates and scores raw agent observations, turning them into weighted "Evidence Nodes."

### Phase 4: Contract-Driven Tools
- **Component**: `ToolRegistry.ts`, `ToolContract.ts`
- **Function**: Enforces input validation, output transformation, and base reliability scoring for all tool executions.

### Phase 5: Agent Capability Authority
- **Component**: `AgentCapabilities.ts`, `ecs/AuthorityScoring.ts`
- **Function**: Weights evidence based on the innate capability profile and specialization of the agent that produced it.

### Phase 6: Reputation-Aware Tool Usage
- **Component**: `ecs/ToolReputationService.ts`
- **Function**: Dynamically adjusts tool reliability scores based on historical success/failure rates and latency.

### Phase 7: Organizational Context & Policy Routing
- **Component**: `ProjectContextResolver.ts`, `OrganizationPolicyEngine.ts`
- **Function**: Applies project-specific policies (e.g., preferred AI providers, restricted capabilities) dynamically during the orchestration loop.

### Phase 8: Multi-Agent Review & Consensus
- **Component**: `ecs/MultiAgentReviewEngine.ts`, `ecs/ConsensusEngine.ts`
- **Function**: Cross-evaluates agent outputs using peer review. Builds a Collaboration Graph to calculate a final consensus score for the synthesized answer.

### Phase 9: Temporal Memory & State Persistence
- **Component**: `ecs/TemporalMemoryStore.ts`
- **Function**: Persists the evidence graph and consensus history, allowing the system to track state drift and maintain long-term context across sessions.

### Phase 10: Unified Evaluation Contract
- **Component**: `ecs/UnifiedEvaluationEngine.ts`
- **Function**: The final gatekeeper. Consolidates ECS, Consensus, and Temporal logic into a single high-integrity contract to produce the final, validated answer.

## Key Subsystems

### 1. ECS Reasoning (Evidence, Consensus, State)
The core epistemological engine of ADPA. It prevents hallucinations by treating all agent outputs as "claims" that must be weighted by authority, peer-reviewed for consensus, and tracked over time.

### 2. TemporalECSEngine
Enhances standard ECS reasoning with temporal decay and historical reinforcement. It ensures that older, outdated evidence loses weight over time compared to fresh data.

## Implementation Rules
1. **Never Bypass the Orchestrator**: High-level complex tasks MUST go through `OrchestratorAgent.orchestrate()` to ensure the full 10-phase pipeline is executed.
2. **Tools Must Have Contracts**: Any new tool added to `globalToolRegistry` should implement a `ToolContract` to participate in Phase 4 and Phase 6 reasoning.
3. **Evidence Over Answers**: Agents should focus on gathering concrete evidence. The `SynthesisEngine` and `ConsensusEngine` are responsible for drawing final conclusions.
