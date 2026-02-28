# ADPA Framework - Advanced Document Processing & Automation

A comprehensive enterprise-grade platform for AI-powered document generation, management, and automation with seamless third-party integrations.

---

## Description

The ADPA (Advanced Document Processing & Automation) Framework is a sophisticated full-stack application that revolutionizes how organizations create, manage, and integrate business-critical documentation. Built with modern technologies and enterprise-grade architecture, ADPA combines the power of multiple AI providers with robust integrations to deliver standards-compliant documentation that meets PMBOK, BABOK, and DMBOK requirements.

The platform features a Next.js admin portal for intuitive management, a powerful Express.js backend API, and seamless integrations with popular enterprise tools like Confluence, SharePoint, and GitHub. Whether you're generating project charters, technical specifications, or compliance documentation, ADPA streamlines the entire document lifecycle with intelligent automation and real-time collaboration features.

## Features

### 🤖 **Multi-Provider AI Orchestration**
- Support for OpenAI, Google AI, GitHub Copilot, and Ollama
- Intelligent provider failover and health monitoring
- Context-aware prompt engineering and smart template selection
- Real-time AI generation tracking and analytics

### 📋 **Standards-Compliant Document Generation**
- PMBOK 7th Edition compliant project management documents
- BABOK v3 business analysis documentation
- DMBOK 2.0 data management frameworks
- 100+ pre-built professional templates
- Multiple output formats (Markdown, PDF, JSON)
- Comprehensive validation and quality assurance

### 🔗 **Enterprise Integrations**
- **Confluence**: OAuth2 authentication, page publishing, metadata synchronization
- **SharePoint**: Document library sync, metadata management, collaborative editing
- **GitHub**: Repository integration, issue tracking, pull request management
- **Adobe Document Services**: Advanced PDF generation and manipulation

### 📊 **Advanced Analytics & Monitoring**
- Real-time dashboard with interactive charts and metrics
- Permission-based access control for analytics viewing
- Document generation tracking and performance insights
- User activity monitoring and audit trails

### 🔐 **Enterprise Security & Compliance**
- Role-Based Access Control (RBAC) with granular permissions
- OAuth2, SAML, and API key authentication
- Comprehensive audit logging and compliance reporting
- SOC 2 and enterprise security standards compliance

### ⚡ **Real-Time Features**
- WebSocket-powered live updates and notifications
- Real-time collaboration on documents
- Live job queue monitoring and status updates
- Instant synchronization across all connected clients

### 🎯 **Project & Document Management**
- Intuitive project organization and hierarchy
- Document versioning and lifecycle management
- Template builder with drag-and-drop interface
- Advanced search and filtering capabilities

## Intellectual Property & Standards Compliance

ADPA is designed to be **inspired by** and **aligned with** industry standards such as PMBOK®, BABOK, and DMBOK, while strictly respecting their intellectual property rights.

### Non-Commercial / Internal-Only Status

- The current ADPA implementation is intended for **internal, non-commercial use** only.  
- It **must not** be used to deliver billable products, licenses, or commercial services that embed PMBOK®, BABOK, DMBOK, or related proprietary content without explicit written agreements from the respective standards bodies.  
- Any proposal to commercialize ADPA (including hosted services, APIs, or packaged toolkits) must trigger a **formal IP and licensing review** with legal counsel and the relevant standards organizations.

### Use of PMBOK®, BABOK, DMBOK and Other Bodies of Knowledge

- PMBOK®, BABOK, DMBOK and related materials are **copyrighted works** owned respectively by PMI, IIBA, and DAMA International.  
- ADPA uses these frameworks at the **conceptual level only** (e.g., performance domains, knowledge areas, data governance concepts) and avoids storing or reproducing substantial proprietary text, diagrams, or tables from the official guides.  
- Internal methods, taxonomies, and dashboards are **custom designs inspired by** these standards and do **not** claim to be official or exhaustive implementations.

### External Review of References

Before any external publication, demo, or commercialization, ADPA will:

