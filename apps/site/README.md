# Allowealth Marketing Site

Static marketing site for Allowealth, built with Astro and deployed to Cloudflare Pages.

**Live URL:** https://allowealth.io

## Overview

This is the public-facing marketing site for the Allowealth financial application. It serves as the landing page and provides information about the product, features, privacy policy, and terms of service.

> **Note:** This is a separate deployment surface from the main Allowealth application. The app itself is deployed to Cloudflare Workers, while this site is deployed to Cloudflare Pages.

## Tech Stack

- **Framework:** [Astro](https://astro.build/) 5.x (static output)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Icons:** Lucide Astro
- **Animations:** Motion
- **Deployment:** Cloudflare Pages

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Open http://localhost:4321
```

## Available Scripts

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `bun run dev`     | Start development server                  |
| `bun run build`   | Build for production (outputs to `dist/`) |
| `bun run preview` | Preview production build locally          |

## Project Structure

```
src/
├── components/          # Reusable Astro components
│   ├── atoms/           # Basic UI elements (Button, Container, etc.)
│   ├── molecules/       # Composite components (HeroSection, FeaturesGrid, etc.)
│   └── organisms/       # Complex page sections
├── layouts/             # Page layout templates
│   ├── BaseLayout.astro    # Base HTML structure
│   └── PublicLayout.astro  # Marketing page wrapper with nav/footer
├── lib/                 # Utility functions
├── pages/               # File-based routes
│   ├── index.astro      # Landing page
│   ├── privacy.astro    # Privacy policy
│   └── terms.astro      # Terms of service
├── styles/              # Global CSS styles
└── env.d.ts             # TypeScript declarations

public/                  # Static assets (favicon, images, etc.)
```

## Deployment

### Automatic Deployment (Recommended)

The site deploys automatically via GitHub Actions when changes are pushed to the `main` branch:

- Workflow: `.github/workflows/deploy-site.yml`
- Trigger: Pushes to `main` that modify `apps/site/**`

### Manual Deployment

```bash
# Build the site
bun run build

# Deploy to Cloudflare Pages
bunx wrangler pages deploy
```

### First-Time Cloudflare Pages Setup

1. **Create a new Pages project** in the Cloudflare Dashboard:
   - Name: `allowealth-site`
   - Production branch: `main`

2. **Configure build settings**:
   - Framework preset: None (or Astro)
   - Build command: `bun run build`
   - Build output directory: `dist`
   - Root directory: `apps/site`

3. **Set environment variables** (Settings > Environment variables):

   ```
   PUBLIC_APP_URL=https://demo.allowealth.io
   ```

   Replace with the URL of your deployed Allowealth app worker.

4. **Add custom domain**:
   - Go to Pages project > Custom domains
   - Add `allowealth.io`
   - Follow Cloudflare's DNS configuration instructions

## Environment Variables

| Variable         | Required | Description                                        |
| ---------------- | -------- | -------------------------------------------------- |
| `PUBLIC_APP_URL` | Yes      | URL of the Allowealth app (for login/signup links) |

## Design System

This site shares the same design tokens as the main Allowealth application:

- **Primary color:** Emerald green (consistent with financial/growth theme)
- **Typography:** System font stack
- **Spacing:** Tailwind's default scale
- **Components:** DaisyUI component classes

## Development Guidelines

### Adding a New Page

1. Create a new `.astro` file in `src/pages/`
2. Use `PublicLayout` as the base layout
3. Add the page to the navigation if needed

### Component Structure

Follow the atomic design methodology:

- **Atoms:** Basic HTML elements (buttons, inputs, labels)
- **Molecules:** Simple component groups (search box, form field)
- **Organisms:** Complex sections (header, footer, feature grid)

### Styling Conventions

- Use Tailwind utility classes
- Prefer DaisyUI semantic colors (`bg-primary`, `text-base-content`)
- Avoid arbitrary values; extend theme if needed

## Related Projects

- **Main Application:** `../..` (root of the repository)
- **Documentation Site:** `../docs/`

## License

Same as the main Allowealth project.
