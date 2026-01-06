# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd prime` to refresh context after compaction.

ALWAYS read the specs/\*.md to understand the context and requiremetns.
if requirement changes always update the spec.

**Before any task, read the constitution.**

```
1. Read `specs/constitution.md` — understand principles and fences
2. Read task context (spec, plan, or issue)
3. Then execute
```

Agents must internalize:

- **Implementation order**: UI → Service → API → CLI → Seeder
- **Quality gates**: Which block, which don't
- **Refactor checklist**: Apply each loop, not at the end

**If constitution conflicts with task instructions, constitution wins.**

## Quick Reference

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
bun run typecheck     # TypeScript type checking
bun run lint          # ESLint check
bun run format:fix    # Prettier auto-format
```

## Working on This Project

**ALWAYS FOLLOW THIS WORKFLOW**

### Single Task Workflow

1. **Start:** Run `bd ready` to find unblocked work
2. **Claim:** Run `bd update <id> --status in_progress`
3. **Branch:** Create feature branch `git checkout -b feature/<name>`
4. **Code:** Follow component guidelines and use design tokens
5. **Quality:** Run `bun run typecheck && bun run lint && bun run format:fix`
6. **Commit:** Commit with clear messages
7. **Push:** `git push` to feature branch
8. **PR:** Create PR with detailed description
9. **PR Review**: Invoke subagent code review specialist to review the PR, no code changes, and comment only on the PR.
10. **Complete:** After merge, run `bd close <id>` and `bd sync`

### Group Task Workflow

**When working on multiple related tasks** (e.g., a feature with multiple components), follow this workflow:

#### 1. Task Organization

- Group tasks by domain or per user instruction
- Example: "Login screen" might include: form component, validation, API endpoint, auth flow

#### 2. Branch Creation

```bash
git checkout -b feature/<descriptive-name>
```

#### 3. Implementation Loop

For each task in the group:

- Implement the task
- After completion, run quality gates:
  ```bash
  bun run typecheck
  bun run lint
  bun run format:fix
  ```
- Once all checks pass, stage and commit:
  ```bash
  git add <files>
  git commit -m "feat: descriptive message"
  ```
- Push to remote:
  ```bash
  git push
  ```

#### 4. Continue Until Session Complete

- Repeat step 3 for all tasks in the group
- Keep commits atomic and focused
- Push after each completed task

#### 5. Pull Request Creation

Create GitHub Pull Request, follow the GitHub Pull Request template.

#### 6. Code Review

- Invoke the **code-review-specialist** agent to review the PR
- Agent will analyze code quality, security, and maintainability
- Agent will comment on the PR with findings
- Agent performs review only (no code changes)
- Check Pull Request checklist once done

#### 7. Completion Report

Provide summary to user:

- PR link
- Tasks completed
- Code review status
- Any issues or recommendations

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
