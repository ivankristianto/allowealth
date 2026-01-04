# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd prime` to refresh context after compaction.

ALWAYS read the specs/\*.md to understand the context and requiremetns.
if requirement changes always update the spec.

## Quick Reference

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git remote
bd stats              # Project health overview
```

## Pre-Commit Quality Gates

**Before committing ANY code**, you MUST run:

```bash
bun run lint          # ESLint check
bun run format:fix    # Prettier auto-format
```

Type checking is handled automatically by Astro.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** - `bun run lint && bun run format:fix`
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

## Tech Stack

- **Runtime:** Bun 1.x
- **Framework:** Astro 5.x (file-based routing)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Components:** Astro components (server-side)
- **Storybook:** 8.x with HTML framework
- **Database:** Drizzle ORM + SQLite (dev) / MySQL (prod)
- **Auth:** Lucia Auth

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
```

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

## Current Progress (Phase 0)

### ✅ Completed

- Project initialization (Bun + Astro + Tailwind v4 + DaisyUI)
- Design tokens system
- 12 Atomic components with Storybook
- Layout components (MainLayout, Navigation, Header, Footer)
- Modal and Toast molecules
- Routing structure with 16 page stubs

### 🚧 In Progress / Next

- Code quality tools integration
- Login screen and authentication
- Database schema and migrations
- API endpoints for CRUD operations

## Working on This Project

1. **Start:** Run `bd ready` to find unblocked work
2. **Claim:** Run `bd update <id> --status in_progress`
3. **Branch:** Create feature branch `git checkout -b feature/<name>`
4. **Code:** Follow component guidelines and use design tokens
5. **Quality:** Run `bun run lint && bun run format:fix`
6. **Commit:** Commit with clear messages
7. **Push:** `git push` to feature branch
8. **PR:** Create PR with detailed description
9. **Complete:** After merge, run `bd close <id>` and `bd sync`
