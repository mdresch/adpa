# Implementation Plan: Agent Execution Sandboxes

## Goal Description
Resolve file locking conflicts between active human developer sessions (e.g., C# Hot Reload via `dotnet watch`) and background agent validation gates (`dotnet build`). Agents need isolated execution environments to prevent lock errors like `error MSB3021: The process cannot access the file`.

## Proposed Changes

### `.devcontainer/` or `docker/agent-sandbox/`
- [NEW] Define a lightweight, ephemeral Docker container specifically for Agent Validation Gates. It must contain the .NET SDK, Node.js, pnpm, and necessary orchestration tools.

### `.agents/skills/adpa-aev-workflow/SKILL.md`
- [MODIFY] Update Gates 2 and 3 to execute build and orchestration tests *inside* the sandbox container rather than directly on the host OS. 
- Example: `docker run --rm agent-sandbox dotnet build -c Release`

## Verification Plan
- **Manual Verification**: Run `dotnet watch run --project orchestrator/Adpa.AppHost` on the host machine. Concurrently, dispatch an agent to run the AEV workflow on a dummy PR. Verify the agent successfully builds and validates without encountering file lock errors.
