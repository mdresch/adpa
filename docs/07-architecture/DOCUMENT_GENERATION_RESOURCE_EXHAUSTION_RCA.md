# Root Cause Analysis: TypeScript Backend Not Completing Document-Generation Jobs / Running Out of Resources

**Date**: 2026-07-19, updated 2026-07-20
**Status**: Root causes 1 and 2 confirmed directly (live crash observed, deployment topology confirmed by user 2026-07-20). Root cause 3 (Puppeteer/Chromium) reclassified from "contingent on build method" to confirmed-broken — the build method that made it contingent isn't the one in use. See §5a for the 2026-07-20 update.
**Trigger**: Reported 2026-07-19 — "the TypeScript backend is not completing document generation tasks and running out of resources."

## 1. Method

This is a static investigation against the repository — deploy configs, startup code, and one piece of historical diagnostic evidence already checked into `docs/07-architecture/`. No live logs, metrics, or Azure Container Apps configuration were available in this session; where a claim depends on those, it's marked as unconfirmed in §5 rather than asserted.

## 2. What's actually deployed, and where

**Correction (2026-07-19, twice):** an earlier version of this RCA treated the Azure Container Apps hostname in `apphosting.yaml` (`https://adpa-backend.agreeablegrass-418bd4ba.westeurope.azurecontainerapps.io`) as the live backend. The user has confirmed this is wrong: **the frontend runs on Vercel (`vercel.json` — `pnpm build`/`pnpm install`, Next.js framework preset — confirms this is real and current) and the backend runs on Render, on the free tier.** `apphosting.yaml` (Firebase App Hosting) is stale/vestigial in its entirety — not just the backend hostname it names, since the frontend isn't on Firebase App Hosting either. It should be disregarded as evidence of anything about the live topology.

The user's answer named the backend as a single thing ("the backend is on Render," free tier) rather than describing separate API and worker services. This RCA treats **a single Render Web Service running both HTTP and queue-worker roles, on the free plan** as the working assumption, not a fully confirmed fact — it wasn't stated explicitly either way, and §5 still lists it as the first thing to verify. Everything downstream in this section is written against that assumption, flagged where it matters.

Two deploy-adjacent configs remain in the repo as candidates for what Render actually builds from — Render supports both, and nothing here confirms which:

- **`nixpacks.toml`** — the only config that references `ADPA_PROCESS_ROLE`, sets it to `api` only, and caps the heap at 384 MB. Render supports Nixpacks as a native (non-Docker) build method.
- **`server/Dockerfile`** — sets no `ADPA_PROCESS_ROLE` (defaults to `"all"`) and no heap cap. Render also supports Docker-runtime services.

`render.yaml` still only defines the Vercel-superseded frontend service and a stale `sync: false # Point to your Northflank backend URL` comment — Render services can be created directly in its dashboard without a blueprint entry, which is the most likely reason the backend service isn't represented here at all. No GitHub Actions workflow in `.github/workflows/` references Render, `nixpacks`, `containerapp`, or `ADPA_PROCESS_ROLE` (checked: `adpa-feature-validation.yml`, `orchestrator-governance.yml`, `queue-tests.yml`, `rpas-audit.yml`, `sync-docs-to-issues.yml`) — Render deployment is dashboard-managed, not CI-managed, in this repo.

**Confirmed: free tier.** Render's free plan is capped at 512 MB RAM and — per Render's own published behavior — free-tier web services spin down after a period of inactivity and cold-start on the next incoming request. Both are directly relevant: 512 MB is a hard ceiling regardless of which build config is in play, and a spin-down mid-job (or a job queued while the service is asleep) is an independent way for a document-generation job to never complete, unrelated to the API/worker process-role question in §3.1.

## 3. Evidence

### 3.1 The API/worker split exists in code and is correctly gated — but nothing in this repo turns the worker half on for the Azure deployment

