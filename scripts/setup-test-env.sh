#!/bin/bash
set -e

echo "🧪 Setting up Auditvia test environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
echo -e "${BLUE}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker Desktop and try again."
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if Supabase CLI is installed
echo -e "${BLUE}Checking Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
fi
echo -e "${GREEN}✅ Supabase CLI installed${NC}"
echo ""

# Initialize Supabase (if not already initialized)
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${BLUE}Initializing Supabase...${NC}"
    supabase init
    echo -e "${GREEN}✅ Supabase initialized${NC}"
    echo ""
fi

# Start Supabase services
echo -e "${BLUE}Starting Supabase services...${NC}"
supabase start

# Wait for services to be ready
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 5

# Apply migrations
echo -e "${BLUE}Applying database migrations...${NC}"
supabase db push

echo ""
echo -e "${GREEN}✅ Test environment setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Run tests: npm test"
echo "  2. Run integration tests: npm run test:integration"
echo "  3. Run tests in watch mode: npm run test:watch"
echo ""
echo "🛑 To stop Supabase: npm run supabase:stop"
echo ""
echo "📖 See TESTING.md for more details"

