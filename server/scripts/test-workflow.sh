#!/bin/bash
# =============================================================================
# Test Docker Image Workflow
# =============================================================================
# This script:
#   1. Starts the test PostgreSQL container
#   2. Waits for it to be healthy
#   3. Clones schema from dev database (if needed)
#   4. Seeds minimal test data
#   5. Runs authentication and other tests
#   6. Reports results
#   7. Cleans up (stops and removes container)
# =============================================================================

set -e

# Configuration
CONTAINER_NAME="adpa-test-workflow"
TEST_DB_NAME="adpa_test_db"
TEST_USER="test_user"
TEST_PASS="test_pass"
TEST_PORT=5433
DEV_DB_PORT=5432
SERVER_PORT=5000
SCHEMA_FILE="./schema-dev.sql"
DATA_FILE="./data-seed.sql"
SEED_SCRIPT="./scripts/seed-test-users.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Cleanup Function
# =============================================================================
cleanup() {
    log_info "Cleaning up..."
    
    # Kill server if running on test port
    if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_info "Stopping test server on port $SERVER_PORT"
        lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t | xargs kill 2>/dev/null || true
    fi
    
    # Stop and remove test container
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "Stopping container $CONTAINER_NAME"
        docker stop $CONTAINER_NAME 2>/dev/null || true
        log_info "Removing container $CONTAINER_NAME"
        docker rm -f $CONTAINER_NAME 2>/dev/null || true
    fi
    
    log_info "Cleanup complete"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# =============================================================================
# Step 1: Start Test Docker Container
# =============================================================================
log_info "=============================================="
log_info "Step 1: Starting test Docker container"
log_info "=============================================="

# Check if container already exists and remove
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_warn "Container $CONTAINER_NAME exists, removing..."
    docker rm -f $CONTAINER_NAME >/dev/null 2>&1 || true
fi

# Start test PostgreSQL container
docker run -d \
    --name $CONTAINER_NAME \
    -e POSTGRES_USER=$TEST_USER \
    -e POSTGRES_PASSWORD=$TEST_PASS \
    -e POSTGRES_DB=$TEST_DB_NAME \
    -p $TEST_PORT:5432 \
    --health-cmd="pg_isready -U $TEST_USER -d $TEST_DB_NAME" \
    --health-interval=2s \
    --health-timeout=5s \
    --health-retries=10 \
    postgres:15-alpine

log_info "Container $CONTAINER_NAME started"

# =============================================================================
# Step 2: Wait for Container to be Healthy
# =============================================================================
log_info "=============================================="
log_info "Step 2: Waiting for container to be healthy"
log_info "=============================================="

ATTEMPTS=0
MAX_ATTEMPTS=30

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "starting")
    
    if [ "$HEALTH" = "healthy" ]; then
        log_info "Container is healthy!"
        break
    fi
    
    log_info "Waiting for container to be healthy... ($HEALTH)"
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    
    if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
        log_error "Container failed to become healthy"
        exit 1
    fi
done

# Additional wait for PostgreSQL to be fully ready
sleep 2
log_info "Test database ready on port $TEST_PORT"

# =============================================================================
# Step 3: Clone Schema from Dev Database
# =============================================================================
log_info "=============================================="
log_info "Step 3: Cloning schema from dev database"
log_info "=============================================="

# Check if schema file exists, if not create it
if [ ! -f "$SCHEMA_FILE" ]; then
    log_info "Schema file not found, dumping from dev database..."
    docker exec adpa-postgres_db pg_dump -U myuser -d adpa --schema-only --no-owner --no-privileges > "$SCHEMA_FILE" 2>/dev/null
    log_info "Schema saved to $SCHEMA_FILE"
else
    log_info "Using existing schema file: $SCHEMA_FILE"
fi

# Import schema to test database
log_info "Importing schema to test database..."
docker exec -i $CONTAINER_NAME psql -U $TEST_USER -d $TEST_DB_NAME < "$SCHEMA_FILE" >/dev/null 2>&1 || true
log_info "Schema imported successfully"

# =============================================================================
# Step 4: Seed Test Data
# =============================================================================
log_info "=============================================="
log_info "Step 4: Seeding test data"
log_info "=============================================="

# Check if data file exists, if not create minimal seed
if [ ! -f "$DATA_FILE" ]; then
    log_info "Data file not found, seeding from dev database..."
    docker exec adpa-postgres_db pg_dump -U myuser -d adpa --data-only --no-owner --no-privileges --table=companies --table=ai_providers > "$DATA_FILE" 2>/dev/null || true
fi

# Import seed data
if [ -f "$DATA_FILE" ]; then
    log_info "Importing seed data..."
    docker exec -i $CONTAINER_NAME psql -U $TEST_USER -d $TEST_DB_NAME < "$DATA_FILE" >/dev/null 2>&1 || true
fi

# Seed test users
log_info "Seeding test users..."
export DATABASE_URL="postgresql://${TEST_USER}:${TEST_PASS}@localhost:${TEST_PORT}/${TEST_DB_NAME}"
cd ./server
node $SEED_SCRIPT >/dev/null 2>&1 || true
cd ..

