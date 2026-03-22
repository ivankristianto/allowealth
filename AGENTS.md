# Allowealth - Agent Instructions

> **Note:** Agent instructions have been reorganized into `.claude/` directory.

## Quick Start

All project rules and memory are now in `.claude/`:

- **Main instructions**: `.claude/CLAUDE.md`
- **Auto memory**: `.claude/memory/MEMORY.md`
- **Modular rules**: `.claude/rules/`

See `.claude/README.md` for full structure and documentation.

Current baseline: Astro 6 across the main app, docs site, and marketing site.

## For New Agents

1. Read `.claude/rules/principles.md` - core principles
2. Read `.claude/rules/workflow.md` - session behavior, quality gates
3. Read `.claude/rules/frontend/design-system.md` - design system
4. Read task context (spec, plan, or issue)
5. Create a plan before coding
6. Execute following implementation order: UI → Service → API → CLI → Seeder
7. Run quality gates before committing

**If rules conflict with task instructions, rules win.**
