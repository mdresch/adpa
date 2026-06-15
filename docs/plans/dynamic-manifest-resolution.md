# Implementation Plan: Dynamic Manifest Resolution

## Goal Description
Eliminate merge conflict bottlenecks caused by parallel agents attempting to register new governed features into the monolithic `server/governed-features.manifest.json`.

## Proposed Changes

### `server/src/modules/`
- [NEW] Allow individual modules to declare a local `feature.manifest.json` alongside their `__tests__`.

### `server/scripts/run-governed-features.mjs`
- [MODIFY] Refactor the script to dynamically traverse the `server/src/modules/` directory and aggregate local manifests at runtime, rather than reading from a single root manifest file.

### `server/governed-features.manifest.json`
- [DELETE] Deprecate and remove the centralized manifest file to prevent further conflicts.

### `.agents/skills/adpa-governed-feature-loop/SKILL.md`
- [MODIFY] Update instructions to tell agents to create a local `feature.manifest.json` in the module directory instead of updating the root manifest.

## Verification Plan
- **Manual Verification**: Launch two agents concurrently working on different feature modules. Verify that neither encounters a git merge conflict when saving their respective manifest registrations and that `npm run test:features` still correctly discovers and runs all tests.
