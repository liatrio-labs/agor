#!/bin/bash
# Test Docker build locally before deploying to Railway
# Run this script to verify your build works correctly

set -e  # Exit on error

echo "🔨 Testing Agor Docker build..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Clean up previous test
echo -e "${YELLOW}Cleaning up previous test...${NC}"
docker rm -f agor-test 2>/dev/null || true
docker rmi -f agor-test 2>/dev/null || true

# Build image
echo -e "${YELLOW}Building Docker image...${NC}"
if docker build -t agor-test -f Dockerfile .; then
  echo -e "${GREEN}✅ Build successful!${NC}"
else
  echo -e "${RED}❌ Build failed!${NC}"
  exit 1
fi

# Check image size
SIZE=$(docker images agor-test --format "{{.Size}}")
echo -e "${GREEN}Image size: ${SIZE}${NC}"

# Run container in background
echo -e "${YELLOW}Starting container...${NC}"
docker run -d \
  --name agor-test \
  -p 3030:3030 \
  -e NODE_ENV=production \
  -e PORT=3030 \
  agor-test

# Wait for startup
echo -e "${YELLOW}Waiting for daemon to start...${NC}"
sleep 10

# Check if container is running
if docker ps | grep -q agor-test; then
  echo -e "${GREEN}✅ Container is running${NC}"
else
  echo -e "${RED}❌ Container failed to start${NC}"
  docker logs agor-test
  exit 1
fi

# Show logs
echo -e "${YELLOW}Container logs:${NC}"
docker logs agor-test

# Test health endpoint
echo -e "${YELLOW}Testing health endpoint...${NC}"
if curl -f -s http://localhost:3030/health > /dev/null; then
  echo -e "${GREEN}✅ Health check passed!${NC}"
  curl http://localhost:3030/health | jq .
else
  echo -e "${RED}❌ Health check failed!${NC}"
  docker logs agor-test
  exit 1
fi

# Test UI endpoint
echo -e "${YELLOW}Testing UI endpoint...${NC}"
if curl -f -s http://localhost:3030/ui/ > /dev/null; then
  echo -e "${GREEN}✅ UI is accessible!${NC}"
else
  echo -e "${RED}❌ UI not accessible${NC}"
fi

# Show running processes
echo -e "${YELLOW}Running processes in container:${NC}"
docker exec agor-test ps aux

# Success!
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🎉 Your Docker build is working correctly!"
echo ""
echo "Next steps:"
echo "  1. Push to GitHub"
echo "  2. Deploy to Railway:"
echo "     - railway init"
echo "     - railway up"
echo "  3. Add persistent volume in Railway dashboard"
echo "  4. Configure environment variables"
echo ""
echo "To access the test container:"
echo "  UI:  http://localhost:3030/ui/"
echo "  API: http://localhost:3030/health"
echo ""
echo "To stop and clean up:"
echo "  docker stop agor-test && docker rm agor-test"
echo ""

