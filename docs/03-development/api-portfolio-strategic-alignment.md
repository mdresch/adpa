# Portfolio strategic alignment API (OKRs)

Base path: `/api/portfolio`. All routes require authentication.

**Auth:** `Authorization: Bearer <JWT>` (or `?token=` for the same token). The JWT payload must include `userId` matching `public.users.id`.

Database tables/views come from `supabase/migrations/20260507133000_strategic_goals.sql` (SC-84).

---

## Strategic goals

### `GET /api/portfolio/goals?status=active`

Returns strategic goals filtered by status (default `active`), including owner email and usage counts.

**Query parameters**

- `status`: one of `active | achieved | deferred | cancelled`

**Response:** `200` JSON array of goal rows, plus:

- `owner_email`
- `project_count`
- `key_result_count`

**Example**

```http
GET /api/portfolio/goals?status=active
Authorization: Bearer <token>
```

---

### `POST /api/portfolio/goals`

Creates a strategic goal and optional key results.

**Authorization:** requires role `admin` or `super_admin`.

**Body (JSON)**

- `title` (string, required)
- `description` (string, optional)
- `category` (string, optional)
- `target_date` (string date, optional; e.g. `2026-12-31`)
- `priority` (number, optional; default `0`)
- `owner_id` (uuid, optional; default current user)
- `key_results` (array, optional): each item:
  - `description` (string, required)
  - `target_value` (number, optional)
  - `unit` (string, optional)
  - `due_date` (string date, optional)

**Responses**

- `201` created goal row
- `400` validation error
- `403` forbidden (non-admin)
- `409` conflict (goal title already exists)

**Example**

```http
POST /api/portfolio/goals
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Reduce operational costs by 20%",
  "category": "Efficiency",
  "target_date": "2026-12-31",
  "priority": 8,
  "key_results": [
    { "description": "Automate 80% of manual processes", "target_value": 80, "unit": "%" }
  ]
}
```

---

## Project ↔ goal linkage

### `GET /api/portfolio/strategic-alignment?project_id=<uuid>`

Lists goal links for a project, including `goal_title`, `goal_category`, `goal_priority`, and `project_name`.

**Note:** You may also query by `goal_id` to list supporting projects.

**Responses**

- `200` JSON array
- `400` if neither `project_id` nor `goal_id` is provided, or invalid UUID

**Examples**

```http
GET /api/portfolio/strategic-alignment?project_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

```http
GET /api/portfolio/strategic-alignment?goal_id=6ba7b810-9dad-11d1-80b4-00c04fd430c8
Authorization: Bearer <token>
```

---

### `POST /api/portfolio/strategic-alignment`

Creates or updates a project ↔ goal link (upsert on `(project_id, goal_id)`).

**Authorization:** allowed for project owner/team members and admins.

**Body (JSON)**

- `project_id` (uuid, required)
- `goal_id` (uuid, required)
- `contribution_level` (string, optional; one of `critical | high | medium | low`; default `medium`)
- `alignment_score` (number or null, optional; 0–1)
- `notes` (string or null, optional)

**Responses**

- `201` with the upserted row
- `400` validation error / missing foreign keys
- `403` forbidden (no project access)

**Example**

```http
POST /api/portfolio/strategic-alignment
Authorization: Bearer <token>
Content-Type: application/json

{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "goal_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "contribution_level": "high",
  "alignment_score": 0.75,
  "notes": "Directly enables the Q4 revenue expansion plan."
}
```

---

### `DELETE /api/portfolio/strategic-alignment?project_id=<uuid>&goal_id=<uuid>`

Removes a project ↔ goal link.

**Authorization:** allowed for project owner/team members and admins.

**Responses**

- `200` `{ "success": true }`
- `404` if link not found

