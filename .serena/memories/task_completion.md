# Task Completion Checklist

When a task is complete, do ALL of the following before committing:

## 1. Check for Bun-specific imports in shared code

```bash
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"
```

If found in middleware-imported files → REFACTOR before continuing.

## 2. Run all quality gates (all must pass)

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

## 3. Run relevant tests

```bash
bun run test          # Unit tests
bun run test:e2e      # E2E (if UI changed)
```

## 4. Verify build

```bash
bun run build         # After bug fixes especially
```

## 5. Additional checks

- Updated OpenAPI docs if API endpoints changed
- Updated `COMMANDS.md` if `package.json` scripts or CLI tools changed
- Traced ALL consumers of any shared component modified
- Verified return types don't silently strip new fields
- Checked bundle budget after any dependency change

## 6. Issue tracking

- Create GitHub issues (`gh issue create`) — NOT Linear tickets
- Use `github-issue-creation` skill for structured issues

## 7. Implementation order

UI → Service → API → CLI → Seeder
