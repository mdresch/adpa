---
name: adpa-railway-deploy
description: ADPA backend deployment, verification, and troubleshooting on Railway. Use when the user wants to deploy, check production status, or fix deployment "Skipped" errors.
---

# ADPA Railway Deployment

## Overview
Procedural guidance for deploying and verifying the ADPA backend on Railway production.

## Standard Deployment
Run the following script from the repository root to deploy and verify:
```powershell
.\scripts\railway-deploy-and-verify.ps1
```

### Script Options
- `-SkipDeploy`: Check status and logs without triggering a new build.
- `-DeployOnly`: Trigger build without pre-checks.
- `-LinkProject`: Link to ADPA Railway project if not already connected.

## Troubleshooting Logic

| If output contains... | Action |
| :--- | :--- |
| "Unauthorized" / "Login" | Tell user to run `railway login` in their terminal. |
| "operation timed out" | Check [Railway Dashboard](https://railway.com/project/2edbb1d3-ddf4-4c9f-bd25-40bb88f07ca3) for status. |
| "Skipped: No Changes" | Use a dummy commit or check Railway watch paths. |

## Production Health Check
Verify the deployment manually:
`curl https://adpa-production.up.railway.app/health`
