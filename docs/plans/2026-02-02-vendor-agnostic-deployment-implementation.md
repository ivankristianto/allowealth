# Vendor-Agnostic Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable deployment to Cloudflare Workers, Vercel, or Netlify without vendor lock-in while keeping SQLite for local development.

**Architecture:** Dynamic adapter selection via `DEPLOY_TARGET` env var. Single `astro.config.ts` imports the correct adapter at build time. Production uses Supabase PostgreSQL (already supported). Seeder blocked in production; workspace setup via enhanced CLI.

**Tech Stack:** Astro 5.x, `@astrojs/cloudflare`, `@astrojs/vercel`, `@astrojs/netlify`, Drizzle ORM, Supabase PostgreSQL

---

## Task 1: Add Seeder Production Guard

**Files:**

- Modify: `src/db/seed.ts:1-50`

**Step 1: Add production guard at the top of seed.ts**

After the imports (line 36), add the production check:

```typescript
// ============================================================================
// PRODUCTION GUARD
// ============================================================================

const isProduction = process.env.NODE_ENV === 'production';
const allowSeed = process.env.ALLOW_SEED === 'true';

if (isProduction && !allowSeed) {
  console.error('❌ Seeding is disabled in production.');
  console.error('   Set ALLOW_SEED=true to override (use with caution).');
  process.exit(1);
}
```

**Step 2: Test the guard works**

Run: `NODE_ENV=production bun run db:seed`

Expected: Script exits with error message "Seeding is disabled in production"

**Step 3: Test override works**

Run: `NODE_ENV=production ALLOW_SEED=true bun run db:seed 2>&1 | head -5`

Expected: Script starts (shows "Starting database seed...")

**Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat(db): add production guard to seeder

Prevents accidental seeding in production. Can be overridden
with ALLOW_SEED=true for staging/demo environments."
```

---

## Task 2: Update astro.config.ts for Dynamic Adapter

**Files:**

- Modify: `astro.config.ts`

**Step 1: Replace the entire astro.config.ts with dynamic adapter logic**

```typescript
import { defineConfig, type AstroIntegration } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// Load .env before config is parsed (Vite normally loads it too late)
const { PORT, DEV_HOST } = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

// DEV_HOST: Set custom hostname (e.g., "k2-expenses.local")
// Falls back to listening on all interfaces if not set
const devHost = DEV_HOST || true;
const port = parseInt(PORT || '4321', 10);

/**
 * Deployment Target Configuration
 *
 * Set DEPLOY_TARGET to switch between platforms:
 * - node (default): Local development and traditional Node.js hosting
 * - cloudflare: Cloudflare Workers/Pages
 * - vercel: Vercel serverless
 * - netlify: Netlify Functions
 */
type DeployTarget = 'node' | 'cloudflare' | 'vercel' | 'netlify';
const DEPLOY_TARGET = (process.env.DEPLOY_TARGET || 'node') as DeployTarget;

/**
 * Get the appropriate adapter based on DEPLOY_TARGET
 */
async function getAdapter(): Promise<AstroIntegration> {
  switch (DEPLOY_TARGET) {
    case 'cloudflare': {
      const cloudflare = await import('@astrojs/cloudflare');
      return cloudflare.default({
        platformProxy: {
          enabled: true,
        },
      });
    }
    case 'vercel': {
      const vercel = await import('@astrojs/vercel');
      return vercel.default({});
    }
    case 'netlify': {
      const netlify = await import('@astrojs/netlify');
      return netlify.default({});
    }
    case 'node':
    default: {
      const node = await import('@astrojs/node');
      return node.default({ mode: 'standalone' });
    }
  }
}

const adapter = await getAdapter();

console.log(`[astro.config] Using adapter: ${DEPLOY_TARGET}`);

