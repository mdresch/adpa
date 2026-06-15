# Implementation Plan: Cross-Tier Integration Testing

## Goal Description
Address the "Polyglot Boundary" gap where Contract Guards (Jest) currently only test the Node.js backend tier. Establish a formal cross-tier testing strategy to ensure API payloads and RabbitMQ messages remain structurally sound when passing between the Next.js frontend, Express backend, .NET Aspire orchestrator, and Python Intelligence services.

## Proposed Changes

### `orchestrator/Adpa.AppHost`
- [MODIFY] Integrate a Consumer-Driven Contract testing framework (e.g., Pact) or centralized OpenAPI schema validation during the build phase.

### `server/src/__tests__/e2e/`
- [NEW] Establish cross-tier E2E suites using Playwright or cross-service API tests to run simulated multi-tier workflows.

### `.agents/skills/adpa-aev-workflow/SKILL.md`
- [MODIFY] Add "Gate 6: Cross-Tier Contract Validation" to the AEV workflow.

## Verification Plan
- **Automated Tests**: Run the new cross-tier E2E suite to confirm passing integration tests.
- **Manual Verification**: Create a test PR that intentionally breaks an API schema between Next.js and .NET. Verify that Gate 6 accurately blocks the change and prevents the merge.
