# ADPA Framework Backend

Enterprise Architecture Documentation Platform API Server built with Node.js, Express, TypeScript, PostgreSQL, and Redis.

## Features

### Core Services
- **RESTful API** with comprehensive endpoints
- **JWT Authentication** with refresh tokens
- **Role-based Access Control** with granular permissions
- **PostgreSQL Database** with optimized schema
- **Redis Caching** for improved performance
- **Job Queue System** using Bull for background processing

### AI Integration
- **Multi-Provider Support**: OpenAI, Google AI, Azure OpenAI
- **Template Processing** with variable substitution
- **Async AI Generation** with job queue
- **Usage Tracking** and analytics

### Document Management
- **Project-based Organization**
- **Template System** with framework support
- **Version Control** for documents
- **File Upload** support with validation

### Security & Monitoring
- **Security Event Logging**
- **Audit Trail** for all actions
- **Real-time Analytics**
- **Performance Monitoring**

### Third-party Integrations
- **Confluence** - Document sync
- **SharePoint** - Collaboration
- **GitHub** - Version control
- **Slack/Teams** - Notifications
- **Adobe Services** - PDF generation

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Clone and install dependencies**
```bash
cd server
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🧪 Testing

The server uses Jest for testing. We have implemented a stabilized test harness that isolates top-level side effects.

- **[Testing Guide](docs/TESTING_GUIDE.md)**: Detailed documentation on architecture, mocks, and guards.
- **Health Check**: Run `.\scripts\verify-test-env.ps1` to verify your test environment.

```bash
# Run all tests
npm test

# Run integration tests (with Docker)
npm run test:integration
```

3. **Database Setup**
```bash
# Create database
createdb adpa_db

# Run migrations
npm run migrate

