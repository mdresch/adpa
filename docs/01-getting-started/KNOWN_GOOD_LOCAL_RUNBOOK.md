# Known Good Local Runbook

Minimal, repeatable local startup for ADPA.

## 1) Prerequisites

- Node.js 18+
- `pnpm` installed
- Internet access to Supabase/Railway/AI services used by your `.env` files

## 2) One-time setup

From repo root:

```bash
pnpm install
cd server && npm install && cd ..
```

Create env files if missing:

```bash
cp .env.local.example .env.local
cp server/.env.example server/.env
```

## 3) Start services (2 terminals)

Terminal A (backend):

```bash
cd server
npm run dev
```

Terminal B (frontend):

```bash
cd ..
pnpm dev
```

Notes:
- Do **not** run `pnpm dev` inside `server/` (backend uses `npm run dev`).
- Keep backend on port `5000` and frontend on `3000`.

## 4) Health checks

Backend health:

```bash
curl http://127.0.0.1:5000/health
```

Frontend shell:

```bash
curl http://127.0.0.1:3000
```

Proxy connectivity check (expects auth error, which still proves proxy path works):

```bash
curl -i http://127.0.0.1:3000/api/gkg/summary
```

Expected:
- `5000/health` returns `200`
- `3000` returns `200`
- `/api/gkg/summary` returns `401` when unauthenticated

## 5) Run Firebase Auth locally

The frontend already supports the Firebase Auth emulator. To use it locally:

1. In `.env.local`, enable the emulator flags:

```bash
NEXT_PUBLIC_FIREBASE_USE_AUTH_EMULATOR="true"
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
```

2. Start the Auth emulator from the repo root:

```bash
pnpm firebase:auth
```

3. Start or restart the frontend after changing env vars:

```bash
pnpm dev
```

Notes:
- `firebase.json` already maps Auth to port `9099`.
- Set `NEXT_PUBLIC_FIREBASE_USE_AUTH_EMULATOR="false"` or unset it to go back to the real Firebase project.
- The emulator UI is available on the port shown by the Firebase CLI when it starts.

## 6) Fast troubleshooting

### `ECONNREFUSED ::1:5000`
- Use `127.0.0.1` for local checks.
- Ensure backend is running in `server/` via `npm run dev`.

### Firebase Auth still hits the live project
- Confirm `NEXT_PUBLIC_FIREBASE_USE_AUTH_EMULATOR="true"` is present in `.env.local`.
- Restart `pnpm dev` after editing env vars.
- Ensure the emulator is running with `pnpm firebase:auth`.

### Frontend compiles but API calls fail
- Confirm backend terminal is still running.
- Restart frontend after config changes:

```bash
pnpm dev
```

### Port 5000 already in use (PowerShell)

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

## 7) Known-good quick test path

1. Open `http://127.0.0.1:3000`
2. Log in
3. Open Integrations page
4. Confirm no proxy `ECONNREFUSED` errors in frontend terminal