- `server/src/utils/processRole.ts`: `getProcessRole()` reads `ADPA_PROCESS_ROLE` and **defaults to `"all"` when unset**. `shouldRunWorkers()` is true for `"worker"` or `"all"`; `shouldRunWebServer()` is true for `"api"` or `"all"`.
- `server/src/services/queueService.ts` (current version, 20 lines) gates *all* queue-consumer registration on this: `if (shouldRunWorkers() && process.env.NODE_ENV !== 'test') { import("./queue/registerWorkers").then(({ registerWorkers }) => registerWorkers()) }`. This is a clean, correctly-implemented gate — not a leak.
- `server/src/startup/dependencies/workers.ts` has the same gate a second time (`workersDependency.validate()`), skipping `require("../../jobs/documentConversionJob")` when `shouldRunWorkers()` is false.
- **`server/Dockerfile:59`**: `CMD ["node", "-r", "tsconfig-paths/register", "dist/server/src/server.js"]` — runs `server.js` directly, with **no `ENV ADPA_PROCESS_ROLE=...` anywhere in the file**. Per `getProcessRole()`'s default, this means the container runs with role `"all"` *unless* an external environment-variable configuration overrides it. Whether Render's backend service actually builds from this Dockerfile is unconfirmed (§2).
- Contrast: `nixpacks.toml` explicitly runs `npm run start:api` (`ADPA_PROCESS_ROLE=api`) and sets nothing for a worker counterpart in the same file — consistent with it being a partial config (API only) rather than evidence a worker exists elsewhere. package.json confirms `start:api`/`start:worker` are meant to run as **separate processes** (`worker.js` is a distinct entrypoint, `server/src/worker.ts`, with its own minimal HTTP health server and `process.env.SKIP_JOBS = "true"` to avoid double-running the stuck-job monitor).

**Reading of this evidence**: the code was built for a two-process split (a `start:api` process handling HTTP only, a `start:worker` process handling Bull/RabbitMQ jobs only). What's not yet known is whether Render's actual backend configuration (dashboard-managed, not in this repo) uses that split — e.g. a Render "Web Service" for `start:api` plus a separate Render "Background Worker" service for `start:worker` — or runs a single service with `ADPA_PROCESS_ROLE` unset (defaulting to `"all"`, combining both in one process) or set to `api` alone with no worker service at all. All three are consistent with the symptom; §5 lists what's needed to tell them apart.

### 3.2 A heap-size ceiling exists in `nixpacks.toml` — plausible now, not dismissible

`nixpacks.toml:17` sets `NODE_OPTIONS=--max-old-space-size=384` for the API process — an unusually small 384 MB V8 heap ceiling for a process that also bundles Puppeteer (`server/package.json:139`, `"puppeteer": "^24.34.0"`, a full install that downloads a bundled Chromium). Render's free tier is itself capped at 512 MB RAM total, which would make an explicit 384 MB heap ceiling a deliberate (if tight) fit rather than an oversight — worth checking directly rather than assuming either way. If Render instead builds from `server/Dockerfile`, no `NODE_OPTIONS` is set there, so Node's own default heap sizing (which scales with container memory) would govern, bounded by whatever Render plan/tier is configured.

### 3.3 Puppeteer/Chromium may not run at all in the `server/Dockerfile` image — if that's what Render builds from

`nixpacks.toml` explicitly installs `chromium` as a Nix package and points `PUPPETEER_EXECUTABLE_PATH` at it before starting the app — evidence that whoever wrote that config knew Puppeteer needs a working Chromium plus its native shared-library dependencies to launch headlessly, and that this is the *correct* pattern for this codebase's Puppeteer dependency. `server/Dockerfile`'s runner stage (`node:20-slim`) does **no** `apt-get install` of Chromium or its typical missing-library set (`libnss3`, `libatk-bridge2.0-0`, `libgbm1`, fonts, etc. — the standard "Puppeteer fails to launch in a slim Docker image" list) and sets no `PUPPETEER_EXECUTABLE_PATH`. It relies entirely on Puppeteer's own postinstall Chromium download succeeding and that bundled binary finding its runtime dependencies in `node:20-slim`, which commonly does not have them. If Render's backend service builds from this Dockerfile, and if this fails, PDF/DOCX export jobs (the `document-convert` queue job, `DocumentConversionJobService`) would throw or hang rather than complete — a plausible secondary contributor to "not completing document generation tasks," distinct from the AI-generation stage itself. If Render instead builds from `nixpacks.toml`, this specific risk doesn't apply, since that config already installs Chromium correctly.

