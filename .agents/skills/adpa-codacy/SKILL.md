---
name: adpa-codacy
description: Exposes local Codacy CLI wrapper and dependency audits, verifying configurations against quality standards before push
---

# ADPA Codacy CLI Integration

## Purpose
Exposes local command line wrapper execution of Codacy static analysis CLI, integrating with pre-push hooks and dependency management, running locally or fallback via Docker.

## Invariants
- Default bindings must always map: `provider: gh`, `organization: mdresch`, `repository: adpa`
- The `rootPath` parameter must be standard, absolute, and NOT URL-encoded.
- Fallback route to Docker container must execute if `codacy-analysis-cli` is not found on path.
- Security checks via `trivy` tool must run after dependency updates.

## Key Files
| File | Role |
|------|------|
| [codacy.ts](file:///c:/Users/MennoDrescher/Source/Repos/adpa/scripts/codacy.ts) | Front-facing CLI script using commander |
| [codacyService.ts](file:///c:/Users/MennoDrescher/Source/Repos/adpa/server/src/modules/codacy/codacyService.ts) | Service containing core wrapper logic and command generator |
| [codacy.test.ts](file:///c:/Users/MennoDrescher/Source/Repos/adpa/server/src/__tests__/modules/codacy/codacy.test.ts) | Unit tests verifying arguments, default bindings, and fallbacks |

## Commands
```powershell
# Run manual scans
npx tsx scripts/codacy.ts --help
npx tsx scripts/codacy.ts --file package.json
npx tsx scripts/codacy.ts --tool trivy

# Run unit tests
cd server
npm run test:features -- codacy
npm run verify:governed-features
```
