# Allowealth

Personal and Family Financial Application

## Quick Start

```bash
# Install dependencies
bun install

# Set up database (migrate + seed with demo data)
bun run db:reset

# Start development server
bun run dev
```

## Local Development Setup

### dnsmasq (Custom `.allowealth.local` Hostname)

To use custom local hostnames like `main.allowealth.local`, install and configure dnsmasq. This lets each worktree run on its own named domain instead of a numbered port.

**Why this is needed:** macOS routes all `.local` queries through mDNS/Bonjour, which doesn't know about your custom domains. dnsmasq + a resolver override redirects `*.allowealth.local` to `127.0.0.1` via the system DNS stack.

**1. Install dnsmasq:**

```bash
brew install dnsmasq
```

**2. Configure the wildcard rule:**

```bash
echo "address=/allowealth.local/127.0.0.1" >> /opt/homebrew/etc/dnsmasq.conf
```

**3. Start dnsmasq and enable on login:**

```bash
sudo brew services start dnsmasq
```

**4. Create the macOS resolver override:**

```bash
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" | sudo tee /etc/resolver/allowealth.local
```

**5. Verify:**

```bash
ping -c 1 main.allowealth.local
# Expected: 64 bytes from 127.0.0.1
```

**6. Set `DEV_HOST` in `.env`:**

```bash
DEV_HOST=main.allowealth.local
PORT=4350
```

---

## New Worktree Initial Setup

For branch-based local development (useful when working on multiple branches simultaneously):

1. **Copy environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Configure host and port:**
   Edit `.env` and set:
   - `DEV_HOST` to `{branch}.allowealth.local` (e.g., `feature-auth.allowealth.local`)
   - `PORT` to an unused port (e.g., `4350`, `4351`, ...)

3. **Run setup script:**
   ```bash
   ./scripts/setup.sh
   ```

**Or use the automated worktree setup:**

```bash
./scripts/setup.sh --worktree
```

This automatically configures `.env` with the branch name (e.g., `feature-auth.allowealth.local`) and finds an available port.

This script will:

- Check Bun version
- Install dependencies
- Reset and seed the database

After setup completes, start the dev server with `bun run dev` and access the app at `http://{branch}.allowealth.local:{port}`.

## Database Seeding

### Demo User Credentials

After seeding, you can log in with:

- **Email:** `demo@example.com`
- **Password:** `demo123`

### Seeded Data

The seeder creates realistic sample data for testing:

- **1 User** with default settings (IDR as primary currency)
- **15 Categories** (4 income, 11 expense types)
- **5 Payment Methods** (Cash, BCA Debit/Credit, GoPay, OVO)
- **360+ Transactions** spanning 90 days with Indonesian spending patterns
- **6 Assets** (bank accounts, mutual funds, stocks, crypto)
- **72 Asset History entries** (weekly balance updates)
- **6 Asset Update Reminders**
- **3 Asset Snapshots** with items
- **90 Exchange Rate entries** (IDR/USD for last 90 days)

### Seed Commands

```bash
# Seed database with full demo data (keeps existing data)
bun run db:seed

# Seed database with dashboard test data (lightweight, focused on dashboard)
bun run db:seed:dashboard

# Reset database with full demo data
bun run db:reset

# Reset database with dashboard test data
bun run db:reset:dashboard

# Empty database (delete all data, preserve schema)
bun run db:empty

# Empty production database (with 5-second safety delay)
bun run db:empty:prod
```

### Dashboard Test User

For dashboard testing, you can use the dashboard seeder which creates:

- **Email:** `test@example.com`
- **Password:** `Test12345678!`

The dashboard seeder creates focused test data:

- **1 User** with default settings
- **11 Categories** (3 income, 8 expense types)
- **3 Payment Methods** (Cash, Bank Transfer, Credit Card)
- **200+ Transactions** spanning 90 days
- **6 Assets** with varied update dates (to test priority logic)
- **90 Exchange Rate entries** (IDR/USD)

### Troubleshooting

**Issue:** "no such table" error when running `db:seed`

**Solution:** The database tables haven't been created yet. Run `bun run db:reset` to set up the database from scratch.

