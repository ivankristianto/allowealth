# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd prime` to refresh context after compaction.

## Project Overview

Personal and family financial application for expense tracking, budgeting, asset management, and financial forecasting.

Agents must internalize:

- **Implementation order**: UI → Service → API → CLI → Seeder
- **Quality gates**: Which block, which don't
- **Refactor checklist**: Apply each loop, not at the end

**If constitution conflicts with task instructions, constitution wins.**

## Issue Tracking

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git remote
bd stats              # Project health overview
```

## Tech Stack

- **Runtime:** Bun 1.x
- **Framework:** Astro 5.x (file-based routing)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Components:** Astro components (server-side)
- **Storybook:** 8.x with HTML framework
- **Database:** Drizzle ORM + SQLite (dev) / MySQL (prod)
- **Auth:** Lucia Auth

## Routes

```
/                          # Dashboard
/transactions              # Transaction list
/transactions/add          # Add transaction
/budget                    # Budget overview
/budget/history            # Budget history
/assets                    # Asset list
/assets/add                # Add asset
/assets/history            # Asset history
/reports                   # Monthly reports
/reports/yearly            # Yearly reports
/reports/custom            # Custom date range
/forecast                  # Forecast calculator
/forecast/comparison       # Scenario comparison
/calculators               # Compound interest calculator
/settings                  # Profile settings
/settings/categories       # Category management
/settings/payment-methods  # Payment methods
```

## Current Status

**Phase 0: Design System & Setup** ✅ Complete

- ✅ Project initialization
- ✅ Design tokens system
- ✅ 12 Atomic components with Storybook
- ✅ Layout components (MainLayout, Navigation, Header, Footer, Modal, Toast)
- ✅ Routing with 16 page stubs
- ✅ Login screen UI (LoginForm, PasswordField, Checkbox, AuthLayout)
- ✅ Database schema (Drizzle ORM)

**Phase 1: Authentication & API** (in progress)

- 🚧 Authentication backend (Lucia Auth, API endpoints, session middleware)
- 📋 API endpoints implementation
- 📋 OpenAPI specification

## Project Structure

```
src/
├── components/
│   ├── atoms/           # Atomic UI elements (Button, Input, etc.)
│   ├── molecules/        # Compound components (Modal, Toast)
│   ├── layouts/          # Layout components (Header, Footer, Nav)
│   └── organisms/        # Complex compositions
├── layouts/
│   ├── BaseLayout.astro  # HTML shell
│   └── MainLayout.astro  # App layout with sidebar
├── pages/                # File-based routing
│   ├── index.astro       # Dashboard (/)
│   ├── transactions/
│   ├── budget/
│   ├── assets/
│   ├── reports/
│   ├── forecast/
│   ├── calculators/
│   └── settings/
├── lib/
│   └── tokens.ts         # Design tokens & helpers
└── styles/
    ├── globals.css       # Global styles
    └── tokens.css        # CSS custom properties

openapi.yml               # OpenAPI specification for all API endpoints
```

## API Documentation

The project uses **OpenAPI 3.1.0** for API documentation.

- **Specification file:** `openapi.yml`
- **Purpose:** Document all API endpoints, request/response schemas, and authentication

**IMPORTANT:** Whenever you modify or add API endpoints, you MUST update `openapi.yml` to reflect the changes. This ensures the API documentation stays in sync with the implementation.

## Component Guidelines

### Use Astro Components For:

- All UI components (atoms, molecules, organisms)
- Pages and layouts
- Server-rendered content

### Storybook Stories:

- All atomic components must have stories
- Use `.stories.ts` files (TypeScript)
- Render functions create DOM elements directly
- Test all variants and states

## Design Tokens

Always import and use design tokens from `@/lib/tokens`:

```typescript
import { formatCurrency, colors, fontSizes } from '@/lib/tokens';
```

## Pre-Commit Quality Gates

**Before committing ANY code**, you MUST run:

```bash
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"
bun run typecheck     # TypeScript type checking
bun run lint          # ESLint check
bun run format:fix    # Prettier auto-format
```

**CRITICAL:** If `bun:` imports are found in files that are imported by middleware (src/middleware.ts), the code MUST be refactored. Astro middleware runs in Node.js and cannot load Bun-specific APIs.

## Working on This Project

**ALWAYS FOLLOW THIS WORKFLOW**

1. **Find work:** Run `bd ready` to find unblocked tasks
2. **Claim:** Run `bd update <id> --status in_progress` for each task
3. **Branch:** `git checkout -b feature/<descriptive-name>`
4. **Implement:** For each task:
   - Write code following component guidelines and design tokens
   - Run `bun run typecheck && bun run lint && bun run format:fix`
   - Commit with clear message: `git commit -m "feat: descriptive message"`
   - Push: `git push`
5. **PR:** Create Pull Request following the GitHub PR template
6. **Review:** Invoke **code-review-specialist** agent to review (comments only, no code changes)
7. **Complete:** After merge:
   - Run `bd close <id>` for each completed task
   - Run `bd sync`
8. **Report:** Provide summary with PR link, tasks completed, review status, and any recommendations

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** - `bun run typecheck && bun run lint && bun run format:fix`
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