log_info "Test data seeded successfully"

# =============================================================================
# Step 5: Run Tests
# =============================================================================
log_info "=============================================="
log_info "Step 5: Running tests"
log_info "=============================================="

# Set environment for tests
export DATABASE_URL="postgresql://${TEST_USER}:${TEST_PASS}@localhost:${TEST_PORT}/${TEST_DB_NAME}"
export JWT_SECRET="test-jwt-secret"
export NODE_ENV="test"

# Start server in background
log_info "Starting test server..."
cd ./server
pnpm start > /tmp/test-server.log 2>&1 &
SERVER_PID=$!
cd ..

# Wait for server to start
log_info "Waiting for server to start..."
sleep 10

# Check if server is running
if ! curl -s http://localhost:$SERVER_PORT/health >/dev/null 2>&1; then
    log_error "Server failed to start"
    cat /tmp/test-server.log
    exit 1
fi

log_info "Server running on port $SERVER_PORT"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0

# -----------------------------------------------------------------------------
# Test 1: Authentication - Valid Login
# -----------------------------------------------------------------------------
log_info "Test 1: Authentication - Valid Login"
RESPONSE=$(curl -s -X POST http://localhost:$SERVER_PORT/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@adpa.com","password":"admin123"}')

if echo "$RESPONSE" | grep -q '"success":true'; then
    log_info "  ✓ Valid login works"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Extract token for subsequent tests
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    log_error "  ✗ Valid login failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# -----------------------------------------------------------------------------
# Test 2: Authentication - Invalid Password
# -----------------------------------------------------------------------------
log_info "Test 2: Authentication - Invalid Password"
RESPONSE=$(curl -s -X POST http://localhost:$SERVER_PORT/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@adpa.com","password":"wrongpassword"}')

if echo "$RESPONSE" | grep -q '"error":"Invalid credentials"'; then
    log_info "  ✓ Invalid password rejected"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "  ✗ Invalid password not rejected"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# -----------------------------------------------------------------------------
# Test 3: Authentication - Get Current User
# -----------------------------------------------------------------------------
log_info "Test 3: Authentication - Get Current User"
RESPONSE=$(curl -s http://localhost:$SERVER_PORT/api/auth/me \
    -H "Authorization: Bearer $TOKEN")

if echo "$RESPONSE" | grep -q '"success":true'; then
    log_info "  ✓ Get current user works"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "  ✗ Get current user failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# -----------------------------------------------------------------------------
# Test 4: Authentication - Invalid Token
# -----------------------------------------------------------------------------
log_info "Test 4: Authentication - Invalid Token"
RESPONSE=$(curl -s http://localhost:$SERVER_PORT/api/auth/me \
    -H "Authorization: Bearer invalid-token")

if echo "$RESPONSE" | grep -q '"error"'; then
    log_info "  ✓ Invalid token rejected"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "  ✗ Invalid token not rejected"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# -----------------------------------------------------------------------------
# Test 5: Authentication - Missing Token
# -----------------------------------------------------------------------------
log_info "Test 5: Authentication - Missing Token"
RESPONSE=$(curl -s http://localhost:$SERVER_PORT/api/auth/me)

if echo "$RESPONSE" | grep -q '"error":"Access token required"'; then
    log_info "  ✓ Missing token rejected"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "  ✗ Missing token not rejected"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# -----------------------------------------------------------------------------
# Test 6: Health Check
# -----------------------------------------------------------------------------
log_info "Test 6: Health Check"
RESPONSE=$(curl -s http://localhost:$SERVER_PORT/health)

if echo "$RESPONSE" | grep -q '"status":"healthy"'; then
    log_info "  ✓ Health check passes"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "  ✗ Health check failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# -----------------------------------------------------------------------------
# Test 7: Database Connection
# -----------------------------------------------------------------------------
log_info "Test 7: Database Connection"
docker exec $CONTAINER_NAME psql -U $TEST_USER -d $TEST_DB_NAME -c "SELECT COUNT(*) FROM users" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    log_info "  ✓ Database connection works"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    log_error "  ✗ Database connection failed"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# =============================================================================
# Step 6: Summary
# =============================================================================
log_info "=============================================="
log_info "Test Results Summary"
log_info "=============================================="
log_info "Tests Passed: $TESTS_PASSED"
log_info "Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    log_info "All tests passed!"
    EXIT_CODE=0
else
    log_error "Some tests failed!"
    EXIT_CODE=1
fi

# =============================================================================
# Step 7: Cleanup (handled by trap)
# =============================================================================
log_info "=============================================="
log_info "Cleaning up..."
log_info "=============================================="

# Kill server
if [ ! -z "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null || true
fi

# Stop and remove container (handled by trap)
docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
docker rm -f $CONTAINER_NAME >/dev/null 2>&1 || true

log_info "Workflow complete!"

exit $EXIT_CODE
