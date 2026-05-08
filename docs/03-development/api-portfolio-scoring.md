# Portfolio scoring API (Next.js App Router)

Base path: `/api/portfolio`. All routes require authentication unless noted.

**Auth:** `Authorization: Bearer <JWT>` (or `?token=` for the same token). The JWT payload must include `userId` matching `public.users.id`.

---

## Criteria

### `GET /api/portfolio/criteria`

Returns active criteria (`is_active = true`), sorted by name.

**Response:** `200` — JSON array of rows with `id`, `name`, `description`, `weight`, `min_score`, `max_score`, `is_active`.

**Example:**

```http
GET /api/portfolio/criteria
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### `POST /api/portfolio/criteria`

Creates a criterion. **Requires** role `admin` or `super_admin`.

**Body (JSON):**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `name` | string | yes | Non-empty after trim |
| `description` | string | no | |
| `weight` | number | no | Default `1.0`; must be finite and &gt; 0 |
| `min_score` | integer | no | Default `1` |
| `max_score` | integer | no | Default `5`; must be ≥ `min_score` |

**Responses:** `201` with the created row; `400` validation error; `403` if not admin; `401` if not authenticated.

**Example:**

```http
POST /api/portfolio/criteria
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Strategic fit",
  "description": "Alignment with company strategy",
  "weight": 1.5,
  "min_score": 1,
  "max_score": 5
}
```

---

## Scores

### `GET /api/portfolio/scores?project_id=<uuid>`

Returns scores for a project with criterion name, weight, and scorer email.

**Responses:** `200` JSON array; `400` if `project_id` missing; `401` if not authenticated.

**Example:**

```http
GET /api/portfolio/scores?project_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

---

### `POST /api/portfolio/scores`

Creates or updates one score (upsert on `(project_id, criterion_id)`). After a successful write, the server **awaits** `public.refresh_portfolio_rankings()` so the rankings materialized view is updated before the response is returned (errors during refresh are logged; the score write is still committed).

**Body (JSON):**

| Field | Type | Required |
|--------|------|----------|
| `project_id` | uuid | yes |
| `criterion_id` | uuid | yes |
| `score` | number | yes | Must lie within the criterion’s `min_score`–`max_score` (and table `CHECK` constraints) |
| `rationale` | string | no |

**Responses:** `201` with the upserted row; `400` invalid input or score out of range; `404` unknown or inactive criterion; `401` if not authenticated.

**Example:**

```http
POST /api/portfolio/scores
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "criterion_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "score": 4,
  "rationale": "Strong sponsor engagement"
}
```

---

### `POST /api/portfolio/scores/bulk`

Applies many scores for one project in a **single transaction**. Refreshes rankings after commit (same behavior as single score POST).

**Body (JSON):**

| Field | Type | Required |
|--------|------|----------|
| `project_id` | uuid | yes |
| `scores` | array | yes | Each element: `{ "criterion_id", "score", "rationale?" }` |

**Responses:** `200` `{ "success": true }`; `400` validation / out-of-range; `404` missing criterion; `401` if not authenticated.

**Example:**

```http
POST /api/portfolio/scores/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "scores": [
    { "criterion_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "score": 4, "rationale": "Fit" },
    { "criterion_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "score": 5 }
  ]
}
```

---

## Rankings

### `GET /api/portfolio/rankings`

Paged list of rows from `portfolio_rankings` joined with `projects` (`status`, `start_date`, `end_date`, `budget`).

**Query parameters:**

| Param | Default | Notes |
|--------|---------|--------|
| `limit` | 50 | Clamped to 1–200 |
| `offset` | 0 | ≥ 0 |

**Response:** `200` JSON:

```json
{
  "rankings": [ /* rows */ ],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```

`total` is the full count of ranking rows (not just the current page).

**Example:**

```http
GET /api/portfolio/rankings?limit=20&offset=0
Authorization: Bearer <token>
```

---

## Implementation notes

- DB objects are defined in `supabase/migrations/20260507105500_portfolio_prioritization_tables.sql` (criteria, scores, materialized view `portfolio_rankings`, `refresh_portfolio_rankings()`).
- Route sources: `app/api/portfolio/criteria/route.ts`, `app/api/portfolio/scores/route.ts`, `app/api/portfolio/scores/bulk/route.ts`, `app/api/portfolio/rankings/route.ts`.
- Integration tests: `server/src/__tests__/api/portfolio-next-routes.test.ts` (requires `DATABASE_URL` / local DB and env files as in other Jest DB tests).