export default defineConfig({
  server: {
    host: devHost,
    port: port,
  },
  output: 'server',
  adapter,
  vite: {
    plugins: [
      tailwindcss(),
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      visualizer({
        filename: 'dist/stats.json',
        gzipSize: true,
        brotliSize: true,
        json: true,
      }),
    ],
    server: {
      allowedHosts: ['.local'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            chartjs: ['chart.js'],
            motion: ['motion'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
      },
    },
  },
});
```

**Step 2: Test default (node) adapter works**

Run: `bun run build 2>&1 | grep "Using adapter"`

Expected: Output includes `[astro.config] Using adapter: node`

**Step 3: Test build completes successfully**

Run: `bun run build`

Expected: Build completes without errors

**Step 4: Commit**

```bash
git add astro.config.ts
git commit -m "feat(config): add dynamic adapter selection

Supports DEPLOY_TARGET env var to switch between:
- node (default): Local dev and Node.js hosting
- cloudflare: Cloudflare Workers/Pages
- vercel: Vercel serverless
- netlify: Netlify Functions"
```

---

## Task 3: Add Deployment Scripts to package.json

**Files:**

- Modify: `package.json`

**Step 1: Add deployment scripts after the existing build scripts**

Add these scripts after `"build:analyze"`:

```json
"build:node": "DEPLOY_TARGET=node astro build",
"build:cloudflare": "DEPLOY_TARGET=cloudflare astro build",
"build:vercel": "DEPLOY_TARGET=vercel astro build",
"build:netlify": "DEPLOY_TARGET=netlify astro build",
"deploy:cloudflare": "bun run build:cloudflare && wrangler deploy",
"deploy:vercel": "bun run build:vercel && vercel deploy --prod",
"deploy:netlify": "bun run build:netlify && netlify deploy --prod",
```

**Step 2: Verify scripts are valid JSON**

Run: `cat package.json | head -20`

Expected: Valid JSON structure with new scripts

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat(scripts): add deployment scripts for all platforms

Adds build and deploy scripts for:
- build:node, build:cloudflare, build:vercel, build:netlify
- deploy:cloudflare, deploy:vercel, deploy:netlify"
```

---

## Task 4: Create Cloudflare Configuration

**Files:**

- Create: `wrangler.toml`

**Step 1: Create wrangler.toml**

```toml
# Cloudflare Workers Configuration
# https://developers.cloudflare.com/workers/wrangler/configuration/

name = "expenses"
main = "dist/_worker.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Environment variables (non-secret)
[vars]
NODE_ENV = "production"

# Secrets (set via CLI, not committed):
# wrangler secret put DATABASE_URL
#
# To deploy:
# 1. bun add -d @astrojs/cloudflare wrangler
# 2. wrangler login
# 3. wrangler secret put DATABASE_URL
# 4. bun run deploy:cloudflare
```

**Step 2: Verify file was created**

Run: `cat wrangler.toml`

Expected: Shows the TOML configuration

**Step 3: Commit**

```bash
git add wrangler.toml
git commit -m "feat(deploy): add Cloudflare Workers configuration

Configures wrangler for deployment with:
- nodejs_compat flag for Node.js API support
- Environment variables for production
- Instructions for setting DATABASE_URL secret"
```

---

## Task 5: Create Vercel Configuration

**Files:**

- Create: `vercel.json`

**Step 1: Create vercel.json**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "DEPLOY_TARGET=vercel bun run build",
  "framework": null,
  "installCommand": "bun install"
}
```

**Step 2: Verify file was created**

Run: `cat vercel.json`

Expected: Shows the JSON configuration

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat(deploy): add Vercel configuration

Configures Vercel deployment with:
- Custom build command using DEPLOY_TARGET
- Bun as package manager"
```

---

## Task 6: Create Netlify Configuration

**Files:**

- Create: `netlify.toml`

**Step 1: Create netlify.toml**

```toml
# Netlify Configuration
# https://docs.netlify.com/configure-builds/file-based-configuration/

[build]
  command = "DEPLOY_TARGET=netlify bun run build"
  publish = "dist"

[build.environment]
  NODE_ENV = "production"

# To deploy:
# 1. bun add -d @astrojs/netlify
# 2. Set DATABASE_URL in Netlify dashboard
# 3. Connect repo or run: netlify deploy --prod
```

**Step 2: Verify file was created**

Run: `cat netlify.toml`

Expected: Shows the TOML configuration

**Step 3: Commit**

```bash
git add netlify.toml
git commit -m "feat(deploy): add Netlify configuration

Configures Netlify deployment with:
- Custom build command using DEPLOY_TARGET
- Production environment variables
- Instructions for DATABASE_URL setup"
```

---

## Task 7: Enhance CLI to Create Admin User