**Issue:** Database becomes corrupted or has invalid data

**Solution:** Run `bun run db:reset` to start fresh with a clean database.

## Workspace Management

Workspaces provide a shared financial context for families, teams, or groups. Each workspace maintains isolated data including transactions, budgets, assets, and settings. Users belong to one workspace and have a designated role (admin or member).

### Key Concepts

- **Data Isolation:** Each workspace has completely separate financial data
- **Workspace Settings:** Currency and week-start preferences apply to all members
- **Role-Based Access:** Admins have full control, members have limited permissions
- **Cascade Delete:** Deleting a workspace removes all associated data permanently

### CLI Commands

#### Create Workspace

Create a new workspace with custom settings and admin invitation:

```bash
# Basic workspace creation
bun run cli:create-workspace -- --name "My Family" --email admin@example.com

# Create with custom settings
bun run cli:create-workspace -- --name "Business" --email owner@business.com --currency USD --week-start sunday
```

**Example Output:**

```text
Creating workspace...

✓ Created workspace: My Family (abc123def456)
✓ Set workspace settings (currency: IDR, weekStart: monday)
✓ Created admin invitation for: admin@example.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Workspace created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Invitation link:
  http://localhost:4321/signup?token=...
```

**Available Options:**

- `--name, -n` - Workspace name (required)
- `--email, -e` - Admin email address (required, prompts if missing)
- `--currency, -c` - Default currency code (default: IDR)
- `--week-start, -w` - Week start day: `monday` or `sunday` (default: monday)
- `--public-url` - Base URL for the signup link (overrides `PUBLIC_URL` env var)

#### List Workspaces

View all workspaces with their details:

```bash
bun run cli:list-workspaces
```

**Example Output:**

```
Fetching workspaces...

Found 2 workspace(s):

────────────────────────────────────────────────────────────────────────────────

Workspace: My Family
  ID:         abc123def456
  Created:    2026-01-15
  Members:    4
  Settings:
    currency: IDR
    week_start: monday
────────────────────────────────────────────────────────────────────────────────

Workspace: Business
  ID:         xyz789uvw012
  Created:    2026-01-20
  Members:    2
  Settings:
    currency: USD
    week_start: sunday
────────────────────────────────────────────────────────────────────────────────

Total: 2 workspace(s)
```

#### Delete Workspace

Remove a workspace and all associated data:

```bash
# Delete with confirmation prompt
bun run cli:delete-workspace -- --id abc123def456

# Force delete without confirmation (use with caution)
bun run cli:delete-workspace -- --id abc123def456 --force
```

**Example Output (with confirmation):**

```
Looking up workspace...

Found workspace:
  ID:      abc123def456
  Name:    My Family
  Members: 4

This will permanently delete:
  - Workspace: My Family
  - 4 member(s)
  - All related data (categories, transactions, assets, etc.)

This action cannot be undone.

Type "DELETE" to confirm: DELETE

Deleting workspace...
Workspace deleted successfully!
```

**Warning:** Workspace deletion is irreversible and removes:

- All workspace members
- All categories and payment methods
- All transactions and budget data
- All assets and asset history
- All workspace settings

### Workspace Settings

Each workspace has configurable settings that apply to all members:

- **Currency** - Primary currency for displaying amounts (e.g., IDR, USD, EUR)
- **Week Start** - First day of the week (`monday` or `sunday`) for reports and charts
- **Compact Numbers** - Display large numbers in compact format (e.g., "1.2K" vs "1,200")

Settings can be configured during workspace creation or modified via the CLI commands.

### Member Management

**Current Implementation:**

- Members are associated with workspaces at the database level
- Each user has a `workspace_id` and `role` field
- Roles: `admin` (full access) or `member` (limited permissions)

**Future Implementation:**

- UI-based member invitations (admin only)
- Permission controls for different operations
- Member removal and role changes

## MCP Server (AI Assistant Integration)

Allowealth includes an MCP (Model Context Protocol) server that lets AI assistants like Claude Desktop, Claude Code, and other MCP-compatible clients interact with your financial data — log expenses, check budgets, and query transactions via natural language.

