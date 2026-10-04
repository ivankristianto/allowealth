---
paths:
  - 'src/cli/**/*.ts'
---

# CLI Conventions

- ✅ **Add new CLI scripts as `aw` subcommands** — register in `src/cli/index.ts` subCommands, create command file in `src/cli/commands/`
- ✅ **Use `src/cli/lib/exec.ts` for shell-out commands** — wraps `execFileSync` with clean error handling
- ✅ **Use lazy `await import()` inside `run()` for logic commands** — avoids loading DB/services at CLI startup
