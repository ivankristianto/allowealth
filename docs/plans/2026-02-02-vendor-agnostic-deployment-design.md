# Vendor-Agnostic Deployment Design

**Date:** 2026-02-02
**Status:** Draft

## Overview

Enable deployment to multiple platforms (Cloudflare Workers, Vercel, Netlify) without vendor lock-in. Keep SQLite for local development, use Supabase PostgreSQL for production.

## Goals

1. Single codebase deploys to any platform
2. No vendor-specific code in application logic
3. SQLite for simple local development
4. Supabase PostgreSQL for production (via pooler)
5. Seeder disabled in production; workspace setup via CLI

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Astro Application                     │
│  (middleware, pages, API routes, services, DB layer)    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Deployment Adapter Layer                    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│  │ Cloudflare│ │  Vercel   │ │  Netlify  │ │  Node   │ │
│  │  adapter  │ │  adapter  │ │  adapter  │ │ adapter │ │
│  └───────────┘ └───────────┘ └───────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   PostgreSQL / Supabase                  │
│              (same DB regardless of platform)            │
└─────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Dynamic Adapter Configuration

Modify `astro.config.ts` to select adapter based on `DEPLOY_TARGET` environment variable.

**Supported targets:**

| Target       | Adapter               | Use Case                                 |
| ------------ | --------------------- | ---------------------------------------- |
| `node`       | `@astrojs/node`       | Local dev, traditional hosting (default) |
| `cloudflare` | `@astrojs/cloudflare` | Cloudflare Workers/Pages                 |
| `vercel`     | `@astrojs/vercel`     | Vercel serverless                        |
| `netlify`    | `@astrojs/netlify`    | Netlify Functions                        |

**Configuration approach:**

```typescript
// astro.config.ts
const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'node';

const adapters = {
  node: () => import('@astrojs/node').then((m) => m.default({ mode: 'standalone' })),
  cloudflare: () => import('@astrojs/cloudflare').then((m) => m.default({})),
  vercel: () => import('@astrojs/vercel').then((m) => m.default({})),
  netlify: () => import('@astrojs/netlify').then((m) => m.default({})),
};

const adapter = await adapters[DEPLOY_TARGET]();
```

### 2. Seeder Protection

Add guard to `src/db/seed.ts` to prevent accidental seeding in production:

```typescript
const isProduction = process.env.NODE_ENV === 'production';
const allowSeed = process.env.ALLOW_SEED === 'true';

if (isProduction && !allowSeed) {
  console.error('❌ Seeding is disabled in production.');
  console.error('   Set ALLOW_SEED=true to override (use with caution).');
  process.exit(1);
}
```

### 3. Production Initialization Flow (Invite-Only)

No pre-seeded users. Admin creates workspace via CLI, then invites users.

**Flow:**

1. Deploy app to platform
2. Run migrations: `DATABASE_URL=... bun run db:push`
3. Create workspace + admin: `DATABASE_URL=... bun run cli:create-workspace`
4. Admin logs in → invites family members

**Enhance `cli:create-workspace` to:**

- Create workspace
- Prompt for admin email/password
- Create admin user
- Create default categories and asset categories
- Output login URL

### 4. Supabase Integration

Database-only usage. No Supabase Auth, Storage, or Realtime.

**Required environment variable:**

```bash
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**Important:** Use the **pooler URL** (not direct connection) for serverless platforms.

**Test locally:**

```bash
DATABASE_URL="postgresql://..." bun run dev
```

### 5. Platform Configuration Files

#### Cloudflare Workers (`wrangler.toml`)

```toml
name = "expenses"
main = "dist/_worker.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_ENV = "production"

# Secrets (set via CLI):
# wrangler secret put DATABASE_URL
```

#### Vercel (`vercel.json`)

```json
{
  "buildCommand": "DEPLOY_TARGET=vercel bun run build",
  "framework": null
}
```

#### Netlify (`netlify.toml`)

```toml
[build]
  command = "DEPLOY_TARGET=netlify bun run build"
  publish = "dist"

[build.environment]
  NODE_ENV = "production"
```

### 6. Package.json Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "build:node": "DEPLOY_TARGET=node astro build",
    "build:cloudflare": "DEPLOY_TARGET=cloudflare astro build",
    "build:vercel": "DEPLOY_TARGET=vercel astro build",
    "build:netlify": "DEPLOY_TARGET=netlify astro build",

    "deploy:cloudflare": "bun run build:cloudflare && wrangler deploy",
    "deploy:vercel": "bun run build:vercel && vercel deploy --prod",
    "deploy:netlify": "bun run build:netlify && netlify deploy --prod",

    "db:push": "drizzle-kit push",
    "db:seed": "bun run src/db/seed.ts",
    "cli:create-workspace": "bun run src/cli/create-workspace.ts"
  }
}
```

## Environment Variables

### Local Development

```bash
# .env
DATABASE_URL=db/.dev.db
NODE_ENV=development
```

### Production (set in platform dashboard)

```bash
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres
NODE_ENV=production
```

## Files to Create/Modify

| File                          | Action | Purpose                   |
| ----------------------------- | ------ | ------------------------- |
| `astro.config.ts`             | Modify | Dynamic adapter selection |
| `wrangler.toml`               | Create | Cloudflare config         |
| `vercel.json`                 | Create | Vercel config             |
| `netlify.toml`                | Create | Netlify config            |
| `src/db/seed.ts`              | Modify | Add production guard      |
| `src/cli/create-workspace.ts` | Modify | Create admin + defaults   |
| `package.json`                | Modify | Add deployment scripts    |

## First Deployment Checklist

1. [ ] Set up Supabase project, get pooler DATABASE_URL
2. [ ] Add DATABASE_URL to platform secrets
3. [ ] Install platform adapter: `bun add -d @astrojs/cloudflare` (or vercel/netlify)
4. [ ] Deploy: `bun run deploy:cloudflare`
5. [ ] Run migrations: `DATABASE_URL=... bun run db:push`
6. [ ] Create workspace: `DATABASE_URL=... bun run cli:create-workspace`
7. [ ] Log in and invite family members

## Design Decisions

| Decision           | Choice                                | Rationale                                |
| ------------------ | ------------------------------------- | ---------------------------------------- |
| Adapter strategy   | Dynamic single config                 | Less files to maintain                   |
| Database           | SQLite (dev) + Supabase pooler (prod) | Simplicity + vendor agnostic             |
| Seeder protection  | `NODE_ENV` check                      | Safe by default                          |
| User onboarding    | Invite-only via CLI                   | Secure for family app                    |
| Deployment configs | Platform-specific files               | Standard approach, easy to switch        |
| Supabase features  | Database only                         | No lock-in to Supabase-specific features |
