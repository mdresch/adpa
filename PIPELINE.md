# ADPA CI/CD Pipeline Documentation

**Status**: ✅ Comprehensive pipeline configured
**Last Updated**: 2026-04-01
**Version**: 1.0.0

---

## Overview

The ADPA project uses a comprehensive GitLab CI/CD pipeline that automates testing, building, security scanning, and deployment processes. The pipeline is optimized for a TypeScript/Next.js full-stack application with PostgreSQL and Redis backends.

---

## Pipeline Stages

### 1. VALIDATE Stage

Validates code quality and dependencies before testing.

#### Jobs:

**validate:lint**
- Runs ESLint to check code style and quality
- Generates code quality reports
- Fails if linting errors are found
- Artifacts: `gl-code-quality-report.json`

**validate:types**
- Runs TypeScript type checking
- Ensures type safety across the codebase
- Fails if type errors are found

**validate:dependencies**
- Scans dependencies for known vulnerabilities
- Uses `pnpm audit` for vulnerability detection
- Allows failure (warnings only)
- Artifacts: Audit report

### 2. TEST Stage

Runs comprehensive test suites.

#### Jobs:

**test:unit**
- Runs Jest unit tests with coverage
- Generates coverage reports (Cobertura format)
- Generates JUnit XML reports
- Coverage threshold: 80%+
- Artifacts: Coverage reports, test results

**test:integration**
- Runs integration tests with real services
- Services: PostgreSQL 16, Redis 7
- Runs database migrations
- Allows failure (optional)
- Artifacts: Test results

**test:e2E**
- Runs Playwright E2E tests
- Tests full user workflows
- Allows failure (optional)
- Artifacts: Test results, Playwright reports

### 3. BUILD Stage

Builds application artifacts.

#### Jobs:

**build:frontend**
- Builds Next.js application
- Optimizes for production
- Generates `.next` directory
- Artifacts: `.next/`, `public/`

**build:docker**
- Builds Docker image
- Pushes to GitLab Container Registry
- Tags with commit SHA and `latest`
- Only runs on `main` and `develop` branches

### 4. SECURITY Stage

Performs security scanning and analysis.

#### Jobs:

**security:sast**
- Static Application Security Testing
- Uses ESLint for code analysis
- Generates SAST reports
- Allows failure (warnings only)

**security:dependency-check**
- Scans dependencies for vulnerabilities
- Generates detailed vulnerability reports
- Allows failure (warnings only)

**security:secrets**
- Scans for exposed secrets
- Uses gitleaks for detection
- Allows failure (warnings only)

### 5. DEPLOY Stage

Deploys application to environments.

#### Jobs:

**deploy:staging**
- Deploys to staging environment
- Triggered manually
- Runs on `develop` branch
- Runs database migrations
- URL: https://staging.adpa.example.com

**deploy:production**
- Deploys to production environment
- Triggered manually
- Runs on `main` branch
- Runs database migrations
- URL: https://adpa.example.com

---

## Pipeline Configuration

### Caching Strategy

**Node Modules Cache**
- Key: Based on `pnpm-lock.yaml`
- Paths: `node_modules/`, `.pnpm-store/`
- Policy: Pull-push (read and write)
- Scope: Per branch

**Build Cache**
- Key: Based on `pnpm-lock.yaml` and `package.json`
- Paths: `.next/cache/`, `dist/`
- Policy: Pull only (read-only)
- Scope: Per branch

### Retry Strategy

All jobs automatically retry up to 2 times on:
- Runner system failures
- Stuck or timeout failures

### Artifact Management

- **Unit test artifacts**: 30 days
- **Build artifacts**: 1 day
- **Security reports**: 30 days
- **E2E reports**: 30 days

---

## Environment Variables

### Required Variables

**Staging**:
- `STAGING_DATABASE_URL`: PostgreSQL connection string
- `STAGING_REDIS_URL`: Redis connection string

**Production**:
- `PRODUCTION_DATABASE_URL`: PostgreSQL connection string
- `PRODUCTION_REDIS_URL`: Redis connection string

### Docker Registry

