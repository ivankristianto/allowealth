# Allowealth Marketing Site - Agent Instructions

## Overview

This is the static marketing site for Allowealth, deployed to Cloudflare Pages at `allowealth.io`. It is a completely separate deployment surface from the main application (Cloudflare Workers) and the docs site (`apps/docs`).

## Tech Stack

| Category   | Technology                   |
| ---------- | ---------------------------- |
| Framework  | Astro 6.x (static output)    |
| Styling    | Tailwind CSS v4 + DaisyUI v5 |
| Icons      | @lucide/astro                |
| Animations | motion (client-side)         |
| Deployment | Cloudflare Pages             |

## Project Structure

```
apps/site/
├── src/
│   ├── components/        # Reusable components
│   │   ├── atoms/         # Basic UI elements
│   │   ├── molecules/     # Composite components
│   │   └── organisms/     # Complex sections
│   ├── layouts/           # Page layouts
│   │   ├── BaseLayout.astro      # Base HTML structure
│   │   └── PublicLayout.astro    # Marketing page wrapper
│   ├── lib/               # Utilities
│   ├── pages/             # File-based routes
│   │   ├── index.astro    # Landing page
│   │   ├── privacy.astro  # Privacy policy
│   │   └── terms.astro    # Terms of service
│   └── styles/            # Global styles
├── public/                # Static assets
├── astro.config.mjs       # Astro configuration
├── wrangler.toml          # Cloudflare Pages config
└── package.json           # Dependencies
```

## Key Design Principles

1. **Static Only**: This is a purely static marketing site. No server-side rendering, no API routes, no database access.

2. **Design System Alignment**: Uses the same DaisyUI/Tailwind theme as the main app for visual consistency.

3. **External Links**: All "Sign In" / "Get Started" links point to `PUBLIC_APP_URL` (configured in Cloudflare Pages environment).

4. **Performance**: Keep bundle size minimal. Landing page should load in < 1.5s.

## Environment Variables

Set these in Cloudflare Pages dashboard (Settings > Environment variables):

| Variable         | Purpose                          | Example                         |
| ---------------- | -------------------------------- | ------------------------------- |
| `PUBLIC_APP_URL` | URL of the actual Allowealth app | `https://preview.allowealth.io` |

## Development Commands

```bash
# Install dependencies
bun install

# Start dev server (http://localhost:4321)
bun run dev

# Build for production
bun run build

# Preview production build locally
bun run preview
```

## Deployment to Cloudflare Pages

### Manual Deployment

```bash
# 1. Build the site
bun run build

# 2. Deploy using wrangler
bunx wrangler pages deploy
```

### Automatic Deployment (GitHub Actions)

The site deploys automatically on pushes to `main` that affect `apps/site/**`:

- Workflow: `.github/workflows/deploy-site.yml`
- Trigger: Push to `main` branch with changes in `apps/site/**`

### First-Time Setup (Cloudflare Pages)

1. **Create Pages project** in Cloudflare Dashboard:
   - Project name: `allowealth-site`
   - Production branch: `main`

2. **Configure build settings**:
   - Build command: `bun run build`
   - Build output directory: `dist`
   - Root directory: `apps/site`

3. **Set environment variables**:
   - `PUBLIC_APP_URL`: URL of your deployed app worker

4. **Add custom domain**:
   - Add `allowealth.io` as a custom domain
   - Configure DNS to point to Cloudflare Pages

## Component Patterns

### Adding a New Section

```astro
---
// src/components/molecules/landing/MySection.astro
import Container from '@/components/atoms/Container.astro';
---

<section class="py-20 bg-base-100">
  <Container>
    <h2 class="text-3xl font-bold">Section Title</h2>
    <!-- Content -->
  </Container>
</section>
```

### Using Icons

```astro
---
import { IconName } from '@lucide/astro';
---

<IconName size={24} class="text-primary" />
```

## Testing Checklist

Before deploying changes:

- [ ] Site builds without errors (`bun run build`)
- [ ] All links work correctly
- [ ] Mobile responsiveness verified
- [ ] "Sign In" link points to correct app URL
- [ ] Privacy and Terms pages render correctly

## Related Documentation

- Root README: `../../README.md`
- Main app docs: `../docs/`
- Design system: `../../design-system/`
