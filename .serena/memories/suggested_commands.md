# Suggested Commands

## Development

```bash
bun run dev          # Start dev server (use --bun flag for Bun runtime)
bun run build        # Build for production
bun run aw <cmd>     # CLI entry point (citty-based)
```

## Quality Gates (run before every commit — all must pass)

```bash
bun run lint:fix        # ESLint (blocking)
bun run stylelint:fix   # Stylelint (blocking)
bun run format:fix      # Prettier (blocking)
bun run typecheck       # TypeScript tsc --noEmit (blocking)
```

## Testing

```bash
bun run test        # Unit tests (bun:test)
bun run test:e2e    # E2E tests (Playwright)
```

## Database

```bash
bun run db:generate  # Generate SQLite migration
bun run db:migrate   # Apply SQLite migrations
bun run db:push      # Push schema (SQLite dev only)
```

## Utility

```bash
git status / git log / git diff   # VCS
grep -r "pattern" src/            # Search source
ls / find                         # File system (Darwin)
bun run aw <command>              # All CLI subcommands
```

## Ports (when using worktrees)

- Main: 4321, worktrees: 4322, 4323, ...
- Find active: `lsof -i -P | grep LISTEN | grep 432`