- Present representative screens, prompts, and documentation to **PMI**, **DAMA International**, and **IIBA** (as applicable) to validate that:
  - References to their works clearly acknowledge them as **proprietary standards**, and  
  - Attribution follows their branding and citation guidelines.  
- Maintain an internal mapping that documents which concepts are influenced by which standards and how they are attributed, to support **IP audits and external review**.

These guardrails are intended to ensure ADPA advances AI-supported project, business analysis, and data management practices **without infringing** on the IP of PMI, IIBA, DAMA International, or other standard-setting bodies.

## Installation

### 🚨 Prerequisites

- **Node.js 18+** (REQUIRED)
- **pnpm** (recommended) or npm
- **Git** - for version control
- **Supabase Account** - for PostgreSQL database
- **Railway Account** - for Redis cache

### ⚡ Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd adpa

# 2. Install dependencies
pnpm install
cd server && npm install && cd ..

# 3. Configure environment
# Copy .env.example and add your Supabase/Railway credentials
cp .env.local.example .env.local
cp server/.env.example server/.env

# 4. Start development servers
# Frontend (terminal 1)
pnpm dev

# Backend (terminal 2)  
cd server && npm run dev

# 5. Access application
# Frontend: http://localhost:3005
# Backend:  http://localhost:5000/health
```

### 🐳 Docker Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3005 | Next.js React Application |
| Backend | http://localhost:5000 | Express.js API Server |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache & Sessions |
| pgAdmin | http://localhost:8080 | Database Admin |
| Redis Commander | http://localhost:8081 | Redis Admin |

### 🔍 Validation & Troubleshooting

```bash
# Run tests
pnpm test

# Build for production
pnpm build
cd server && npm run build

# View logs
# Frontend: terminal output
# Backend: server/logs/combined.log
```

📖 **Detailed setup instructions**: See `/docs/01-getting-started/`

✅ **Minimal local startup runbook**: [Known Good Local Runbook](docs/01-getting-started/KNOWN_GOOD_LOCAL_RUNBOOK.md)

### ℹ️ Note: Docker Deprecated

This project now uses **Supabase PostgreSQL** (serverless) and **Railway Redis** instead of local Docker containers. Legacy Docker files have been archived to `legacy/docker/` for reference only.

## Usage

### Web Admin Portal

1. **Access the admin portal** at `http://localhost:3005`
2. **Login** with your credentials or create a new account
3. **Create a new project** from the Projects dashboard
4. **Generate documents** using AI-powered templates
5. **Configure integrations** in the Integrations section
6. **Monitor analytics** and job queues in real-time

### API Usage

```javascript
// Generate a document using the REST API
const response = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    template: 'project-charter',
    context: {
      projectName: 'My Project',
      description: 'Project description'
    },
    provider: 'openai'
  })
});

const document = await response.json();
```

### CLI Usage (Coming Soon)

```bash
# Generate documents via CLI
adpa generate --template project-charter --context project.json

# Sync with integrations
adpa sync confluence --project-id 123

# Export documents
adpa export --format pdf --output ./exports/
```

## Document Generation and Validation

### Generating Documents

The ADPA Framework provides powerful document generation capabilities with built-in validation:

#### Via Web Admin Portal
1. Navigate to the **Documents** section
2. Click **Generate New Document**
3. Select a template (PMBOK, BABOK, or DMBOK)
4. Provide required context and variables
5. Choose output format (Markdown, PDF, DOCX, HTML)
6. Click **Generate** - validation runs automatically

#### Via REST API
```bash
# Generate a document
curl -X POST http://localhost:5000/api/document-generator/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "template_id": "uuid-here",
    "data": {
      "projectName": "My Project",
      "description": "Project description"
    },
    "output_format": "pdf"
  }'

# Validate document data before generation
curl -X POST http://localhost:5000/api/document-generator/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "template_id": "uuid-here",
    "data": { ... }
  }'
```

### Document Validation

All generated documents undergo comprehensive validation:

