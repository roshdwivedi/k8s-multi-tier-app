#!/bin/bash

echo "🚀 Starting Local Testing for Multi-Tier App"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is ready
check_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose down -v

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check database
check_service "http://localhost:3000/health/db" "Database Connection"
if [ $? -ne 0 ]; then
    echo -e "${RED}Database connection failed. Checking logs...${NC}"
    docker-compose logs database
    exit 1
fi

# Check backend
check_service "http://localhost:3000/health" "Backend Service"
if [ $? -ne 0 ]; then
    echo -e "${RED}Backend service failed. Checking logs...${NC}"
    docker-compose logs backend
    exit 1
fi

# Check frontend
check_service "http://localhost:8080" "Frontend Service"
if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend service failed. Checking logs...${NC}"
    docker-compose logs frontend
    exit 1
fi

# Run API tests
echo "🧪 Running API Tests..."
echo "----------------------"

# Test database connectivity
echo "Testing database connectivity..."
response=$(curl -s http://localhost:3000/health/db)
echo "Database health: $response"

# Test API endpoints (adjust based on your actual endpoints)
echo "Testing API endpoints..."
curl -s http://localhost:3000/api/users | jq '.' || echo "Users endpoint test"
curl -s http://localhost:3000/api/tasks | jq '.' || echo "Tasks endpoint test"

echo ""
echo -e "${GREEN}🎉 All services are running successfully!${NC}"
echo "============================================="
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend API: http://localhost:3000"
echo "🗄️  Database: localhost:3306"
echo ""
echo "🔍 Useful commands:"
echo "  docker-compose logs -f          # View all logs"
echo "  docker-compose logs database    # Database logs"
echo "  docker-compose logs backend     # Backend logs"
echo "  docker-compose logs frontend    # Frontend logs"
echo "  docker-compose down -v          # Stop and cleanup"
echo ""
echo "💡 Test URLs:"
echo "  http://localhost:3000/health    # Backend health"
echo "  http://localhost:3000/health/db # Database connectivity"
echo "  http://localhost:3000/ready     # Service readiness"