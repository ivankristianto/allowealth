# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal and family financial application for expense tracking.

## Issue Tracking

This project uses **beads** (`bd`) for issue tracking. Key commands:

```bash
bd ready              # Find available work (no blockers)
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git remote
```

## Session Completion Protocol

When ending a work session, complete ALL steps - work is NOT done until pushed:

1. File issues for remaining work (`bd create`)
2. Run quality gates if code changed (tests, linters, builds)
3. Update issue status (`bd close` for finished, update in-progress)
4. Push to remote:
   ```bash
   git pull --rebase
   bd sync
   git push
   ```
5. Verify `git status` shows "up to date with origin"
