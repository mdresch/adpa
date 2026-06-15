# Codacy Test & CLI Integration Design Spec

Date: 2026-06-13
Status: Approved

## Problem
In local development, developers lack a fast, deterministic method to validate code quality and security against Codacy standards before push. Running full repository lints is slow and currently fails due to the ESLint v9 flat config mismatch. Without a local wrapper, code quality and dependency safety (such as checking for CVEs with Trivy) can only be verified asynchronously in the remote pull request checks, increasing loop cycles and risk.

## Success Criteria
- [ ] Implement a command line wrapper script that exposes local Codacy analysis.
- [ ] Provide automatic fallback to running the Codacy Analysis CLI inside a Docker container if no local binary exists.
- [ ] Implement a Jest test suite checking all configuration mapping, argument parsing, and fallback routing.
- [ ] Expose commands via `package.json` scripts.
- [ ] Register the feature as a Governed Feature under `server/governed-features.manifest.json`.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **REQ-001** | The wrapper MUST discover if `codacy-analysis-cli` is installed in the system PATH. | P0 |
| **REQ-002** | If the CLI binary is missing, the wrapper MUST fallback to executing the analysis via Docker (`codacy/codacy-analysis-cli`). | P0 |
| **REQ-003** | The wrapper MUST map default parameter values: `provider` to `gh`, `organization` to `mdresch`, and `repository` to `adpa`. | P0 |
| **REQ-004** | The wrapper MUST support a single file analysis mode by accepting a relative or absolute file path. | P0 |
| **REQ-005** | The wrapper MUST support a dependency security audit mode that triggers `trivy` scans. | P1 |
| **REQ-006** | The workspace root path (`rootPath`) passed to the analyzer MUST be standard, non-URL-encoded. | P0 |
| **REQ-007** | The feature packet MUST be registered in `server/governed-features.manifest.json` and pass all manifest validation checks. | P0 |

## Interaction Rules (Overlap)
- **Pre-Push Hook**: The Codacy CLI check must run alongside current pre-push validations without blocking the developer if Docker or the internet is unavailable (graceful failure).
- **Linter System**: The linter check uses the standard configuration in the repository root `.codacy.yml`.

## Risks

| Risk | Mitigation |
|------|------------|
| Docker Desktop is not running during local dev | CLI wrapper handles the missing docker command or engine gracefully, prints instructions, and exits with a warning. |
| URL-encoded paths on Windows break mounts | Absolute path string manipulation resolves backslashes to forward slashes for Docker run. |

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| **REQ-001** | `codacy.test.ts` -> "Codacy Integration" -> "should identify local binary presence" |
| **REQ-002** | `codacy.test.ts` -> "Codacy Integration" -> "should construct correct Docker fallback arguments" |
| **REQ-003** | `codacy.test.ts` -> "Codacy Integration" -> "should enforce provider, org, and repo default bindings" |
| **REQ-004** | `codacy.test.ts` -> "Codacy Integration" -> "should map relative file paths correctly" |
| **REQ-005** | `codacy.test.ts` -> "Codacy Integration" -> "should format Trivy tool argument" |
| **REQ-006** | `codacy.test.ts` -> "Codacy Integration" -> "should ensure rootPath is not URL encoded" |
