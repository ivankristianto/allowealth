#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Setup Script ===${NC}\n"

# Check bun version
echo -e "${YELLOW}Checking Bun version...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: bun is not installed${NC}"
    echo "Please install bun from https://bun.sh"
    exit 1
fi

bun_version=$(bun --version)
echo -e "${GREEN}✓ Bun version: ${bun_version}${NC}\n"

# Run bun install
echo -e "${YELLOW}Installing dependencies...${NC}"
bun install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

# Run bun db:reset
echo -e "${YELLOW}Resetting database...${NC}"
bun run db:reset
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database reset successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to reset database${NC}"
    exit 1
fi

# Success message
echo -e "${GREEN}=== Setup completed successfully! ===${NC}"
echo -e "You can now run: ${YELLOW}bun run dev${NC}"