- `CI_REGISTRY_USER`: GitLab registry username
- `CI_REGISTRY_PASSWORD`: GitLab registry password
- `CI_REGISTRY`: GitLab registry URL

---

## Workflow Rules

The pipeline runs on:

1. **Merge Request Events**: All MR pipelines
2. **Main Branch**: All commits to `main`
3. **Develop Branch**: All commits to `develop`
4. **Tags**: All tagged releases
5. **Other Branches**: Pipeline does not run

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10.32.1+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Setup with Docker Compose

```bash
# Start all services
docker-compose up -d

# Run migrations
pnpm run migrate:dev

# Start development server
pnpm dev

# Access services:
# - App: http://localhost:3000
# - pgAdmin: http://localhost:5050
# - Redis Commander: http://localhost:8081
```

### Setup without Docker

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

# Run migrations
pnpm run migrate:dev

# Start development server
pnpm dev
```

---

## Running Tests Locally

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test --testPathPattern="__tests__"

# Run with coverage
pnpm test --coverage

# Run E2E tests
pnpm test:e2e

# Run integration tests
pnpm test:integration
```

---

## Building for Production

```bash
# Build Next.js application
pnpm build

# Start production server
pnpm start

# Build Docker image
docker build -t adpa:latest .

# Run Docker container
docker run -p 3000:3000 adpa:latest
```

---

## Troubleshooting

### Pipeline Failures

**Linting Errors**
```bash
pnpm lint --fix  # Auto-fix linting issues
```

**Type Errors**
```bash
pnpm exec tsc --noEmit  # Check types locally
```

**Test Failures**
```bash
pnpm test --watch  # Run tests in watch mode
pnpm test --debug  # Run with debugging
```

**Build Failures**
```bash
pnpm build  # Build locally to debug
rm -rf .next  # Clear Next.js cache
pnpm install --frozen-lockfile  # Reinstall dependencies
```

### Cache Issues

```bash
# Clear local cache
rm -rf node_modules .pnpm-store .next

# Reinstall dependencies
pnpm install --frozen-lockfile
```

### Docker Issues

```bash
# Rebuild Docker image without cache
docker build --no-cache -t adpa:latest .

# Remove all containers and volumes
docker-compose down -v

# Restart services
docker-compose up -d
```

---

## Performance Optimization

### Cache Hit Rates

- **Node modules**: ~95% (only changes on dependency updates)
- **Build cache**: ~80% (changes on code modifications)

### Pipeline Duration

- **Validate stage**: ~2-3 minutes
- **Test stage**: ~5-8 minutes
- **Build stage**: ~3-5 minutes
- **Security stage**: ~2-3 minutes
- **Total**: ~12-19 minutes

### Optimization Tips

1. **Use shallow clones**: Reduces clone time
2. **Parallel jobs**: Jobs run in parallel within stages
3. **Artifact caching**: Reuse build artifacts
4. **Service caching**: Cache Docker images

---

## Security Best Practices

1. **Secrets Management**
   - Use GitLab CI/CD variables for secrets
   - Never commit secrets to repository
   - Rotate secrets regularly

2. **Dependency Security**
   - Run `pnpm audit` regularly
   - Update dependencies promptly
   - Review security advisories

3. **Code Security**
   - Enable SAST scanning
   - Review security reports
   - Fix vulnerabilities before deployment

4. **Access Control**
   - Use non-root user in Docker
   - Restrict deployment permissions
   - Enable branch protection rules

---

## Monitoring & Alerts

### Pipeline Metrics

- Success rate: Target 95%+
- Average duration: Target <20 minutes
- Cache hit rate: Target >80%

### Alerts

- Pipeline failures: Notify team
- Security vulnerabilities: Immediate notification
- Deployment failures: Immediate notification

---

## Related Documentation

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

---

## Support

For pipeline issues or questions:

1. Check this documentation
2. Review pipeline logs in GitLab
3. Check `.gitlab-ci.yml` configuration
4. Contact DevOps team

---

**Last Updated**: 2026-04-01
**Maintained By**: DevOps Team
**Version**: 1.0.0
