---
name: preserving-jest-tests
description: Use when finishing coding tasks, completing feature packets, cleaning up development branches, or preparing pull requests to ensure that E2E, integration, and unit tests are preserved as regression guards.
---

# Preserving Jest Tests

## Overview
Deletions of Jest or integration tests upon completing a task or PR are strictly prohibited. Tests are permanent regression guards that ensure code changes do not break existing features as the platform scales.

## When to Use
- **Completing a task or feature implementation**: Retain all new tests.
- **Refactoring code**: Run the existing tests to catch regressions. Do not delete them.
- **Cleaning up files or branches**: Keep test files intact; delete only scratch files in the scratch directory.

### When NOT to Use
- Temporary debug scripts (which belong in the `<appDataDir>/brain/<conversation-id>/scratch/` folder).

## Core Pattern

### Incorrect Approach (Deleting temporary tests)
```bash
# ❌ INCORRECT: Deleting tests after confirming they passed
rm server/src/__tests__/integration/feature.test.ts
git commit -m "completed feature, removed temp test files"
```

### Correct Approach (Preserving tests and registering them)
```bash
# ✅ CORRECT: Preserving the test file and committing it to the repo
git add server/src/__tests__/integration/feature.test.ts
# Register the test in the governed manifest if applicable
git add server/governed-features.manifest.json
git commit -m "feat: implement feature and add regression tests"
```

## Quick Reference

| Action | Policy |
| --- | --- |
| Creating a new feature test | **Must** commit to version control under `src/__tests__/` or `__tests__/`. |
| Cleaning up post-completion | **Never** delete `.test.ts` or `.test.tsx` files. |
| Feature manifest matching | **Must** register test patterns in `governed-features.manifest.json`. |

## Red Flags
- *"I'll clean up this test file since the implementation is verified."* (Tests must remain as regression guards).
- *"This test was only for verification during development."* (All development verification tests should become automated CI regression tests).
- *"Deleting the tests keeps the code clean."* (Code cleanliness refers to implementation style, not removing test coverage).

## Common Mistakes & Fixes
- **Mistake:** Accidentally leaving tests unregistered in `governed-features.manifest.json`, causing verification checks to fail.
  - **Fix:** Register the test path pattern under the matching feature block in `governed-features.manifest.json`.
- **Mistake:** Writing tests that require database boot on environments where it's not configured.
  - **Fix:** Mock database/messaging calls or support bypassing via `ADPA_SKIP_TEST_DB_BOOTSTRAP=1` inside `setup.ts`.