### Transport Options

| Transport | Use Case                              | Setup                             |
| --------- | ------------------------------------- | --------------------------------- |
| **stdio** | Local MCP clients on the same machine | Runs as a Bun subprocess          |
| **HTTP**  | Remote access from deployed app       | `POST /api/mcp` with Bearer token |

### Quick Start

```bash
# 1. Create an API key
bun run cli:create-api-key -- \
  --workspace-id <id> --user-id <id> --name "Claude Desktop"

# 2. Configure your MCP client (stdio example for Claude Desktop)
# Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "allowealth": {
      "command": "bun",
      "args": ["run", "/path/to/allowealth/mcp-server/src/index.ts"],
      "env": { "ALLOWEALTH_API_KEY": "aw_..." }
    }
  }
}
```

For HTTP transport setup and full documentation, see [`mcp-server/README.md`](mcp-server/README.md).

## E2E Testing

End-to-end tests use Playwright with a Page Object Model pattern.

### Prerequisites

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium --with-deps
```

### Running E2E Tests

```bash
# Setup E2E environment (creates .env.e2e and seeds test database)
bun run test:e2e:setup

# Run all E2E tests
bun run test:e2e

# Run tests with browser visible
bun run test:e2e:headed

# Run tests in UI mode (interactive debugging)
bun run test:e2e:ui

# Run tests in debug mode (step through)
bun run test:e2e:debug

# Run only critical business flow tests
bun run test:e2e:critical

# View HTML test report
bun run test:e2e:report
```

### E2E Test Structure

```
e2e/
├── playwright.config.ts     # Playwright configuration
├── tests/
│   ├── global-setup.ts      # Authentication setup
│   ├── test.fixture.ts      # Custom test fixtures
│   ├── business-flow.spec.ts # Critical path tests
│   ├── add-expense.spec.ts  # Expense transaction tests
│   ├── add-income.spec.ts   # Income transaction tests
│   ├── assets/              # Asset management tests
│   ├── budget/              # Budget management tests
│   ├── categories/          # Category CRUD tests
│   └── stats-verification/  # Cross-page data consistency
├── pages/                   # Page Object Models
│   ├── BasePage.ts          # Base class with utilities
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── ... (other page objects)
└── helpers/                 # Test utilities
    ├── api-helpers.ts       # API interaction helpers
    ├── test-data.ts         # Test data generators
    └── assertions.ts        # Custom assertions
```

### Test Credentials

E2E tests use the demo user from the seed data:

- **Email:** `demo@example.com`
- **Password:** `demo123456789`

### Writing New Tests

Tests use custom fixtures that provide pre-initialized page objects:

```typescript
import { test, expect } from './test.fixture';

test('example test', async ({ dashboardPage, transactionsPage }) => {
  await dashboardPage.goto();
  const total = await dashboardPage.getTotalExpenses();
  expect(total).toBeGreaterThan(0);
});
```

### CI/CD

E2E tests run automatically on:

- Pull requests to main branch
- Pushes to main branch
- Manual workflow dispatch

See `.github/workflows/e2e-tests.yml` for the full CI configuration.

## Deployment

The application supports deployment to multiple platforms without vendor lock-in. Local development uses SQLite, while production deployments use Supabase PostgreSQL.

### Supported Platforms

| Platform   | Use Case                  | Adapter               |
| ---------- | ------------------------- | --------------------- |
| Node       | Traditional hosting (VPS) | `@astrojs/node`       |
| Cloudflare | Workers/Pages (Edge)      | `@astrojs/cloudflare` |
| Vercel     | Serverless                | `@astrojs/vercel`     |
| Netlify    | Functions                 | `@astrojs/netlify`    |

### Prerequisites

Before deploying to any platform, you need:

1. **Supabase Project** with PostgreSQL database
2. **Database URL** (use the pooler connection string for serverless platforms)
3. **Platform adapter** installed: `bun add -d @astrojs/[platform]`

### Environment Variables

All platforms require these environment variables:

```bash
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
NODE_ENV=production
PUBLIC_URL=https://your-app.example.com
SIGNUP_MODE=invite_only
```

**Important:** For serverless platforms (Cloudflare, Vercel, Netlify), always use the Supabase **pooler URL** (port 6543), not the direct connection.
`SIGNUP_MODE=invite_only` enforces invitation-only registration. Set `SIGNUP_MODE=public` when you're ready to open public signup.

### Supabase PostgreSQL Setup

When using Supabase as your production database:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Get the connection string** from Settings → Database → Connection string → URI
   - Use the **Transaction pooler** connection (port 6543) for serverless deployments
   - Use the **Session pooler** connection for long-running servers

3. **Create `.env.production`** with your database URL:

   ```bash
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