**Files:**

- Modify: `src/cli/create-workspace.ts`

**Step 1: Replace create-workspace.ts with enhanced version**

```typescript
/**
 * CLI Script: Create Workspace with Admin User
 *
 * Creates a new workspace with an admin user and default categories.
 * This is the primary setup command for production deployments.
 *
 * Usage: bun run cli:create-workspace -- --name "Workspace Name" --email admin@example.com
 */

/* eslint-disable no-console -- Console output is intentional for CLI */

import { db } from '@/db';
import { WorkspaceService } from '@/services/workspace.service';
import { WorkspaceMetaService } from '@/services/workspace-meta.service';
import { AssetCategoryService } from '@/services/asset-category.service';
import { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } from '@/lib/constants/workspace-meta-keys';
import { DEFAULT_ASSET_CATEGORIES } from '@/lib/constants';
import { hashPassword } from '@/lib/auth/password';
import { users } from '@/db/schema';
import { nanoid } from 'nanoid';
import * as readline from 'readline';

interface CreateWorkspaceOptions {
  name: string;
  email?: string;
  password?: string;
  currency?: string;
  weekStart?: string;
  compactNumbers?: boolean;
}

/**
 * Prompt for user input (hidden for passwords)
 */
function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      // For password input, we need to handle it specially
      process.stdout.write(question);
      let password = '';

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        if (char === '\n' || char === '\r') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(password);
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (char === '\u007F') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          password += char;
          process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasLetter || !hasNumberOrSpecial) {
    return {
      valid: false,
      message: 'Password must contain letters and numbers/special characters',
    };
  }
  return { valid: true };
}

/**
 * Parse command line arguments
 */
function parseArgs(): CreateWorkspaceOptions {
  const args = process.argv.slice(2);
  const options: Partial<CreateWorkspaceOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--name':
      case '-n':
        options.name = args[++i];
        break;
      case '--email':
      case '-e':
        options.email = args[++i];
        break;
      case '--password':
      case '-p':
        options.password = args[++i];
        break;
      case '--currency':
      case '-c':
        options.currency = args[++i];
        break;
      case '--week-start':
      case '-w':
        options.weekStart = args[++i];
        break;
      case '--compact-numbers':
        options.compactNumbers = args[++i] === 'true';
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  if (!options.name) {
    console.error('Error: --name is required');
    printHelp();
    process.exit(1);
  }

  return options as CreateWorkspaceOptions;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Usage: bun run cli:create-workspace -- [options]

Options:
  --name, -n <name>           Workspace name (required)
  --email, -e <email>         Admin email (will prompt if not provided)
  --password, -p <password>   Admin password (will prompt if not provided)
  --currency, -c <currency>   Default currency (default: IDR)
  --week-start, -w <day>      Week start day: monday or sunday (default: monday)
  --compact-numbers           Use compact number formatting: true or false (default: true)
  --help, -h                  Show this help message

Examples:
  # Interactive mode (prompts for email/password)
  bun run cli:create-workspace -- --name "My Family"

  # Non-interactive mode
  bun run cli:create-workspace -- --name "My Family" --email admin@example.com --password "SecurePass123!"
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  console.log('');
  console.log('🏢 Create Workspace');
  console.log('==================');
  console.log('');

  // Get admin email
  let email = options.email;
  if (!email) {
    email = await prompt('Admin email: ');
  }
  if (!validateEmail(email)) {
    console.error('Error: Invalid email format');
    process.exit(1);
  }

  // Get admin password
  let password = options.password;
  if (!password) {
    password = await prompt('Admin password: ', true);
    const confirm = await prompt('Confirm password: ', true);
    if (password !== confirm) {
      console.error('Error: Passwords do not match');
      process.exit(1);
    }
  }
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    console.error(`Error: ${passwordValidation.message}`);
    process.exit(1);
  }

  console.log('');
  console.log('Creating workspace...');

  try {
    // Create workspace
    const workspaceService = new WorkspaceService(db);
    const workspace = await workspaceService.create({ name: options.name });

    console.log(`✓ Created workspace: ${workspace.name} (${workspace.id})`);

    // Set workspace meta values
    const metaService = new WorkspaceMetaService(db);

    const currency = options.currency || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.CURRENCY];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.CURRENCY, currency);

    const weekStart = options.weekStart || WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.WEEK_START, weekStart);

    const compactNumbers =
      options.compactNumbers !== undefined
        ? String(options.compactNumbers)
        : WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.COMPACT_NUMBERS];
    await metaService.set(workspace.id, WORKSPACE_META_KEYS.COMPACT_NUMBERS, compactNumbers);

    console.log(`✓ Set workspace settings (currency: ${currency}, weekStart: ${weekStart})`);

    // Create admin user
    const userId = nanoid();
    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
      id: userId,
      workspace_id: workspace.id,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name: 'Admin',
      role: 'admin',
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log(`✓ Created admin user: ${email}`);

    // Create default asset categories
    const assetCategoryService = new AssetCategoryService(db);
    for (const category of DEFAULT_ASSET_CATEGORIES) {
      await assetCategoryService.create({
        workspace_id: workspace.id,
        created_by_user_id: userId,
        name: category.name,
        description: category.description,
        is_liability: category.isLiability,
        is_system: true,
        sort_order: category.sortOrder,
      });
    }

    console.log(`✓ Created ${DEFAULT_ASSET_CATEGORIES.length} default asset categories`);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Workspace created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: (the password you entered)`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Open your app URL in a browser');
    console.log('  2. Log in with the credentials above');
    console.log('  3. Invite family members from Settings');
    console.log('');
  } catch (error) {
    console.error('Failed to create workspace:', error);
    process.exit(1);
  }
}

