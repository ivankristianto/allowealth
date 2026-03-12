# Allowealth Documentation Site

Documentation site for Allowealth, built with Astro + Starlight and deployed to Cloudflare Pages.

**Live URL:** https://docs.allowealth.io

## Overview

This is the user and developer documentation for the Allowealth financial application. It provides guides for end users, administrators, and developers working with the platform.

> **Note:** This is a separate deployment surface from the main Allowealth application. The app itself is deployed to Cloudflare Workers, while this documentation is deployed to Cloudflare Pages.

## Tech Stack

- **Framework:** [Astro](https://astro.build/) 5.x (static output)
- **Documentation Theme:** [Starlight](https://starlight.astro.build/)
- **Sitemap:** @astrojs/sitemap
- **Deployment:** Cloudflare Pages
- **Image Hosting:** Cloudflare R2

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
├── content/
│   └── docs/              # Documentation content (Markdown/MDX)
│       ├── index.md               # Homepage
│       ├── getting-started.md     # Quick start guide
│       ├── core-concepts.md       # Core concepts overview
│       ├── changelog.md           # Version changelog
│       ├── end-users/             # End user guides
│       │   ├── onboarding.md
│       │   ├── daily-workflow.md
│       │   ├── dashboard.md
│       │   ├── transactions.md
│       │   ├── budgets.md
│       │   ├── accounts.md
│       │   ├── reports.md
│       │   ├── forecast.md
│       │   ├── calculators.md
│       │   ├── settings.md
│       │   └── profile-security.md
│       ├── admins/                # Admin guides
│       │   ├── onboarding.md
│       │   └── deployment-guide.md
│       ├── developers/            # Developer guides
│       │   ├── setup-and-deployment.md
│       │   └── feature-workflow.md
│       └── reference/             # Reference documentation
│           ├── commands.md
│           ├── cli.md
│           ├── api-overview.md
│           └── architecture.md
└── styles/
    └── brand.css            # Custom brand styling

public/                      # Static assets (favicon.svg)
astro.config.mjs             # Astro + Starlight configuration
wrangler.toml                # Cloudflare Pages configuration
```

## Content Organization

The documentation is organized by audience:

| Section        | Audience                 | Purpose                               |
| -------------- | ------------------------ | ------------------------------------- |
| **End Users**  | Application users        | Daily workflows, feature guides, tips |
| **Admins**     | Workspace administrators | Deployment, setup, configuration      |
| **Developers** | Contributors             | Local setup, development workflow     |
| **Reference**  | All audiences            | Commands, API routes, architecture    |

## Writing Documentation

### Adding a New Page

1. Create a new `.md` or `.mdx` file in the appropriate `src/content/docs/` subdirectory
2. Add frontmatter at the top:

```markdown
---
title: Page Title
description: Brief description for SEO.
sidebar:
  label: Sidebar Label
  order: 3
---

# Page Title

Your content here...
```

3. If the page should appear in the sidebar, update `astro.config.mjs`

### Frontmatter Fields

| Field         | Required | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `title`       | Yes      | Page title (appears in browser tab and SEO)  |
| `description` | No       | Meta description for search engines          |
| `sidebar`     | No       | Configure sidebar label and sort order       |
| `draft`       | No       | Set to `true` to hide from production builds |

### Using Starlight Components

Starlight provides built-in components for richer documentation:

```mdx
import { Card, CardGrid, Tabs, TabItem, Steps } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Quick Start" icon="rocket">
    Get up and running in 5 minutes.
  </Card>
  <Card title="Reference" icon="document">
    Detailed API documentation.
  </Card>
</CardGrid>
```

See [Starlight Components](https://starlight.astro.build/components/using-components/) for full documentation.

## Screenshots and Images

### Image Hosting Policy

All screenshots and images **must** be hosted on Cloudflare R2 to prevent repository bloat.

**R2 Bucket:** `allowealth-docs-screenshots`

**Base URL:** `https://images.allowealth.io/`

### Uploading Images

```bash
# Upload an image to R2
bunx wrangler r2 object put "allowealth-docs-screenshots/filename.png" \
  --file "./local-image.png" \
  --remote

# Delete the local file after upload
rm ./local-image.png
```

### Referencing Images

```markdown
![Dashboard screenshot](https://images.allowealth.io/dashboard-overview.png)
```

**Important:** Never commit screenshots to git. Always upload to R2 and reference remotely.

## Deployment

### Automatic Deployment (Recommended)

The documentation deploys automatically via GitHub Actions:

- Workflow: `.github/workflows/deploy-docs-site.yml`
- Trigger: Pushes to `main` that modify `apps/docs/**`

### Manual Deployment

```bash
# Build the site
bun run build

# Deploy to Cloudflare Pages
bunx wrangler pages deploy
```

### First-Time Cloudflare Pages Setup

1. **Create a new Pages project** in the Cloudflare Dashboard:
   - Name: `allowealth-docs`
   - Production branch: `main`

2. **Configure build settings**:
   - Build command: `bun run build`
   - Build output directory: `dist`
   - Root directory: `apps/docs`

3. **Add custom domain**:
   - Add `docs.allowealth.io` as a custom domain
   - Configure DNS to point to Cloudflare Pages

4. **Create R2 bucket for images**:
   ```bash
   wrangler r2 bucket create allowealth-docs-screenshots
   ```

## Customization

### Brand Styles

Custom CSS overrides are in `src/styles/brand.css`:

```css
/* Example: Custom accent color */
:root {
  --sl-color-accent: #10b981;
  --sl-color-accent-high: #34d399;
}
```

### Sidebar Configuration

The sidebar is configured in `astro.config.mjs`:

```javascript
sidebar: [
  { slug: 'getting-started' },
  {
    label: 'Guides: End Users',
    items: [
      { slug: 'end-users/onboarding' },
      { slug: 'end-users/daily-workflow' },
    ],
  },
  // Autogenerated from directory
  {
    label: 'Reference',
    autogenerate: { directory: 'reference' },
  },
],
```

## Writing Guidelines

1. **Audience-first**: Tailor content to the specific audience (user, admin, or developer)
2. **Action-oriented**: Use imperative mood ("Click", "Run", "Configure")
3. **Copy-paste ready**: Include complete, runnable code examples
4. **Screenshots**: Use sparingly; update when UI changes
5. **Cross-link**: Link to related pages using relative paths (`../other-page/`)

## Related Projects

- **Main Application:** `../..` (root of the repository)
- **Marketing Site:** `../site/`

## Resources

- [Starlight Documentation](https://starlight.astro.build/)
- [Astro Documentation](https://docs.astro.build/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)

## License

Same as the main Allowealth project.
