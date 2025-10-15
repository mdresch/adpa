# AI Models Configuration - Database-Driven

## Overview

As of this migration, AI model configuration is **database-driven** instead of hardcoded in TypeScript. This allows you to:

- ✅ Add/remove models without code changes
- ✅ Update model names when providers deprecate old ones
- ✅ Set different default models per provider
- ✅ Customize models based on your needs

## Quick Start

### 1. Run the Migration

```bash
cd server
npm run migrate:ai-models
```

This will:
- Add `available_models` JSONB column to `ai_providers` table
- Add `default_model` VARCHAR column to `ai_providers` table
- Populate existing providers with current working models

### 2. Verify the Migration

After running the migration, you'll see a table showing all providers with their model counts and default models.

## Database Schema

### New Columns

```sql
-- Available models for each provider (JSON array)
available_models JSONB DEFAULT '[]'

-- Default model to use when none is specified
default_model VARCHAR(100)
```

### Example Data

```json
{
  "name": "Google Gemini",
  "provider_type": "google",
  "available_models": [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
  ],
  "default_model": "gemini-1.5-flash"
}
```

## Managing Models

### View Current Models

```sql
SELECT 
  name,
  provider_type,
  default_model,
  available_models
FROM ai_providers
WHERE is_active = true;
```

### Add a New Model

```sql
UPDATE ai_providers
SET available_models = available_models || '["new-model-name"]'::jsonb
WHERE name = 'Google Gemini';
```

### Remove a Deprecated Model

```sql
UPDATE ai_providers
SET available_models = available_models - 'gemini-pro'
WHERE name = 'Google Gemini';
```

### Change Default Model

```sql
UPDATE ai_providers
SET default_model = 'gemini-1.5-pro'
WHERE name = 'Google Gemini';
```

### Replace All Models for a Provider

```sql
UPDATE ai_providers
SET 
  available_models = '[
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash"
  ]'::jsonb,
  default_model = 'gemini-2.0-flash'
WHERE name = 'Google Gemini';
```

## Current Model Lists (October 2025)

### OpenAI
- **Models**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`
- **Default**: `gpt-4o`

### Google Gemini
- **Models**: `gemini-1.5-flash`, `gemini-1.5-flash-8b`, `gemini-1.5-pro`
- **Default**: `gemini-1.5-flash`
- **Note**: `gemini-pro` and `gemini-1.5-pro` (without `-latest`) are deprecated in v1 API

### Mistral
- **Models**: `mistral-large-latest`, `mistral-small-latest`, `mistral-medium-latest`, `open-mistral-7b`, `open-mixtral-8x7b`
- **Default**: `mistral-large-latest`

### Groq
- **Models**: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `llama3-70b-8192`, `llama3-8b-8192`, `mixtral-8x7b-32768`
- **Default**: `llama-3.3-70b-versatile`

### Anthropic (Claude)
- **Models**: `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`, `claude-3-opus-20240229`
- **Default**: `claude-3-5-sonnet-20241022`

### Azure OpenAI
- **Models**: `gpt-4o`, `gpt-4`, `gpt-35-turbo`, `gpt-4-32k`
- **Default**: `gpt-4o`

## How It Works

### Model Selection Priority

1. **Explicit model in request** - If specified, this is used
2. **Database default_model** - If no model specified, uses provider's default from DB
3. **Hardcoded fallback** - If DB query fails, uses hardcoded default (legacy support)

### Code Example

```typescript
// The model selection happens automatically in aiService.ts
const model = request.model || 
  await this.getDefaultModelForProvider(request.provider, 'gpt-4o')
```

### API Response

When you call `GET /api/ai-providers`, you'll get:

```json
{
  "id": "...",
  "name": "Google Gemini",
  "type": "google",
  "models": [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b", 
    "gemini-1.5-pro"
  ],
  "default_model": "gemini-1.5-flash",
  "is_active": true
}
```

## Updating Models When Provider Changes

When a provider like Google deprecates models:

1. **Update the database** (no code changes needed):
   ```sql
   UPDATE ai_providers
   SET 
     available_models = '["new-model-1", "new-model-2"]'::jsonb,
     default_model = 'new-model-1'
   WHERE provider_type = 'google';
   ```

2. **Restart the backend** (it will reload providers)

3. **Done!** Users will now see the new models in the UI

## Rollback Plan

If you need to rollback:

```sql
-- Remove the new columns
ALTER TABLE ai_providers DROP COLUMN IF EXISTS available_models;
ALTER TABLE ai_providers DROP COLUMN IF EXISTS default_model;
```

The code will automatically fall back to hardcoded model lists.

## Future Enhancements

Possible improvements:
- Add model metadata (cost, context window size, capabilities)
- Version tracking for model configurations
- UI for managing models without SQL
- Automatic model discovery via provider APIs

## Troubleshooting

### Models not showing in UI

Check if migration ran successfully:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'ai_providers' 
  AND column_name IN ('available_models', 'default_model');
```

### Provider using wrong model

Verify database configuration:
```sql
SELECT name, default_model, available_models 
FROM ai_providers 
WHERE name = 'Google Gemini';
```

### Migration fails

Ensure you have database access and the table exists:
```sql
SELECT * FROM ai_providers LIMIT 1;
```

## Support

For issues or questions, check:
- Migration logs in terminal
- Backend logs: `server/logs/combined.log`
- Database connection: Ensure `POSTGRES_URL` is set in `.env`