4. **Push the schema** to your production database:

   ```bash
   bun run db:push
   ```

5. **Use production CLI commands** to manage data:

   ```bash
   # Create workspace in production
   bun run cli:create-workspace:prod -- --name "My Family"

   # List production workspaces
   bun run cli:list-workspaces:prod

   # Empty production database (use with caution!)
   bun run db:empty:prod
   ```

**Note:** The codebase uses `import.meta.env` (not `process.env`) for Bun compatibility. The `:prod` script variants automatically load `.env.production` using `--env-file`.

### Platform-Specific Deployment

#### 1. Node (Traditional Hosting)

Deploy to any VPS or cloud provider that supports Node.js.

```bash
# Install adapter
bun add -d @astrojs/node

# Build for Node
bun run build:node

# Start server
node dist/server/entry.mjs
```

**Production server:**

```bash
# Using PM2 or similar process manager
pm2 start dist/server/entry.mjs --name allowealth
```

#### 2. Cloudflare Workers/Pages

Deploy to Cloudflare's edge network.

```bash
# Install adapter and Wrangler CLI
bun add -d @astrojs/cloudflare
bun add -d wrangler

# Copy and configure wrangler.toml
cp wrangler.toml.example wrangler.toml
# Edit wrangler.toml: set your D1 database_id or Hyperdrive id

# Set database URL secret
wrangler secret put DATABASE_URL

# Build and deploy
bun run deploy:cloudflare
```

**Configuration:** `wrangler.toml` is gitignored and must be created locally from `wrangler.toml.example`. This keeps your Cloudflare resource IDs out of version control. The example file contains placeholder values — replace `YOUR_D1_DATABASE_ID` / `YOUR_HYPERDRIVE_ID` with IDs from your Cloudflare account.

#### 3. Vercel

Deploy to Vercel's serverless platform.

```bash
# Install adapter and Vercel CLI
bun add -d @astrojs/vercel
npm install -g vercel

# Add environment variables in Vercel dashboard
# or via CLI: vercel env add DATABASE_URL

# Build and deploy
bun run deploy:vercel
```

**Configuration:** `vercel.json` is already included in the project.

#### 4. Netlify

Deploy to Netlify Functions.

```bash
# Install adapter and Netlify CLI
bun add -d @astrojs/netlify
npm install -g netlify-cli

# Add environment variables in Netlify dashboard
# or via CLI: netlify env:set DATABASE_URL "postgresql://..."

# Build and deploy
bun run deploy:netlify
```

**Configuration:** `netlify.toml` is already included in the project.

### First Deployment Checklist

After deploying to your chosen platform, complete these steps:

```bash
# 1. Create .env.production with your Supabase DATABASE_URL
echo 'DATABASE_URL=postgresql://...' > .env.production

# 2. Run database migrations
bun --env-file=.env.production run db:push

# 3. Create workspace and admin user
bun run cli:create-workspace:prod -- \
  --name "My Family" \
  --currency IDR \
  --week-start monday

# 4. Follow the CLI output to get admin credentials

# 5. Log in and start using the application
```

**Important Notes:**

- The seeder is **disabled in production** by default (safe by default)
- Use the CLI to create your first workspace and admin user
- Invite additional family members through the application after logging in
- Never commit `.env` files with production credentials

### Testing Production Database Locally

You can test with the production database locally:

```bash
DATABASE_URL="postgresql://..." bun run dev
```

This is useful for debugging production-specific issues without deploying.
