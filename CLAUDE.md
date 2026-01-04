# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal and family financial application for expense tracking, budgeting, asset management, and financial forecasting.

ALWAYS read the specs/\*.md to understand the context and requiremetns.
if requirement changes always update the spec.

## Tech Stack

| Component  | Technology                                |
| ---------- | ----------------------------------------- |
| Runtime    | Bun 1.x                                   |
| Framework  | Astro 5.x                                 |
| Styling    | Tailwind CSS v4 + DaisyUI v5              |
| Components | Astro (server-side)                       |
| Storybook  | 8.x (HTML framework)                      |
| Database   | Drizzle ORM + SQLite (dev) / MySQL (prod) |
| Auth       | Lucia Auth                                |
| Testing    | Bun test                                  |

## Issue Tracking

This project uses **beads** (`bd`) for issue tracking. Key commands:

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd create --title="..."  # Create new issue
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git remote
```

## Pre-Commit Quality Gates

**Before committing ANY code**, always run:

```bash
bun run lint          # ESLint
bun run format:fix    # Prettier
```

## Development Workflow

1. Run `bd ready` to find available work
2. Create feature branch: `git checkout -b feature/<name>`
3. Make changes
4. Run quality gates: `bun run lint && bun run format:fix`
5. Commit and push
6. Create PR for review
7. After merge, close the issue with `bd close <id>`

## Session Completion Protocol

When ending a work session, complete ALL steps - work is NOT done until pushed:

1. File issues for remaining work (`bd create`)
2. Run quality gates if code changed:
   ```bash
   bun run lint
   bun run format:fix
   ```
3. Update issue status (`bd close` for finished, update in-progress)
4. Push to remote:
   ```bash
   git pull --rebase
   bd sync
   git push
   ```
5. Verify `git status` shows "up to date with origin"

## Project Structure

```
src/
├── components/
│   ├── atoms/           # Atomic UI elements (Button, Input, Label, Badge, etc.)
│   ├── molecules/        # Compound components (Modal, Toast, etc.)
│   ├── layouts/          # Layout components (Header, Footer, Navigation)
│   └── organisms/        # Complex compositions
├── layouts/
│   ├── BaseLayout.astro  # HTML shell (<!doctype html>)
│   └── MainLayout.astro  # App layout with sidebar + drawer
├── pages/                # File-based routing
├── lib/                  # Utilities and helpers
└── styles/               # Global styles and design tokens
```

## Design Tokens

Import from `@/lib/tokens` for consistent styling:

```typescript
import { formatCurrency, formatPercentage, colors, getBudgetStatusClass } from '@/lib/tokens';
```

## Component Guidelines

- Use `.astro` files for all components
- Follow atomic design pattern (atoms → molecules → organisms)
- All atomic components must have Storybook stories (`.stories.ts`)
- Use DaisyUI classes for styling
- Import design tokens, don't hardcode values

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

**Phase 0: Design System & Setup** (in progress)

- ✅ Project initialization
- ✅ Design tokens system
- ✅ 12 Atomic components with Storybook
- ✅ Layout components (MainLayout, Navigation, Header, Footer, Modal, Toast)
- ✅ Routing with 16 page stubs
- 🚧 Login screen (next)
- 📋 Database schema (pending)
- 📋 API endpoints (pending)
