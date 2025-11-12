# Pester test examples

This folder contains example Pester tests used to validate repository structure, configuration files, and Bicep templates.

How to run (Windows / PowerShell):

1. Install Pester (if not installed):

```powershell
Install-Module -Name Pester -Force -Scope CurrentUser
```

2. Run all example tests:

```powershell
# From repo root
pwsh -NoProfile -Command "Invoke-Pester -Script .\tests-examples\pester\"
```

3. Run an individual test file:

```powershell
pwsh -NoProfile -Command "Invoke-Pester -Script .\tests-examples\pester\001_validate_repo_structure.tests.ps1"
```

CI: add a GitHub Actions workflow that runs the same Invoke-Pester commands on a Windows runner.

Notes:
- These tests are intentionally low-impact (they check file existence and JSON parseability). For live IaC validation you can extend tests to invoke `az bicep build` or use a Bicep linter in CI.
- Do not run more invasive scripts against production accounts from the tests. Keep tests read-only where possible.