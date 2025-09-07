# Document Templates Module

The Document Templates module provides comprehensive REST API endpoints for managing document templates in the ADPA Framework. This module implements full CRUD operations with authentication, authorization, caching, and soft delete functionality.

## Features

- **Full CRUD Operations**: Create, Read, Update, Delete document templates
- **Authentication Required**: All endpoints require valid JWT authentication
- **Permission-based Authorization**: Fine-grained permissions for different operations
- **Soft Delete**: Templates are soft-deleted and can be restored
- **Template Cloning**: Create copies of existing templates
- **Usage Tracking**: Track how often templates are used
- **Caching**: Redis-based caching for improved performance
- **Filtering & Search**: Advanced filtering and search capabilities
- **Pagination**: Efficient pagination for large datasets
- **OpenAPI Documentation**: Complete API specification

## Module Structure

```
src/modules/documentTemplates/
├── index.ts              # Main module exports
├── types.ts              # TypeScript type definitions
├── service.ts            # Business logic layer
├── controller.ts         # HTTP request handlers
├── routes.ts             # Express route definitions
├── validation.ts         # Joi validation schemas
├── openapi.yaml          # OpenAPI 3.0 specification
├── README.md             # This documentation
└── __tests__/            # Test files
    ├── service.test.ts
    ├── controller.test.ts
    └── routes.test.ts
```

## API Endpoints

### Base URL: `/api/document-templates`

| Method | Endpoint | Description | Auth | Permissions |
|--------|----------|-------------|------|-------------|
| GET | `/` | List templates with pagination and filtering | ✓ | - |
| GET | `/:id` | Get template by ID | ✓ | - |
| POST | `/` | Create new template | ✓ | `templates.create` |
| PUT | `/:id` | Update template | ✓ | `templates.update` |
| DELETE | `/:id` | Soft delete template | ✓ | `templates.delete` |
| POST | `/:id/clone` | Clone template | ✓ | `templates.create` |
| POST | `/:id/use` | Record template usage | ✓ | - |
| GET | `/trash` | List deleted templates | ✓ | `templates.view` |
| POST | `/:id/restore` | Restore deleted template | ✓ | `templates.update` |
| DELETE | `/:id/permanent` | Permanently delete template | ✓ | `templates.delete` |

## Data Models

### DocumentTemplate

```typescript
interface DocumentTemplate {
  id: string                    // UUID
  name: string                  // Template name (2-255 chars)
  description?: string          // Optional description (max 1000 chars)
  framework: Framework          // TOGAF | SABSA | COBIT | ITIL | Custom
  category?: string             // Optional category (max 100 chars)
  content: Record<string, any>  // Template content structure
  variables: TemplateVariable[] // Template variables
  is_public: boolean           // Public accessibility
  created_by: string           // Creator user ID
  usage_count: number          // Usage counter
  created_at: Date             // Creation timestamp
  updated_at: Date             // Last update timestamp
  deleted_at?: Date            // Soft delete timestamp
  deleted_by?: string          // User who deleted template
  created_by_name?: string     // Creator name (joined)
}
```

### TemplateVariable

```typescript
interface TemplateVariable {
  name: string                 // Variable name
  type: VariableType          // text | number | date | boolean | select
  required: boolean           // Is required
  default?: any               // Default value
  options?: string[]          // Options for select type
  description?: string        // Variable description
}
```

## Usage Examples

### Authentication

All requests require a valid JWT token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### List Templates

```bash
GET /api/document-templates?page=1&limit=10&framework=TOGAF&search=architecture
```

**Response:**
```json
{
  "templates": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Enterprise Architecture Template",
      "description": "Comprehensive EA template",
      "framework": "TOGAF",
      "category": "Architecture",
      "content": {
        "sections": [
          {
            "title": "Executive Summary",
            "content": "{{executive_summary}}"
          }
        ]
      },
      "variables": [
        {
          "name": "executive_summary",
          "type": "text",
          "required": true,
          "description": "Executive summary content"
        }
      ],
      "is_public": true,
      "created_by": "user-123",
      "usage_count": 15,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "created_by_name": "John Doe"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### Create Template

```bash
POST /api/document-templates
Content-Type: application/json

{
  "name": "Risk Assessment Template",
  "description": "Template for conducting risk assessments",
  "framework": "SABSA",
  "category": "Security",
  "content": {
    "sections": [
      {
        "title": "Risk Identification",
        "content": "{{risk_description}}"
      },
      {
        "title": "Impact Analysis",
        "content": "Impact Level: {{impact_level}}"
      }
    ]
  },
  "variables": [
    {
      "name": "risk_description",
      "type": "text",
      "required": true,
      "description": "Description of the identified risk"
    },
    {
      "name": "impact_level",
      "type": "select",
      "required": true,
      "options": ["Low", "Medium", "High", "Critical"],
      "description": "Impact level of the risk"
    }
  ],
  "is_public": false
}
```

### Update Template

```bash
PUT /api/document-templates/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "name": "Updated Risk Assessment Template",
  "description": "Enhanced template with additional sections"
}
```

### Clone Template

```bash
POST /api/document-templates/550e8400-e29b-41d4-a716-446655440000/clone
Content-Type: application/json

{
  "name": "My Custom Risk Template",
  "description": "Customized version of the risk assessment template",
  "is_public": false
}
```

### Record Template Usage

```bash
POST /api/document-templates/550e8400-e29b-41d4-a716-446655440000/use
```

## Error Handling

The API returns standard HTTP status codes and JSON error responses:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "framework",
      "message": "Framework must be one of TOGAF, SABSA, COBIT, ITIL, Custom"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Template not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Permissions

The module uses the following permissions:

- `templates.create` - Create new templates and clone existing ones
- `templates.update` - Update templates and restore deleted ones
- `templates.delete` - Delete templates (soft and permanent)
- `templates.view` - View deleted templates in trash

## Caching

Templates are cached in Redis with the following strategy:

- **Cache Key**: `template:{id}`
- **TTL**: 1 hour (3600 seconds)
- **Cache Invalidation**: Automatic on update/delete operations

## Database Schema

The module uses the `templates` table with the following structure:

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    content JSONB NOT NULL,
    variables JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    deleted_by UUID REFERENCES users(id) NULL
);
```

## Testing

Run the tests with:

```bash
# Run all tests
npm test

# Run specific test files
npm test -- documentTemplates/service.test.ts
npm test -- documentTemplates/controller.test.ts
npm test -- documentTemplates/routes.test.ts

# Run with coverage
npm test -- --coverage
```

## Integration

To integrate this module into your application:

1. **Import the routes**:
   ```typescript
   import { documentTemplateRoutes } from './modules/documentTemplates'
   app.use('/api/document-templates', documentTemplateRoutes)
   ```

2. **Ensure database migration**:
   ```bash
   npm run migrate
   ```

3. **Configure permissions** in your user management system

4. **Set up Redis** for caching (optional but recommended)

## OpenAPI Documentation

The complete OpenAPI 3.0 specification is available in `openapi.yaml`. You can use this to:

- Generate client SDKs
- Set up API documentation tools (Swagger UI, Redoc)
- Validate API requests/responses
- Generate mock servers for testing

## Contributing

When contributing to this module:

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new functionality
3. Update the OpenAPI specification for API changes
4. Update this README for significant changes
5. Ensure all tests pass before submitting

## License

This module is part of the ADPA Framework and follows the same license terms.