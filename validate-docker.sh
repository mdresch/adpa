#!/bin/bash

# Docker Configuration Validator for ADPA Project
# This script validates that Docker configurations are correct and haven't been accidentally modified

set -e

echo "🔍 Validating Docker Configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a file contains expected content
check_file_contains() {
    local file="$1"
    local pattern="$2"
    local description="$3"

    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ File not found: $file${NC}"
        return 1
    fi

    if ! grep -q "$pattern" "$file"; then
        echo -e "${RED}❌ $description not found in $file${NC}"
        echo -e "${YELLOW}   Expected pattern: $pattern${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $description found in $file${NC}"
        return 0
    fi
}

# Function to check Docker service configuration
check_docker_service() {
    local service="$1"
    local file="$2"
    local description="$3"

    if ! grep -q "services:" "$file" && grep -q "$service:" "$file"; then
        echo -e "${RED}❌ $description service not found in $file${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $description service found in $file${NC}"
        return 0
    fi
}

echo ""
echo "📋 Checking Docker Compose Files..."

# Check docker-compose.yml
echo ""
echo "🔧 Checking docker-compose.yml..."
check_file_contains "docker-compose.yml" "container_name: adpa-postgres" "PostgreSQL service"
check_file_contains "docker-compose.yml" "container_name: adpa-redis" "Redis service"
check_file_contains "docker-compose.yml" "container_name: adpa-backend" "Backend service"
check_file_contains "docker-compose.yml" "container_name: adpa-frontend" "Frontend service"
check_file_contains "docker-compose.yml" "DB_HOST=postgres" "Database host configuration"
check_file_contains "docker-compose.yml" "REDIS_URL=redis://redis:6379" "Redis URL configuration"

# Check docker-compose.dev.yml
echo ""
echo "🔧 Checking docker-compose.dev.yml..."
check_file_contains "docker-compose.dev.yml" "volumes:" "Volume mounts for development"
check_file_contains "docker-compose.dev.yml" "./server/src:/app/src" "Backend source volume mount"
check_file_contains "docker-compose.dev.yml" "command: npm run dev" "Development command for backend"
check_file_contains "docker-compose.dev.yml" "command: pnpm run dev" "Development command for frontend"

echo ""
echo "🔧 Checking Server Configuration..."

# Check server database connection
check_file_contains "server/src/database/connection.ts" "host: process.env.DB_HOST" "Database host environment variable"
check_file_contains "server/src/database/connection.ts" "DB_HOST.*postgres" "PostgreSQL host reference"

# Check server Redis connection
check_file_contains "server/src/utils/redis.ts" "redis://redis:6379" "Redis Docker service URL"

echo ""
echo "🔧 Checking Environment Configuration..."

# Check .env file for Docker-compatible settings
if [ -f "server/.env" ]; then
    check_file_contains "server/.env" "DB_HOST=host.docker.internal" "Docker-compatible database host"
    check_file_contains "server/.env" "REDIS_URL=redis://host.docker.internal:6379" "Docker-compatible Redis URL"
else
    echo -e "${YELLOW}⚠️  server/.env not found - this is expected in production${NC}"
fi

echo ""
echo "🔧 Checking Docker Images..."

# Check if Docker images exist
if command -v docker &> /dev/null; then
    if docker images | grep -q "adpa"; then
        echo -e "${GREEN}✅ ADPA Docker images found${NC}"
    else
        echo -e "${YELLOW}⚠️  No ADPA Docker images found - run 'docker-compose build' to build them${NC}"
    fi
else
    echo -e "${RED}❌ Docker not installed or not in PATH${NC}"
fi

echo ""
echo "🔧 Checking Running Containers..."

# Check if containers are running
if command -v docker &> /dev/null; then
    if docker ps | grep -q "adpa"; then
        echo -e "${GREEN}✅ ADPA containers are running${NC}"
    else
        echo -e "${YELLOW}⚠️  No ADPA containers running - run 'docker-compose up -d' to start them${NC}"
    fi
else
    echo -e "${RED}❌ Docker not available${NC}"
fi

echo ""
echo "📝 Docker Configuration Validation Complete!"
echo ""
echo "💡 Quick Commands:"
echo "   Start services: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d"
echo "   Stop services:  docker-compose down"
echo "   View logs:      docker-compose logs -f"
echo "   Rebuild:        docker-compose build --no-cache"
echo ""
echo "🔒 Remember: Always use Docker service names (postgres, redis) in configurations,"
echo "   never localhost or 127.0.0.1 when running in Docker containers."
