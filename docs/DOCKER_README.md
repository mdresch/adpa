# 🐳 ADPA Docker Development Environment

## 🚨 IMPORTANT: Always Use Docker for Development

This project **MUST** be run using Docker containers. **Never** run services locally or modify configurations for local development, as this will break the Docker setup and require significant time to fix.

## 📋 Quick Start

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js React Application |
| Backend | http://localhost:5000 | Express.js API Server |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache & Sessions |
| pgAdmin | http://localhost:8080 | Database Admin (admin@adpa.com / admin123) |
| Redis Commander | http://localhost:8081 | Redis Admin |

## ⚙️ Configuration

### Environment Variables (Docker)

**Database:**
- `DB_HOST=postgres` (Docker service name)
- `DB_USER=postgres`
- `DB_PASSWORD=password`
- `DB_NAME=adpa_db`
- `DB_PORT=5432`

**Redis:**
- `REDIS_URL=redis://redis:6379` (Docker service name)

### Critical Rules

1. **Never use `localhost` or `127.0.0.1`** in configurations when running in Docker
2. **Always use Docker service names** (`postgres`, `redis`) for inter-service communication
3. **Use `host.docker.internal`** only when containers need to access host services
4. **Keep volume mounts** for development hot-reloading

## 🔍 Validation

Run the Docker validation script to ensure configurations are correct:

```bash
# Windows
validate-docker.bat

# Unix/Linux/Mac
./validate-docker.sh
```

## 🛠️ Development Workflow

### Starting Development

```bash
# 1. Ensure Docker is running
docker --version

# 2. Start services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 3. Validate configuration
validate-docker.bat

# 4. Check logs if needed
docker-compose logs -f adpa-backend
```

### Making Changes

1. **Edit code** in your local files (changes are mounted into containers)
2. **Hot-reload** happens automatically for both frontend and backend
3. **Validate** before committing: `validate-docker.bat`
4. **Commit** changes (pre-commit hook will validate automatically)

### Database Operations

```bash
# Access database directly
docker-compose exec postgres psql -U postgres -d adpa_db

# Reset database
docker-compose down -v  # Remove volumes
docker-compose up -d    # Recreate with fresh database
```

## 🚨 Troubleshooting

### Common Issues

**"ENOTFOUND redis" or database connection errors:**
- Ensure all services are running: `docker-compose ps`
- Check service names in configurations match Docker service names

**Permission errors with volume mounts:**
- Docker containers run as root in development to avoid permission issues

**Port conflicts:**
- Ensure ports 3000, 5000, 5432, 6379, 8080, 8081 are available

### Recovery Commands

```bash
# Complete reset
docker-compose down -v --remove-orphans
docker system prune -f
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Check container health
docker-compose ps
docker stats

# View specific service logs
docker-compose logs adpa-backend
docker-compose logs adpa-frontend
```

## 🔒 Git Integration

### Pre-commit Hook

A pre-commit hook automatically validates Docker configuration before each commit. If validation fails:

1. Fix the configuration issues
2. Test with `validate-docker.bat`
3. Commit again

**Emergency bypass** (use only when absolutely necessary):
```bash
git commit --no-verify
```

### What Gets Validated

- Docker Compose service definitions
- Environment variable configurations
- Database and Redis connection strings
- Volume mount configurations
- Running container status

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)

## 🚨 Emergency Contacts

If Docker setup breaks and you can't fix it:

1. Run validation: `validate-docker.bat`
2. Check this README for troubleshooting steps
3. Ask for help with specific error messages
4. **Never** modify configurations for local development

---

**Remember: Docker is not optional - it's required for this project!** 🐳