- **Schema Validation**: Joi-based validation of all inputs
- **Template Validation**: Ensures templates meet framework standards
- **Variable Validation**: Checks all required variables are provided
- **Content Validation**: Validates content quality and completeness
- **Security Validation**: Prevents injection attacks and path traversal
- **Format Validation**: Ensures output meets format specifications

See [Generated Documents](generated-documents/README.md) for detailed validation documentation.

### Testing Drift Detection & Resolution

The ADPA Framework includes an Automatic Drift Detection & Resolution feature that monitors documents for deviations from approved baselines and provides AI-powered one-click resolution.

#### Quick Start: Create Test Baseline

```bash
# Navigate to server directory
cd server

# Create a comprehensive test baseline for your project
npm run create-test-baseline <PROJECT_ID>

# Example with project ID
npm run create-test-baseline 123e4567-e89b-12d3-a456-426614174000
```

This creates a comprehensive baseline with:
- 5 stakeholders (from sponsors to designers)
- 4 risks (external, resource, technical, financial)
- 6 milestones with dependencies
- 5 requirements (approved and draft)
- Budget, timeline, and success criteria
- All 14 entity types for comprehensive testing (scope_items, deliverables, requirements, milestones, phases, activities, resources, technologies, stakeholders, constraints, risks, success_criteria, quality_standards, best_practices)

**For detailed testing instructions**, see [Drift Resolution Testing Guide](docs/testing/DRIFT_RESOLUTION_TESTING_GUIDE.md).

### Building Documentation

Generated documents are stored in the `generated-documents/` directory with organized structure:

```
generated-documents/
├── README.md                    # This file with validation info
├── pmbok/                       # PMBOK documents
├── babok/                       # BABOK documents
├── dmbok/                       # DMBOK documents
├── project-charter/             # Project charters
├── management-plans/            # Management plans
├── quality-assurance/           # QA documentation
└── ...                          # Other categories
```

For comprehensive documentation generation details, see:
- [Document Generator Module](server/src/modules/documentGenerator/README.md)
- [Generated Documents Guide](generated-documents/README.md)

## Configuration

### Environment Variables

#### Frontend (.env.local)
```bash
# Vercel KV (Redis)
KV_URL=redis://default:password@localhost:6379
KV_REST_API_URL=https://your-kv-database.vercel-storage.com
KV_REST_API_TOKEN=your_api_token

# Vercel Postgres
POSTGRES_URL=postgres://username:password@localhost:5432/adpa_db
POSTGRES_PRISMA_URL=postgres://username:password@localhost:5432/adpa_db?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://username:password@localhost:5432/adpa_db

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Langfuse (SDK-only tracing)
ENABLE_LANGFUSE_TRACING=false
ENABLE_LANGFUSE_NATIVE_SDK=true
LANGFUSE_DEBUG_TRACING=false
LANGFUSE_PUBLIC_KEY=your-langfuse-public-key
LANGFUSE_SECRET_KEY=your-langfuse-secret-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

#### Backend (server/.env)
```bash
# Database
DATABASE_URL=postgres://username:password@localhost:5432/adpa_db
REDIS_URL=redis://localhost:6379

# AI Providers
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
GITHUB_TOKEN=your_github_token

# Integrations
CONFLUENCE_CLIENT_ID=your_confluence_client_id
CONFLUENCE_CLIENT_SECRET=your_confluence_client_secret
SHAREPOINT_CLIENT_ID=your_sharepoint_client_id
SHAREPOINT_CLIENT_SECRET=your_sharepoint_client_secret

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-encryption-key

# Server
PORT=8000
NODE_ENV=development

# Langfuse (SDK-only tracing)
ENABLE_LANGFUSE_TRACING=false
ENABLE_LANGFUSE_NATIVE_SDK=true
LANGFUSE_DEBUG_TRACING=false
LANGFUSE_PUBLIC_KEY=your-langfuse-public-key
LANGFUSE_SECRET_KEY=your-langfuse-secret-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Note: `ENABLE_LANGFUSE_TRACING` controls OTLP tracing export. Keep it `false` to disable OTLP telemetry/reporting while `ENABLE_LANGFUSE_NATIVE_SDK=true` keeps native Langfuse SDK tracing enabled. Set `LANGFUSE_DEBUG_TRACING=true` temporarily when you need per-request trace/flush diagnostics.

