#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
WORKTREE_MODE=false
for arg in "$@"; do
    if [ "$arg" = "--worktree" ]; then
        WORKTREE_MODE=true
        break
    fi
done

echo -e "${YELLOW}=== Setup Script ===${NC}\n"

# Worktree mode setup
if [ "$WORKTREE_MODE" = true ]; then
    echo -e "${YELLOW}Worktree mode: configuring environment...${NC}"

    # Copy .env.example to .env if .env doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env from .env.example${NC}"
    else
        echo -e "${YELLOW}⚠ .env already exists, skipping copy${NC}"
    fi

    # Get current branch name
    CURRENT_BRANCH=$(git branch --show-current)
    if [ -z "$CURRENT_BRANCH" ]; then
        echo -e "${RED}✗ Could not determine current branch${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Current branch: ${CURRENT_BRANCH}${NC}"

    # Set DEV_HOST to {branch}.allowealth.local (uncomment and set the value)
    if [ -f .env ]; then
        # Update DEV_HOST line - handle both commented and uncommented versions
        sed -i.bak "s/^# DEV_HOST=.*/DEV_HOST=${CURRENT_BRANCH}.allowealth.local/" .env
        sed -i.bak "s/^DEV_HOST=.*/DEV_HOST=${CURRENT_BRANCH}.allowealth.local/" .env
        rm -f .env.bak
        echo -e "${GREEN}✓ Set DEV_HOST=${CURRENT_BRANCH}.allowealth.local${NC}"

        # Find an available port between 4322-4310 (descending)
        echo -e "${YELLOW}Finding available port (4322-4310)...${NC}"
        AVAILABLE_PORT=""
        for port in {4322..4310}; do
            if ! lsof -i :$port > /dev/null 2>&1; then
                AVAILABLE_PORT=$port
                break
            fi
        done

        if [ -z "$AVAILABLE_PORT" ]; then
            echo -e "${RED}✗ No available port found in range 4322-4310${NC}"
            exit 1
        fi

        # Update PORT in .env
        sed -i.bak "s/^PORT=.*/PORT=${AVAILABLE_PORT}/" .env
        rm -f .env.bak
        echo -e "${GREEN}✓ Set PORT=${AVAILABLE_PORT}${NC}\n"
    fi
fi

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
if [ "$WORKTREE_MODE" = true ]; then
    DEV_HOST=$(grep "^DEV_HOST=" .env | cut -d'=' -f2)
    PORT=$(grep "^PORT=" .env | cut -d'=' -f2)
    echo -e "Your dev server: ${YELLOW}http://${DEV_HOST}:${PORT}${NC}"
else
    echo -e "You can now run: ${YELLOW}bun run dev${NC}"
fi