### 3.4 This symptom has recurred before, and the prior fix didn't touch deployment topology

`docs/07-architecture/PENDING_JOBS_DIAGNOSTIC.md` (2025-12-07) recorded 49 pending jobs stuck in the database and not in the Bull queue, some **~33 days old**, plus a queue/database status mismatch. The follow-up work documented in `QUEUE_FIXES_APPLIED.md` and `QUEUE_REFACTORING_PHASE_STATUS.md` (same week, Dec 2025) fixed race conditions, a memory leak in interval cleanup, and non-atomic `addJob` inserts — real bugs, but all *in the job-tracking code itself*, not in deployment/process-role configuration. None of that work would prevent jobs from going permanently unprocessed if no worker-capable process is ever started, or would prevent resource contention from running API + worker + Puppeteer in one process. The fact that the same class of symptom (stuck/incomplete jobs) is being reported again roughly seven months later is consistent with a structural gap that was never addressed, rather than a regression of the Dec 2025 fixes.

## 4. Root causes, ranked by confidence

1. **(Confirmed)** — The backend runs on Render's free tier: 512 MB RAM hard ceiling, and free-tier web services spin down on inactivity and cold-start on the next request. A single 512 MB process handling HTTP traffic, multi-provider LLM calls, multi-stage document processing, entity extraction, quality audits, and (if bundled) Puppeteer/Chromium PDF/DOCX conversion is a tight fit on its face, independent of anything else in this RCA. A spin-down mid-job, or a job enqueued while the service is asleep, is also an independent way for "not completing" to happen that has nothing to do with process-role configuration.
2. **(Likely, working assumption per §2)** — No process with `ADPA_PROCESS_ROLE=worker` running independently of the API process; a single Render service handles both HTTP and Bull/RabbitMQ queue consumption. If that service doesn't explicitly set `ADPA_PROCESS_ROLE` (default `"all"`, matches `server/Dockerfile`) this is direct in-process contention on top of root cause 1's memory ceiling. If it explicitly runs `api` only (matches `nixpacks.toml`'s `start:api`) with genuinely no worker anywhere, jobs are never consumed at all — a different failure shape (permanently pending, not resource-thrashing) that would still read as "not completing." Not distinguishable from the repo alone; needs the Render dashboard.
3. **(Contributing, contingent on build method)** — If the Render service builds from `server/Dockerfile` rather than `nixpacks.toml`, Puppeteer/Chromium may not launch cleanly (§3.3), contributing additional failures/crashes to the `document-convert` job specifically, compounding whichever of 1/2 apply.

## 5. Open questions — need to be answered directly in the Render dashboard, not from this repo

- Is the backend genuinely one Render service, or does a separate Background Worker also exist for the queue? (This RCA's working assumption is "one service" per §2, based on how the user described it, but that wasn't stated as an explicit yes/no.)
- What build method does that service use — Docker (`server/Dockerfile`) or Nixpacks (`nixpacks.toml`)? Determines whether the 384 MB explicit heap cap or Node's un-set default applies, and whether the Puppeteer/Chromium risk in §3.3 applies.
- What `ADPA_PROCESS_ROLE` (if any) is set in that service's environment variables?
- Does Render's own metrics/logs for the backend service show OOM kills, restarts, or timeouts correlating with document-generation job attempts? This alone would likely confirm or rule out root cause 1 directly.

## 5a. 2026-07-20 update — confirmed via live evidence and user-confirmed deployment topology

Two fixes shipped 2026-07-19/20 (commits `713aeeb5`, `9ac044ec`) resolved the original "job never completes at all" symptom — a document generated successfully end-to-end after both landed. That confirms the ESM dynamic-import bug (`9ac044ec`) was a real, independent root cause: `queueService.ts`'s `import("./queue/registerWorkers")` threw `ERR_MODULE_NOT_FOUND` on every boot in production (confirmed via live Render logs), so worker queue consumers never registered at all. Fixed by adding explicit extensions to all 119 affected relative dynamic imports.

With that fixed, a second, still-open failure mode surfaced: a subsequent job (`3fb523db-a48b-46e0-a8c5-88cd638e3d67`, Cost Management Plan, provider `google`/`gemini-2.5-flash`) stalled at 10% ("Starting job...") for several minutes, then **the backend crashed and rebooted**. This is a live occurrence of root cause 1, not just a theoretical tier-limit risk.

The user has now confirmed the actual deployment topology directly, closing out the three open questions from §5:

- **Build method: Render's native "Node" environment, root directory `server/`.** Neither `server/Dockerfile` nor the repo-root `nixpacks.toml` is used. This makes both files vestigial for the live deployment, same status as `apphosting.yaml` — useful as reference/local-dev artifacts, not evidence of production behavior.
- **`ADPA_PROCESS_ROLE`: unset.** The configured start command runs the plain `start` script (`node -r tsconfig-paths/register dist/server/src/server.js`), which sets no role env var. Per `getProcessRole()`'s default, this resolves to `"all"` — a single process handles HTTP and Bull/RabbitMQ queue consumption together. Confirmed indirectly by the stalled job carrying a `Worker: worker-35960-...` id (something in-process did claim it) and directly explains why an AI-generation memory spike crashed request-serving too, not just the one job.
- **Puppeteer/Chromium: confirmed unavailable, not merely at-risk.** `server/.npmrc` sets `PUPPETEER_SKIP_DOWNLOAD=true`, and since Render installs directly inside `server/`, this setting is guaranteed to apply regardless of build method — there is no code path in the live deployment that installs a Chromium binary anywhere. The user confirmed PDF/DOCX export has never been observed working on Render. This was previously written up as "contingent on build method" (§3.3, §4.3) because that section assumed the Dockerfile *might* be what's building the image; it now isn't in the running at all, so this contributor is confirmed rather than conditional.

**Immediate mitigation (dashboard env vars, no code change, user applying directly in Render):**
- `NODE_OPTIONS=--max-old-space-size=384` — converts an unbounded V8 heap (current state: nothing caps it in this build path) into a catchable heap-exhaustion error instead of a hard OS-level OOM kill mid-request. Does not raise the 512MB ceiling itself.
- `ADPA_DOC_GEN_DRAFT_CONCURRENCY=1` — already-supported override (`documentGenerationService.ts:123`) that drops the default section-drafting concurrency of 2 down to 1, reducing peak memory during the drafting phase.

**Still open:** the Puppeteer/Chromium gap has no equivalent env-var-only mitigation in the current native-Node build path. The cleanest available fix is switching the Render service's build method to `server/Dockerfile`, which is already fixed and verified end-to-end (713aeeb5: builds cleanly, installs system Chromium + shared libs, confirmed rendering a PDF in the built image) — but that's a Render service-type change, not a code change, and is the user's call to make.

## 6. Relation to ADR-014

[ADR-014](ADR-014-python-intelligence-service-extraction.md) proposes moving LLM-orchestration work for document generation out of the Node process into a separately-deployed Python service (D3), which — if root cause 1(a)/1(b) above is confirmed — would remove exactly the workload that's currently either contending for resources inside a single Node process, or piling up unconsumed because no worker process exists. That ADR's Consequences section is updated to point here rather than asserting the resource-exhaustion claim without backing.

**This RCA does not recommend extraction as the first fix.** Changes are available immediately, entirely inside the existing TypeScript deployment on Render, and should be tried before the larger architectural move — in priority order, since root cause 1 is confirmed and the others are still candidates:

1. **Move the backend off Render's free tier**, or at minimum split it into a paid Web Service (API) and a paid Background Worker (queue) — matching what the code already supports via `ADPA_PROCESS_ROLE=api`/`worker`. This directly addresses the confirmed 512 MB ceiling and spin-down behavior, and is likely necessary regardless of what the other open questions turn up.
2. Confirm the Render service topology and build method (§5) to resolve whether root cause 2 is "in-process contention" or "jobs never consumed" — these call for different fixes (isolate the worker vs. actually deploy one).
3. Confirm Puppeteer/Chromium actually launches on Render (check logs for Chromium launch errors); if the service builds from `server/Dockerfile`, add the missing shared-library install that `nixpacks.toml` already does correctly, or switch the Docker build to install Chromium the same way.

If document-generation failures persist after those two are confirmed fixed, that's stronger evidence for ADR-014's D3 (moving the LLM-orchestration workload to a dedicated Python service) than what exists today.
