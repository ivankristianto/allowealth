# Claude Code Configuration

This directory contains Claude Code's project memory and rules.

## Structure

```
.claude/
├── CLAUDE.md                    # Main project instructions (entry point)
├── README.md                    # This file
├── memory/
│   └── MEMORY.md                # Auto-memory (Claude writes learnings here)
└── rules/                       # Modular topic-specific rules
    ├── principles.md            # Core principles
    ├── workflow.md              # Session behavior, quality gates
    ├── performance.md           # Performance rules (database, cache, Core Web Vitals)
    ├── frontend/
    │   ├── design-system.md     # Design tokens, DaisyUI, accessibility
    │   ├── astro.md             # Astro patterns
    │   └── bundle.md            # Bundle performance
    ├── backend/
    │   ├── database.md          # DB patterns, migrations
    │   ├── deployment.md        # Workers deployment
    │   └── api.md               # API patterns
    ├── testing.md               # Testing patterns
    └── learned-patterns.md      # Learned patterns from experience
```

## How It Works

### CLAUDE.md (Main Entry)

- Quick reference guide loaded at session start
- Links to tech stack, ADR table, key commands
- References detailed rules in `.claude/rules/`

### Memory (Auto-memory)

- `memory/MEMORY.md` - Claude's automatic notes and learnings
- First 200 lines loaded into every session
- Claude reads/writes to this during sessions
- Contains quick reference for build commands, patterns, insights

### Rules (Modular Instructions)

- Topic-specific markdown files
- Path-specific rules use YAML frontmatter (e.g., `paths: ["src/**/*.astro"]`)
- All `.md` files in `rules/` are automatically loaded
- More specific than CLAUDE.md, focused on one topic each

## Path-Specific Rules

Some rules apply only to specific file patterns using YAML frontmatter:

```yaml
---
paths:
  - 'src/components/**/*.astro'
  - 'src/pages/**/*.astro'
---
# Design System
...rules that apply to Astro components...
```

Without `paths`, rules apply globally.

## Editing Memory

Use `/memory` command in Claude Code to open memory files in your editor.

## Best Practices

- **Keep rules focused** - Each file covers one topic
- **Use descriptive filenames** - Indicate what the rules cover
- **Organize with subdirectories** - Group related rules (frontend/, backend/)
- **Use path frontmatter sparingly** - Only when rules truly apply to specific files
- **Update regularly** - Keep rules current as project evolves

## Loading Order

1. Managed policy (if exists)
2. User memory (`~/.claude/CLAUDE.md`)
3. Project memory (`CLAUDE.md`)
4. Project rules (`rules/**/*.md`)
5. Local project memory (`CLAUDE.local.md`)
6. Auto memory (first 200 lines of `memory/MEMORY.md`)

More specific instructions take precedence.

## Documentation Sources

- Core rules: `.claude/rules/`
- Architecture: `docs/architecture/`
- Design system: `design-system/`
- Commands: `COMMANDS.md`