main();
```

**Step 2: Test the CLI help**

Run: `bun run cli:create-workspace -- --help`

Expected: Shows updated help with --email and --password options

**Step 3: Commit**

```bash
git add src/cli/create-workspace.ts
git commit -m "feat(cli): enhance create-workspace to create admin user

Now creates:
- Workspace with settings
- Admin user with email/password
- Default asset categories

Supports both interactive (prompts for credentials) and
non-interactive mode (--email and --password flags)."
```

---

## Task 8: Add .gitignore Entries for Platform Files

**Files:**

- Modify: `.gitignore`

**Step 1: Check if entries already exist**

Run: `grep -E "\.wrangler|\.vercel|\.netlify" .gitignore || echo "Not found"`

**Step 2: Add platform-specific ignores if not present**

Append to `.gitignore`:

```
# Platform-specific local files
.wrangler/
.vercel/
.netlify/
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore(gitignore): add platform deployment directories

Ignores local cache/config directories for:
- Cloudflare (.wrangler/)
- Vercel (.vercel/)
- Netlify (.netlify/)"
```

---

## Task 9: Update Design Document Status

**Files:**

- Modify: `docs/plans/2026-02-02-vendor-agnostic-deployment-design.md`

**Step 1: Change status from Draft to Implemented**

Change line 4 from:

```markdown
**Status:** Draft
```

To:

```markdown
**Status:** Implemented
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-02-vendor-agnostic-deployment-design.md
git commit -m "docs: mark vendor-agnostic deployment design as implemented"
```

---

## Task 10: Test Full Build (Manual Verification)

**Step 1: Run the default build**

Run: `bun run build`

Expected: Build succeeds with node adapter

**Step 2: Test quality gates pass**

Run: `bun run typecheck && bun run lint && bun run stylelint`

Expected: All checks pass

**Step 3: Verify seeder guard works**

Run: `NODE_ENV=production bun run db:seed 2>&1 | head -3`

Expected: Shows "Seeding is disabled in production" error

---

## Summary

After completing all tasks, you will have:

1. ✅ Seeder blocked in production (with override option)
2. ✅ Dynamic adapter selection via `DEPLOY_TARGET`
3. ✅ Deployment scripts for all platforms
4. ✅ Configuration files: `wrangler.toml`, `vercel.json`, `netlify.toml`
5. ✅ Enhanced CLI that creates admin user with workspace
6. ✅ Platform directories ignored in git

**To deploy to Cloudflare Workers:**

```bash
# One-time setup
bun add -d @astrojs/cloudflare wrangler
wrangler login
wrangler secret put DATABASE_URL

# Deploy
bun run deploy:cloudflare

# Create first workspace
DATABASE_URL="postgresql://..." bun run cli:create-workspace -- --name "My Family"
```
