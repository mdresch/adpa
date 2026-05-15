name: adpa-agent-orchestration
description: Reference and implementation guide for the ADPA 10-Phase Agent Orchestration system. Cover both the architectural cognitive loops and the operational project-level lifecycle. Use when debugging, extending, monitoring, or managing agent runs.


## System Architecture

The orchestration framework operates at two distinct levels:
1. **Level 1: Cognitive Architectural Phases** (The "DNA" of a single agent interaction)
2. **Level 2: Project Management Lifecycle Phases** (The "Workflow" of a multi-phase project run)

---

## Level 1: Cognitive Architectural Phases
These phases define the internal reasoning loop of the ADPA agents during any individual task execution.

### Phase 1: Base ReAct Loop
- **Component**: `BaseAgent.ts`
- **Function**: Implements the core Plan-Act-Observe cognitive loop.

### Phase 2: Parallel Orchestration
- **Component**: `OrchestratorAgent.ts`, `SubGoalResolver.ts`
- **Function**: Decomposes high-level goals into subgoals for parallel execution.

### Phase 3: ECS Evidence Scoring
- **Component**: `ecs/ECSEngine.ts`
- **Function**: Validates and scores raw agent observations as "Evidence Nodes."

### Phase 4: Contract-Driven Tools
- **Component**: `ToolRegistry.ts`, `ToolContract.ts`
- **Function**: Enforces validation and reliability scoring for tool executions.

### Phase 5: Agent Capability Authority
- **Component**: `AgentCapabilities.ts`, `ecs/AuthorityScoring.ts`
- **Function**: Weights evidence based on agent specialization profiles.

### Phase 6: Reputation-Aware Tool Usage
- **Component**: `ecs/ToolReputationService.ts`
- **Function**: Adjusts tool reliability based on historical performance.

### Phase 7: Organizational Context & Policy Routing
- **Component**: `ProjectContextResolver.ts`, `OrganizationPolicyEngine.ts`
- **Function**: Applies project-specific policies and AI provider restrictions.

### Phase 8: Multi-Agent Review & Consensus
- **Component**: `ecs/MultiAgentReviewEngine.ts`, `ecs/ConsensusEngine.ts`
- **Function**: Cross-evaluates outputs and calculates collaboration consensus.

### Phase 9: Temporal Memory & State Persistence
- **Component**: `ecs/TemporalMemoryStore.ts`
- **Function**: Tracks state drift and maintains long-term context across sessions.

### Phase 10: Unified Evaluation Contract
- **Component**: `ecs/UnifiedEvaluationEngine.ts`
- **Function**: Consolidates ECS logic into a single high-integrity contract for final validation.

---

## Level 2: Project Management Lifecycle Phases (Operational)
The standard project orchestration implemented in `ProjectPhaseOrchestrator.ts` executes these 10 phases sequentially to manage a project's lifecycle.

| Phase | Name | Domain | Goal |
|---|---|---|---|
| 1 | **Project Discovery** | `discovery` | Ingest project docs, integrations, and linked systems. |
| 2 | **Stakeholder Analysis** | `pmbok` | Identify stakeholders and formulate a communication plan. |
| 3 | **Scope & Requirements** | `pmbok` | Define scope baseline and decompose goal requirements. |
| 4 | **Risk Assessment** | `pmbok` | Score risks via PMBOK and devise mitigation strategies. |
| 5 | **Work Breakdown Structure** | `pmbok` | Decompose deliverables into a full WBS (PMBOK 5.4). |
| 6 | **Resource & Timeline** | `pmbok` | Map resources, estimate duration, and produce schedule. |
| 7 | **Integration & Sync** | `integration` | Sync plans/tasks to Jira, GitHub, and Confluence. |
| 8 | **Quality & Governance** | `pmbok` | Define metrics, governance rules, and audit trails. |
| 9 | **Execution Monitoring** | `discovery` | Configure drift detection and progress tracking baselines. |
| 10 | **Synthesis & Reporting** | `general` | Final ECS-evaluated project health report and summary. |

---

## Operational Management

### Persistence & Storage
- **`AgentRunStore.ts`**: Manages the persistence of runs in PostgreSQL.
  - Tables: `agent_runs`, `agent_run_phases`, `agent_run_events`.
  - Use `agentRunStore.getRunWithPhases(runId)` to inspect the full trace of an execution.
  - Use `agentRunStore.listProjectRuns(projectId)` to see history.

### Real-Time Monitoring (Streaming)
- **`StreamingBus.ts`**: A Socket.io-based event bus for broadcasting execution telemetry.
  - Events include: `run_start`, `phase_start`, `thought`, `action`, `observation`, `phase_end`, etc.
  - Clients subscribe to a `runId` to receive live updates.

### Steering & Human-in-the-Loop
- Runs can be steered mid-execution via `POST /api/agents/run/:runId/guide`.
- The `OrchestratorAgent` checks for guidance messages between iterations to adjust its path.


## Key Subsystems

### 1. ECS Reasoning (Evidence, Consensus, State)
The core epistemological engine of ADPA. It prevents hallucinations by treating all agent outputs as "claims" that must be weighted by authority, peer-reviewed for consensus, and tracked over time.

### 2. TemporalECSEngine
Enhances standard ECS reasoning with temporal decay and historical reinforcement. It ensures that older, outdated evidence loses weight over time compared to fresh data.

## Implementation Rules
1. **Never Bypass the Orchestrator**: High-level complex tasks MUST go through `OrchestratorAgent.orchestrate()` or `ProjectPhaseOrchestrator.run()` to ensure the full pipeline is executed.
2. **Tools Must Have Contracts**: Any new tool added to `globalToolRegistry` should implement a `ToolContract` to participate in ECS reasoning.
3. **Persist All Significant Events**: Every thought, action, and observation that contributes to a phase result MUST be appended to the `AgentRunStore`.
4. **Use `StreamingBus` for Feedback**: External UI visibility is critical. Always broadcast phase transitions and significant agent thoughts via `streamingBus.emitToRun()`.
5. **Evidence Over Answers**: Agents should focus on gathering concrete evidence. The `SynthesisEngine` and `ConsensusEngine` are responsible for drawing final conclusions.

