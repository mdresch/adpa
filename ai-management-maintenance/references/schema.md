# Database Schema Reference

## ai_providers Table
Primary source of truth for all AI providers and their configurations.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | varchar(191) | Unique identifier (cuid). |
| `name` | varchar(256) | Display name of the provider. |
| `type` | varchar(256) | Provider type (e.g., 'openai', 'google', 'ollama'). |
| `base_url` | text | API base URL. |
| `api_key` | text | API key (may be encrypted). |
| `is_enabled` | integer | Status (1 = enabled, 0 = disabled). |
| `status` | varchar | Connection status ('connected', 'error', 'disabled'). |
| `configuration` | jsonb | Additional settings (model, temperature, etc.). |
| `available_models`| jsonb | Array of models discovered or configured. |
| `default_model` | varchar(100) | Primary model to use for this provider. |
| `priority` | integer | Selection order (lower values = higher precedence). |

## ai_usage_logs Table
Records every AI request for analytics and cost tracking.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary key. |
| `user_id` | uuid | User who made the request. |
| `provider_type` | varchar | e.g., 'google', 'openai'. |
| `model_name` | varchar | Name of the model used. |
| `total_tokens` | integer | Sum of prompt and completion tokens. |
| `response_time_ms`| integer | Latency in milliseconds. |
| `success` | boolean | Whether the request succeeded. |
| `estimated_cost` | numeric | Calculated cost in USD. |
| `created_at` | timestamp | Timestamp of the request. |
