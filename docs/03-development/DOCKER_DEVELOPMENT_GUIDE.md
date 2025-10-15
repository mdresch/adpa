# Docker Development Guide for ADPA

## Overview
This guide covers setting up and using Docker for development of the ADPA application. The development setup provides hot reloading, debugging capabilities, and isolated environments for each service.

## Prerequisites
- Docker Desktop installed and running
- Docker Compose V2
- At least 4GB RAM allocated to Docker
- Git (for cloning the repository)

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd adpa
```

### 2. Environment Setup
Copy the environment template and configure your variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Development Environment
```bash
# Start all services in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or start specific services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d adpa-frontend adpa-backend
```

### 4. View Logs
```bash
# View all logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f adpa-frontend
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432 (from host)
- Redis: localhost:6379 (from host)

## Development Workflow

### Hot Reloading
The development setup includes:
- **Frontend**: Automatic reload on file changes
- **Backend**: Hot reload with nodemon
- **Volume Mounting**: Source code changes reflect immediately

### Debugging
- **Backend**: Debug port 9229 exposed for Node.js debugging
- **Frontend**: Standard Next.js debugging through browser dev tools

### Database Access
```bash
# Connect to PostgreSQL from host
psql -h localhost -p 5432 -U adpa_user -d adpa_db

# Or use Docker exec
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec postgres psql -U adpa_user -d adpa_db
```

## Service Management

### Starting Services
```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Start with rebuild
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Stopping Services
```bash
# Stop all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Stop and remove volumes
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

### Rebuilding Services
```bash
# Rebuild specific service
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build adpa-frontend

# Rebuild all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
```

## Development Commands

### Running Tests
```bash
# Run tests in containers
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec adpa-frontend pnpm test
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec adpa-backend npm test
```

### Database Migrations
```bash
# Run migrations
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec adpa-backend npm run migrate

# Create new migration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec adpa-backend npm run migrate:create
```

### Logs and Monitoring
```bash
# Follow all logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# View resource usage
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
docker stats
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using ports
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :5000

   # Change ports in docker-compose.dev.yml if needed
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

3. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs postgres

   # Restart database
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart postgres
   ```

4. **Build Failures**
   ```bash
   # Clear Docker cache
   docker system prune -f

   # Rebuild without cache
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
   ```

### Performance Optimization

1. **Docker Desktop Settings**
   - Allocate at least 4GB RAM
   - Enable file sharing for project directory
   - Enable experimental features if available

2. **Volume Performance**
   - Use Docker Desktop's file sharing settings
   - Consider using Mutagen for better performance on macOS/Windows

## Advanced Development

### Custom Environment Variables
Create `.env.dev` for development-specific variables:
```bash
cp .env .env.dev
# Edit .env.dev with development settings
```

### Multiple Environments
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Testing
docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d

# Production
docker-compose -f docker-compose.yml up -d
```

### Database Seeding
```bash
# Seed development database
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec adpa-backend npm run seed
```

## Contributing

When making changes to Docker configuration:
1. Update both `docker-compose.yml` and `docker-compose.dev.yml`
2. Test changes in development environment
3. Update this documentation if needed
4. Ensure production builds still work

## Support

For issues with Docker development setup:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Ensure all required ports are available
4. Check Docker Desktop resource allocation
