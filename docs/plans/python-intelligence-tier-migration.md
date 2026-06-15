# Implementation Plan: Python Intelligence Tier Migration

## Goal Description
Integrate the Python-based Intelligence Tier (previously located in the external `AI-Foundry-Projects/services/intelligence` repository) directly into the ADPA ecosystem as the core reasoning engine.

## Proposed Changes

### `intelligence/`
- [NEW] Clone and set up the `AI-Foundry-Projects` source code into the ADPA monorepo under a new `intelligence/` folder.

### `orchestrator/Adpa.AppHost/Program.cs`
- [MODIFY] Update the .NET Aspire configuration to launch and wire up the ported Python service node as a dependency.

### `orchestrator/Adpa.Orchestrator/`
- [MODIFY] Execute tests against the `apiservice` to ensure the orchestrator correctly communicates with the Intelligence Tier.

## Verification Plan
- **Automated/E2E Verification**: Run the `.NET` orchestrator and verify that the ported dependency resolver, process orchestration logic, and generation pipeline successfully execute the 46 processes and generate deliverables.
