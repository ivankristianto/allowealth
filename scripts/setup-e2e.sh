#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Cleanup function to restore environment on failure
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ] && [ -f ".env.backup" ]; then
        echo -e "${RED}Setup failed. Restoring original .env...${NC}"
        cp .env.backup .env
        echo -e "${GREEN}Environment restored${NC}"
    fi
    exit $exit_code
}
trap cleanup EXIT

echo -e "${YELLOW}=== E2E Environment Setup ===${NC}\n"

# 1. Create .env.e2e if it doesn't exist
if [ ! -f ".env.e2e" ]; then
    echo -e "${YELLOW}Creating .env.e2e from .env.example...${NC}"
    if [ ! -f ".env.example" ]; then
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
    cp .env.example .env.e2e

    # Update DATABASE_URL for E2E
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|DATABASE_URL=db/.dev.db|DATABASE_URL=db/.e2e.db|g' .env.e2e
        sed -i '' 's|PORT=4321|PORT=4320|g' .env.e2e
    else
        # Linux
        sed -i 's|DATABASE_URL=db/.dev.db|DATABASE_URL=db/.e2e.db|g' .env.e2e
        sed -i 's|PORT=4321|PORT=4320|g' .env.e2e
    fi

    # Add E2E test user credentials (must match src/db/seed.ts DEMO_USER)
    {
        echo ""
        echo "# E2E Test User Credentials (must match src/db/seed.ts DEMO_USER)"
        echo "E2E_USER_EMAIL=demo@example.com"
        echo "E2E_USER_PASSWORD=demo123456789"
    } >> .env.e2e

    echo -e "${GREEN}Created .env.e2e${NC}\n"
else
    echo -e "${GREEN}.env.e2e already exists, skipping creation${NC}\n"
fi

# 2. Backup current .env if exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Backing up current .env to .env.backup...${NC}"
    cp .env .env.backup
    echo -e "${GREEN}Backup created${NC}\n"
fi

# 3. Switch to E2E environment
echo -e "${YELLOW}Switching to E2E environment...${NC}"
cp .env.e2e .env
echo -e "${GREEN}Environment switched to E2E${NC}\n"

# 4. Create E2E database directory if it doesn't exist
mkdir -p db

# 5. Run database setup (push schema and seed)
echo -e "${YELLOW}WARNING: This will reset the E2E database (db/.e2e.db)${NC}"
echo -e "${YELLOW}Setting up E2E database...${NC}"
bun run db:push --force
bun run db:seed
echo -e "${GREEN}E2E database ready${NC}\n"

echo -e "${GREEN}=== E2E Environment Ready ===${NC}"
echo -e "Server will run on: ${YELLOW}http://localhost:4320${NC}"
echo -e "\nTo restore your dev environment, run:"
echo -e "  ${YELLOW}cp .env.backup .env${NC}"