### Integration Setup

#### Confluence Integration
1. Create an Atlassian app in your Confluence instance
2. Configure OAuth2 redirect URLs
3. Add client credentials to environment variables
4. Test connection in the Integrations dashboard

#### SharePoint Integration
1. Register an app in Azure AD
2. Configure Microsoft Graph API permissions
3. Add client credentials to environment variables
4. Authorize the application for your SharePoint tenant

#### GitHub Integration
1. Create a GitHub App or Personal Access Token
2. Configure repository access permissions
3. Add token to environment variables
4. Connect repositories in the Integrations dashboard

## Contributing

We welcome contributions to the ADPA Framework! Please follow these guidelines:

### Development Workflow

1. **Fork the repository** and create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow coding standards**
   - Use TypeScript for all new code
   - Follow ESLint and Prettier configurations
   - Write comprehensive tests for new features
   - Document all public APIs and components

3. **Testing Requirements**
   ```bash
   # Run all tests
   npm test
   
   # Run specific test suites
   npm run test:db-unit
   npm run test:db-integration
   
   # Test database connections
   npm run test:db
   npm run test:kv
   ```

4. **Submit a Pull Request**
   - Provide a clear description of changes
   - Include screenshots for UI changes
   - Ensure all tests pass
   - Update documentation as needed

### Code Style Guidelines

- **TypeScript**: Strict mode enabled, proper type definitions
- **React**: Functional components with hooks, proper prop types
- **API**: RESTful design, proper error handling, OpenAPI documentation
- **Database**: Proper migrations, seed data, transaction handling
- **Security**: Input validation, sanitization, proper authentication

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Provide detailed reproduction steps
- Include environment information and logs
- Label issues appropriately (bug, enhancement, documentation)

### GitHub Copilot Cleanup Specialist Agent

The ADPA Framework includes a specialized **Cleanup Specialist** GitHub Copilot agent designed to automatically improve code quality and maintainability.

#### 🧠 What the Cleanup Specialist Does

The cleanup specialist agent is configured to:

- 🧹 **Remove dead or unused code** - Eliminates unused imports, variables, functions, and commented-out code
- 🔁 **Eliminate duplication** - Finds and consolidates duplicate code blocks across the codebase
- ✨ **Refactor messy patterns** - Simplifies complex logic and improves code structure
- 📄 **Improve formatting** - Ensures consistent style across TypeScript, JavaScript, SQL, and Markdown files
- 📚 **Enhance documentation** - Cleans up comments, fixes typos, and removes outdated documentation
- 🎯 **Maintain consistency** - Applies project-specific conventions and standards

#### 🚀 How to Use the Cleanup Specialist

**Option 1: Via GitHub Web Interface**
1. Go to your repository on GitHub
2. Navigate to an issue or pull request
3. Click on the Copilot icon and select "cleanup-specialist" from the agents dropdown
4. Assign the agent a cleanup task (e.g., "Clean up unused imports in the server directory")

**Option 2: Via GitHub CLI**
```bash
# Trigger cleanup for a specific directory
gh copilot agent cleanup-specialist "Remove dead code from app/components"

# Clean up a specific file
gh copilot agent cleanup-specialist "Refactor app/api/documents/route.ts for better readability"

# General cleanup
gh copilot agent cleanup-specialist "Clean up duplicate code in the server modules"
```

**Option 3: In Pull Requests**
- Comment on a PR: `@github-copilot cleanup-specialist please review this PR for cleanup opportunities`
- The agent will analyze the code and suggest improvements

#### 📋 Best Practices

