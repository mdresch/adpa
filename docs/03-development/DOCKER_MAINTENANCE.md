# ADPA Docker Setup and Maintenance Guide

## 🐳 Overview

This guide covers the Docker containerization setup for the ADPA (Advanced Document Processing Application) system, which consists of multiple services running in separate containers for optimal scalability and maintainability.

## 📋 Architecture

The ADPA system is containerized with the following services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │   ADPA Backend  │
│    (Database)   │◄──►│    (Cache)      │◄──►│    (API)        │
│                 │    │                 │    │                 │
│ Port: 5432      │    │ Port: 6379      │    │ Port: 5000      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │ ADPA Frontend   │
                                               │   (Next.js)     │
                                               │                 │
                                               │ Port: 3000      │
                                               └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ available RAM
- 10GB+ available disk space

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd adpa
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

### Access Points

- **ADPA Frontend:** http://localhost:3000
- **ADPA Backend API:** http://localhost:5000
- **pgAdmin:** http://localhost:8080 (admin@adpa.com / admin123)
- **Redis Commander:** http://localhost:8081

## 🔧 Service Configuration

### Environment Variables

Each service uses environment variables for configuration:

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000
NODE_ENV=production
```

#### Backend (server/.env.local)
```bash
POSTGRES_URL=postgres://postgres:password@postgres:5432/adpa_db
REDIS_URL=redis://redis:6379
JWT_SECRET=your-development-jwt-secret-key-here-make-it-long-and-secure
NODE_ENV=production
PORT=5000
```

## 📊 Monitoring and Maintenance

### Health Checks

All services include health checks:

```bash
# Check all service health
docker-compose ps

# Check specific service logs
docker-compose logs adpa-backend
docker-compose logs adpa-frontend
```

### Database Management

#### Using pgAdmin

1. Open http://localhost:8080
2. Login: `admin@adpa.com` / `admin123`
3. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Username: `postgres`
   - Password: `password`
   - Database: `adpa_db`

#### Direct Database Access

```bash
# Connect to PostgreSQL
docker exec -it adpa-postgres psql -U postgres -d adpa_db

# Backup database
docker exec adpa-postgres pg_dump -U postgres adpa_db > backup.sql

# Restore database
docker exec -i adpa-postgres psql -U postgres adpa_db < backup.sql
```

### Redis Management

#### Using Redis Commander

1. Open http://localhost:8081
2. Connect to `redis:6379`

#### Direct Redis Access

```bash
# Connect to Redis CLI
docker exec -it adpa-redis redis-cli

# Check Redis info
docker exec -it adpa-redis redis-cli info
```

## 🔄 Updates and Deployment

### Building Custom Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build adpa-backend
docker-compose build adpa-frontend

# Rebuild and restart
docker-compose up -d --build
```

### Updating Base Images

```bash
# Pull latest base images
docker-compose pull

# Update and restart
docker-compose up -d
```

### Rolling Updates

```bash
# Update backend without downtime
docker-compose up -d adpa-backend

# Update frontend without downtime
docker-compose up -d adpa-frontend
```

## 🐛 Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check service logs
docker-compose logs <service-name>

# Check service configuration
docker-compose config

# Restart specific service
docker-compose restart <service-name>
```

#### Database Connection Issues

```bash
# Check database health
docker exec adpa-postgres pg_isready -U postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

#### Port Conflicts

```bash
# Check port usage
netstat -tulpn | grep :3000

# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Change host port
```

### Log Analysis

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs -f adpa-backend

# Export logs for analysis
docker-compose logs > logs.txt
```

## 📈 Performance Optimization

### Resource Allocation

```yaml
# docker-compose.yml
services:
  adpa-backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Database Optimization

```sql
-- Check database performance
SELECT * FROM pg_stat_activity;

-- Analyze table statistics
ANALYZE;

-- Check index usage
SELECT * FROM pg_stat_user_indexes;
```

### Redis Optimization

```bash
# Check Redis memory usage
docker exec -it adpa-redis redis-cli info memory

# Configure Redis persistence
docker exec -it adpa-redis redis-cli config set save "900 1"
```

## 🔒 Security

### Container Security

- Run containers as non-root users
- Use specific user permissions
- Regularly update base images
- Scan images for vulnerabilities

### Network Security

```yaml
# docker-compose.yml
networks:
  adpa-network:
    driver: bridge
    internal: true  # Isolate from external access
```

### Secret Management

- Use Docker secrets for sensitive data
- Rotate passwords regularly
- Use environment-specific configurations

## 📋 Backup and Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec adpa-postgres pg_dump -U postgres adpa_db > backup_$DATE.sql

# Compress backup
gzip backup_$DATE.sql
```

### Full System Backup

```bash
# Stop services
docker-compose down

# Backup volumes
docker run --rm -v adpa_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Start services
docker-compose up -d
```

### Recovery

```bash
# Restore database
docker exec -i adpa-postgres psql -U postgres adpa_db < backup.sql

# Restore volumes
docker run --rm -v adpa_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## 🔧 Development Workflow

### Local Development

```bash
# Start only database and Redis
docker-compose up -d postgres redis

# Run frontend locally
npm run dev

# Run backend locally
cd server && npm run dev
```

### Testing

```bash
# Run tests in containers
docker-compose exec adpa-backend npm test

# Run integration tests
docker-compose exec adpa-backend npm run test:integration
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## 🆘 Support

For issues with Docker setup:

1. Check service logs: `docker-compose logs`
2. Verify configuration: `docker-compose config`
3. Check resource usage: `docker stats`
4. Review this documentation
5. Check GitHub issues for similar problems

---

**Last Updated:** September 5, 2025
**Version:** 1.0.0
