# ADPA Framework - Advanced Document Processing & Automation

A comprehensive enterprise-grade platform for AI-powered document generation, management, and automation with seamless third-party integrations.

## 🚨 IMPORTANT: Docker Development Environment Required

**⚠️ CRITICAL: This project MUST be run using Docker containers. Never run services locally or modify configurations for local development.**

- ✅ **Use Docker**: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d`
- ❌ **Don't run locally**: Never use `npm run dev` or modify configs for localhost
- 🔍 **Validate setup**: Run `validate-docker.bat` before committing changes

**Breaking Docker setup will require significant time to fix. Always validate with `validate-docker.bat` before commits.**

📖 **[Complete Docker Guide](DOCKER_README.md)** | 🛠️ **[Validation Script](validate-docker.bat)**

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

## Installation

### 🚨 Prerequisites (Docker Required)

- **Docker** and **Docker Compose** (MANDATORY)
- **Node.js** (≥18.x) - for local development tools only
- **Git** - for version control

### ⚡ Quick Start (Docker Only)

```bash
# 1. Clone repository
git clone <repository-url>
cd adpa-framework

# 2. Start Docker environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 3. Validate Docker setup
validate-docker.bat

# 4. Access application
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# pgAdmin:  http://localhost:8080 (admin@adpa.com / admin123)
```

### 🐳 Docker Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Next.js React Application |
| Backend | http://localhost:5000 | Express.js API Server |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache & Sessions |
| pgAdmin | http://localhost:8080 | Database Admin |
| Redis Commander | http://localhost:8081 | Redis Admin |

### 🔍 Validation & Troubleshooting

```bash
# Validate Docker configuration
validate-docker.bat

# Check running services
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

📖 **Detailed Docker instructions**: [DOCKER_README.md](DOCKER_README.md)

### ⚠️ Manual Installation (Not Recommended)

Manual installation is **not recommended** and may break Docker compatibility. Use Docker for all development work.

## Usage

### Web Admin Portal

1. **Access the admin portal** at `http://localhost:3000`
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
```

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