**What to Ask the Agent:**
- "Remove all unused imports from the frontend codebase"
- "Find and eliminate duplicate code in server/src/modules"
- "Refactor complex functions in server/src/services to improve readability"
- "Clean up and standardize formatting across all TypeScript files"
- "Remove console.log statements from production code"

**What NOT to Ask:**
- Don't ask it to add new features (it's focused on cleanup only)
- Don't ask it to modify database migration files (these are historical records)
- Don't ask it to change core business logic without review

#### 🛡️ Safety Features

The cleanup specialist is configured with project-specific constraints:
- Preserves all working business logic
- Follows ADPA Framework conventions (Markdown storage, UUID primary keys, etc.)
- Respects TypeScript strict mode requirements
- Never modifies database migration files
- Asks for clarification when changes might be risky

#### 📖 Agent Configuration

The agent is defined in `.github/agents/cleanup-specialist.md` and includes:
- Comprehensive cleanup guidelines specific to the ADPA Framework
- Examples of good cleanup practices
- Project-specific coding standards
- Clear boundaries on what should and shouldn't be modified

For more details, see the [cleanup specialist agent configuration](.github/agents/cleanup-specialist.md).

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

- **Next.js**: MIT License
- **React**: MIT License
- **Express.js**: MIT License
- **PostgreSQL**: PostgreSQL License
- **Redis**: BSD License
- **Tailwind CSS**: MIT License

## Contact / Maintainers

### Core Team

- **Project Lead**: [Your Name] - [email@domain.com]
- **Technical Lead**: [Tech Lead Name] - [tech@domain.com]
- **DevOps Engineer**: [DevOps Name] - [devops@domain.com]

### Support Channels

- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: [docs.adpa-framework.com](https://docs.adpa-framework.com)
- **Community Discord**: [discord.gg/adpa-framework](https://discord.gg/adpa-framework)
- **Email Support**: support@adpa-framework.com

### Enterprise Support

For enterprise customers and commercial licensing:
- **Sales**: sales@adpa-framework.com
- **Enterprise Support**: enterprise@adpa-framework.com
- **Professional Services**: consulting@adpa-framework.com

## Acknowledgements

### Technology Stack

- **[Next.js](https://nextjs.org/)** - The React framework for production
- **[Express.js](https://expressjs.com/)** - Fast, unopinionated web framework for Node.js
- **[PostgreSQL](https://postgresql.org/)** - The world's most advanced open source database
- **[Redis](https://redis.io/)** - In-memory data structure store
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://radix-ui.com/)** - Low-level UI primitives for React

### AI Providers

- **[OpenAI](https://openai.com/)** - GPT models and API services
- **[Google AI](https://ai.google/)** - Gemini models and AI services
- **[GitHub Copilot](https://github.com/features/copilot)** - AI pair programmer
- **[Ollama](https://ollama.ai/)** - Local AI model deployment

### Enterprise Integrations

- **[Atlassian Confluence](https://www.atlassian.com/software/confluence)** - Team collaboration and documentation
- **[Microsoft SharePoint](https://www.microsoft.com/en-us/microsoft-365/sharepoint)** - Document management and collaboration
- **[GitHub](https://github.com/)** - Version control and collaboration platform
- **[Adobe Document Services](https://developer.adobe.com/document-services/)** - PDF generation and manipulation

### Standards & Frameworks

- **[PMBOK Guide](https://www.pmi.org/pmbok-guide-standards)** - Project Management Body of Knowledge
- **[BABOK Guide](https://www.iiba.org/standards-and-resources/babok/)** - Business Analysis Body of Knowledge
- **[DMBOK](https://www.dama.org/cpages/body-of-knowledge)** - Data Management Body of Knowledge

### Special Thanks

- The open-source community for their invaluable contributions
- Enterprise customers who provided feedback and requirements
- Beta testers who helped refine the user experience
- Contributors who helped build and improve the platform

---

**Built with ❤️ by the ADPA Framework Team**

*Empowering organizations with intelligent document automation and seamless enterprise integrations.*

---
*Last updated: 2024*