# Seed with demo data
npm run seed
```

4. **Start Development Server**
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Demo Accounts
After seeding, you can use these accounts:
- **Admin**: `admin@adpa.com` / `admin123`
- **User**: `demo@adpa.com` / `demo123`

## API Documentation

### Route Map

The examples below are not a complete OpenAPI specification. The live route
surface is assembled from:

- explicit `app.use("/api/...", ...)` registrations in `src/server.ts`
- modular route discovery in `src/routes/registry.ts`, which mounts
  `src/modules/*/routes.ts` under `/api/v{version}`

When adding or troubleshooting an endpoint, verify both the explicit legacy
mount and the modular `/api/v1` mount before updating client code or docs.

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Core Endpoint Examples

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

#### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Documents
- `GET /api/documents/project/:projectId` - Get project documents
- `POST /api/documents/project/:projectId` - Create document
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/export/pdf` - Export one document as PDF
- `GET /api/documents/:id/export/docx` - Export one document as DOCX
- `POST /api/documents/bulk-export/pdf` - Export selected documents as a ZIP of PDFs
- `POST /api/documents/bulk-export/docx` - Export selected documents as one combined DOCX file

Document export source paths:

- `src/modules/documents/routes.ts` - authenticated document route definitions
- `src/modules/documents/DocumentsController.ts` - PDF and DOCX export handlers
- `src/modules/documents/bulkDocxExport.ts` - combined DOCX Markdown assembly
- `src/services/docxService.ts` - Markdown-to-DOCX rendering

Bulk DOCX accepts a JSON body with `document_ids: string[]`, validates UUIDs,
keeps the submitted order, and returns
`application/vnd.openxmlformats-officedocument.wordprocessingml.document` with
`combined-project-documents.docx` as the default attachment filename.

#### AI Processing
- `POST /api/ai/generate` - Generate content
- `GET /api/ai/providers` - List AI providers
- `POST /api/ai/providers` - Create AI provider (admin)
- `POST /api/ai/providers/:name/configure` - Configure provider (admin)

#### Document Templates
- `GET /api/document-templates` - List templates
- `POST /api/document-templates` - Create template
- `GET /api/document-templates/:id` - Get template
- `PUT /api/document-templates/:id` - Update template
- `DELETE /api/document-templates/:id` - Delete template
- `POST /api/document-templates/:id/clone` - Clone template

#### Users (Admin)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Jobs
- `GET /api/jobs` - List user jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/cancel` - Cancel job
- `POST /api/jobs/:id/retry` - Retry failed job

#### Analytics
- `GET /api/analytics/dashboard` - User dashboard
- `GET /api/analytics/system` - System analytics (admin)
- `POST /api/analytics/events` - Track custom event

#### Security
- `GET /api/security/events` - Security events (admin)
- `GET /api/security/dashboard` - Security dashboard (admin)
- `POST /api/security/incidents` - Report incident
- `GET /api/security/audit` - Audit trail (admin)

#### Integrations
- `GET /api/integrations` - List integrations
- `POST /api/integrations` - Create integration (admin)
- `PUT /api/integrations/:id` - Update integration (admin)
- `DELETE /api/integrations/:id` - Delete integration (admin)
- `POST /api/integrations/:id/test` - Test connection (admin)
- `POST /api/integrations/:id/sync` - Sync data (admin)

## Configuration

### Environment Variables

#### Required
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database connection
- `REDIS_URL` or `REDIS_HOST`, `REDIS_PORT` - Redis connection
- `JWT_SECRET` - JWT signing secret

#### Optional
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (default: info)
- `FRONTEND_URL` - Frontend URL for CORS

#### AI Providers
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_AI_API_KEY` - Google AI API key
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key

#### Langfuse Tracing (SDK-only)
- `ENABLE_LANGFUSE_TRACING=false` - Disables OTLP telemetry export/reporting
- `ENABLE_LANGFUSE_NATIVE_SDK=true` - Enables native Langfuse SDK tracing
- `LANGFUSE_DEBUG_TRACING=false` - Optional trace/flush debug logs (set to true only while troubleshooting)
- `LANGFUSE_PUBLIC_KEY` - Langfuse public key
- `LANGFUSE_SECRET_KEY` - Langfuse secret key
- `LANGFUSE_BASE_URL` - Langfuse base URL (for self-hosted or cloud)

Use `ENABLE_LANGFUSE_TRACING=false` with `ENABLE_LANGFUSE_NATIVE_SDK=true` to keep Langfuse SDK traces while OTLP telemetry is disabled.

### Database Schema

The database includes these main tables:
- `users` - User accounts and permissions
- `projects` - Project management
- `documents` - Document storage with JSONB content
- `templates` - Reusable document templates
- `ai_providers` - AI service configurations
- `jobs` - Background job tracking
- `audit_logs` - Action audit trail
- `security_events` - Security monitoring
- `integrations` - Third-party integrations
- `analytics_events` - Custom event tracking

## Development

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with demo data
- `npm test` - Run tests

### Project Structure
```
src/
├── database/           # Database connection and migrations
├── middleware/         # Express middleware
├── routes/            # API route handlers
├── services/          # Business logic services
├── utils/             # Utility functions
└── server.ts          # Main server file
```

### Adding New Features

1. **Database Changes**: Update `schema.sql` and create migration
2. **API Routes**: Add route handlers in `routes/`
3. **Business Logic**: Implement in `services/`
4. **Validation**: Add schemas in `middleware/validation.ts`
5. **Tests**: Add tests for new functionality

## Production Deployment

### Docker
```bash
# Build image
docker build -t adpa-backend .

# Run container
docker run -p 5000:5000 --env-file .env adpa-backend
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure proper database credentials
4. Set up Redis cluster for high availability
5. Configure logging and monitoring
6. Set up SSL/TLS termination
7. Configure rate limiting and security headers

### Monitoring
- Health check endpoint: `GET /health`
- Logs are written to `logs/` directory
- Metrics available through analytics endpoints
- Security events tracked in database

## Security

### Best Practices
- JWT tokens with short expiration
- Password hashing with bcrypt
- Input validation with Joi
- SQL injection prevention with parameterized queries
- XSS protection with helmet
- Rate limiting on sensitive endpoints
- Audit logging for all actions
- Security event monitoring

### Permissions System
Role-based access control with granular permissions:
- `admin` - Full system access
- `manager` - Project and team management
- `user` - Standard user access
- `viewer` - Read-only access

## Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Review environment configuration
3. Verify database and Redis connectivity
4. Check API documentation for correct usage

## License

Copyright (c) 2024 ADPA Framework. All rights reserved.
