#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Allowealth Docker Start ===${NC}\n"

# Check if .env exists, if not create it from template
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"

    if [ ! -f docker/.env.example ]; then
        echo -e "${RED}Error: docker/.env.example not found${NC}"
        exit 1
    fi

    cp docker/.env.example .env
    echo -e "${GREEN}✓ Created .env from docker/.env.example${NC}"

    # Generate BETTER_AUTH_SECRET (32 bytes = 48 base64 chars)
    BETTER_AUTH_SECRET=$(openssl rand -base64 48)
    sed -i.bak "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}/" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ Generated BETTER_AUTH_SECRET${NC}"

    # Generate EMAIL_ENCRYPTION_KEY (32 bytes base64)
    EMAIL_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    sed -i.bak "s/^EMAIL_ENCRYPTION_KEY=.*/EMAIL_ENCRYPTION_KEY=${EMAIL_ENCRYPTION_KEY}/" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ Generated EMAIL_ENCRYPTION_KEY${NC}"

    # Generate COOKIE_SIGNING_SECRET
    COOKIE_SIGNING_SECRET=$(openssl rand -base64 48)
    sed -i.bak "s/^COOKIE_SIGNING_SECRET=.*/COOKIE_SIGNING_SECRET=${COOKIE_SIGNING_SECRET}/" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ Generated COOKIE_SIGNING_SECRET${NC}"

    # Set default PUBLIC_URL for local testing
    sed -i.bak 's/^PUBLIC_URL=.*/PUBLIC_URL=http:\/\/localhost:3000/' .env
    rm -f .env.bak
    echo -e "${GREEN}✓ Set PUBLIC_URL=http://localhost:3000${NC}"

    echo ""
    echo -e "${YELLOW}⚠️  Please review .env and configure required OAuth/Turnstile values:${NC}"
    echo -e "   - GOOGLE_CLIENT_ID (optional for local testing)"
    echo -e "   - GOOGLE_CLIENT_SECRET (optional for local testing)"
    echo -e "   - PUBLIC_TURNSTILE_SITE_KEY (optional for local testing)"
    echo -e "   - TURNSTILE_SECRET_KEY (optional for local testing)"
    echo ""
    echo -e "${BLUE}Edit .env now, then run 'bun run docker:start' again.${NC}"
    echo ""
    exit 0
else
    echo -e "${GREEN}✓ Using existing .env file${NC}"
fi

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Start the stack
echo ""
echo -e "${YELLOW}Starting Allowealth Docker stack...${NC}"
docker compose -f docker/docker-compose.yml up -d --build

echo ""
echo -e "${GREEN}=== Allowealth is starting up! ===${NC}"
echo ""
echo -e "App URL: ${BLUE}http://localhost:3000${NC}"
echo -e "Logs:    ${BLUE}docker compose -f docker/docker-compose.yml logs -f app${NC}"
echo ""
echo -e "${YELLOW}First run? Visit http://localhost:3000 to complete setup.${NC}"
