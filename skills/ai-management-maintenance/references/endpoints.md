# API Endpoints Reference

## AI Providers (/api/ai-providers)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List all providers. |
| `POST` | `/:name/configure` | Update provider settings (including priority). |
| `POST` | `/providers/:id/toggle`| Toggle active status. |
| `GET` | `/providers/:id/discover-models` | Fetch suggested models from provider API. |
| `POST` | `/providers/:id/sync-models` | Persist discovered models and set default. |

## AI Models (/api/ai-models)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/providers/:id/models` | Get all saved models for a provider. |
| `POST` | `/providers/:id/models` | Add/Update a specific model config. |

## AI Analytics (/api/ai-analytics)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/overview` | Global usage summary. |
| `GET` | `/models` | Usage breakdown by model. |
| `GET` | `/trends` | Timeline of usage data. |
| `GET` | `/providers/:id` | Stats for a specific provider. |
