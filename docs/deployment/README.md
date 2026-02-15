# Deployment Guides

Allowealth supports deployment to multiple platforms. Each guide covers prerequisites, step-by-step setup, CI/CD, and troubleshooting.

| Platform               | Guide                            | Status               |
| ---------------------- | -------------------------------- | -------------------- |
| **Cloudflare Workers** | [cloudflare.md](./cloudflare.md) | Primary (production) |
| Vercel                 | Coming soon                      | Supported            |
| Netlify                | Coming soon                      | Supported            |
| Node.js (VPS)          | Coming soon                      | Supported            |

## Quick Reference

```bash
# Cloudflare (Hyperdrive + PostgreSQL)
bun run deploy:cloudflare

# Cloudflare (D1)
bun run deploy:cloudflare:d1

# Vercel
bun run deploy:vercel

# Netlify
bun run deploy:netlify
```

## Architecture

The application uses a vendor-agnostic deployment architecture. The `DEPLOY_TARGET` environment variable selects the Astro adapter at build time:

```
DEPLOY_TARGET=cloudflare  →  @astrojs/cloudflare  (Workers)
DEPLOY_TARGET=vercel      →  @astrojs/vercel       (Serverless)
DEPLOY_TARGET=netlify     →  @astrojs/netlify       (Functions)
DEPLOY_TARGET=node        →  @astrojs/node          (Standalone)
```

See [astro.config.ts](../../astro.config.ts) for adapter selection logic.
