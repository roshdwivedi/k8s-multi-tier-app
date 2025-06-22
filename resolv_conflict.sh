#!/bin/bash

echo "🔧 Fixing Port 3306 Conflict"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check what's using port 3306
echo "🔍 Checking what's using port 3306..."
lsof -i :3306 2>/dev/null || echo "lsof not available, trying netstat..."
netstat -tulpn 2>/dev/null | grep :3306 || echo "No netstat output"

# Check for running MySQL containers
echo "🐳 Checking for MySQL containers..."
docker ps -a --filter "ancestor=mysql:8.0" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Stop the conflicting container
echo "🛑 Stopping mysql-local container..."
docker stop mysql-local 2>/dev/null || echo "mysql-local not running"
docker rm mysql-local 2>/dev/null || echo "mysql-local not found"

# Stop all MySQL containers just to be safe
echo "🛑 Stopping all MySQL containers..."
docker stop $(docker ps -q --filter "ancestor=mysql:8.0") 2>/dev/null || echo "No MySQL containers running"

# Clean up any remaining containers
echo "🧹 Cleaning up created but not running containers..."
docker rm k8s-database k8s-backend k8s-frontend 2>/dev/null || echo "Some containers already removed"

# Clean up networks and volumes
echo "🧹 Cleaning up networks and volumes..."
docker-compose down -v --remove-orphans

# Verify port 3306 is free
echo "✅ Verifying port 3306 is now free..."
if lsof -i :3306 >/dev/null 2>&1; then
    echo -e "${RED}❌ Port 3306 is still in use!${NC}"
    echo "Manual intervention needed. Run:"
    echo "sudo kill -9 \$(lsof -t -i:3306)"
    exit 1
else
    echo -e "${GREEN}✅ Port 3306 is now free${NC}"
fi

# Now start the containers properly
echo "🚀 Starting containers with free port..."
docker-compose up -d --build

# Wait a moment and check status
echo "⏳ Waiting for containers to start..."
sleep 10

# Check container status
echo "📊 Container status:"
docker-compose ps

# Check if database container is running
DB_STATUS=$(docker inspect --format='{{.State.Running}}' k8s-database 2>/dev/null)
if [ "$DB_STATUS" == "true" ]; then
    echo -e "${GREEN}🎉 Database container is now running!${NC}"
    
    # Test database connectivity
    echo "🔌 Testing database connectivity..."
    sleep 5
    curl -s http://localhost:3000/health/db || echo "Backend health check not ready yet"
else
    echo -e "${RED}❌ Database container still not running${NC}"
    echo "Database logs:"
    docker logs k8s-database
fi

echo ""
echo "🎯 Next steps:"
echo "1. Wait 30-60 seconds for MySQL to fully initialize"
echo "2. Run your original test script"
echo "3. If issues persist, check logs with: docker-compose logs database"
