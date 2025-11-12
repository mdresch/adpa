Create issues from JSON payloads (safe local runner)

What this does
- Reads all JSON files in `.github/ISSUE_PAYLOADS/`.
- Fetches existing issues from the target repository to avoid creating duplicates (dedupe by exact title match).
- Creates issues for payloads that don't already exist.

Security notes
- This script requires a GitHub personal access token (PAT) provided via the `GITHUB_TOKEN` environment variable. Do NOT paste tokens into chat. Prefer creating a new, minimal-scope token with only the `repo` (issues) scope.
- Run this script locally on your machine so your token never leaves your environment. The script does network calls to GitHub to list & create issues.

Usage

Option A — Load token from environment (quick)

1) Set a token in your shell (example — supply a freshly created minimal token):

   set GITHUB_TOKEN=ghp_xxxyourtokenxxx

2) Run the node script (replace owner/repo with the repo target):

   node .github/scripts/create_issues.js mdresch/adpa

Option B — Use `.env` and the PowerShell helper (Windows)

1) Create a `.env` file at the repository root with the following line (do NOT commit it):

   GITHUB_TOKEN=ghp_xxxyourtokenxxx

2) Run the helper which will load `.env` into the process environment and invoke the script:

   pwsh -NoProfile -ExecutionPolicy Bypass -File .\.github\scripts\run_create_issues.ps1 mdresch/adpa

Notes
- The script will list skipped (existing) issues and newly-created issues.
- Keep your `.env` private — do not commit it. Prefer creating a new, minimal-scope token with only the `repo` (issues) scope.
- If you want me to run this for you, provide explicit authorization and a fresh token in your secure terminal — or better: run it locally and paste the results here and I'll help with any follow-ups.
