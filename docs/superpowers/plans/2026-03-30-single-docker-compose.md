# Single Docker Compose Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split Docker workflow with one compose file that starts both the app and Redis, and make Redis the default Docker cache backend.

**Architecture:** Extend `docker/docker-compose.yml` to include Redis, switch the app service to a local Docker build, and default Docker cache settings to Redis. Remove the separate Redis-only compose file and point Bun scripts and docs at the single compose stack.

**Tech Stack:** Docker Compose v2, Bun scripts, Astro docs

---

### Task 1: Unify the Compose Stack

**Files:**
- Modify: `docker/docker-compose.yml`
- Delete: `docker/docker-compose.dev.yml`

- [ ] **Step 1: Update `docker/docker-compose.yml`**

Add a `redis` service, switch the app service to `build:`, add Redis-default cache settings, and add a named `redis-data` volume.

- [ ] **Step 2: Remove the extra compose file**

Delete `docker/docker-compose.dev.yml`.

- [ ] **Step 3: Verify compose config**

Run: `docker compose -f docker/docker-compose.yml config`
Expected: PASS and both `app` and `redis` services appear in the rendered config.

### Task 2: Update Docker Defaults and Commands

**Files:**
- Modify: `docker/.env.example`
- Modify: `package.json`
- Modify: `COMMANDS.md`

- [ ] **Step 1: Update Docker env example**

Set Docker cache guidance to Redis by default and document the Redis URL used by the compose stack.

- [ ] **Step 2: Update Bun helper scripts**

Point `docker:start` and `docker:stop` to `docker/docker-compose.yml`.

- [ ] **Step 3: Update command docs**

Make `COMMANDS.md` describe the unified app + Redis Docker stack.

- [ ] **Step 4: Verify helper commands**

Run: `bun run docker:start`
Expected: PASS, Docker builds the app image locally and starts both app and redis.

Run: `bun run docker:stop`
Expected: PASS, unified stack stops cleanly.

### Task 3: Update Self-Host Docs

**Files:**
- Modify: `apps/docs/src/content/docs/self-host.md`

- [ ] **Step 1: Update self-host Docker guidance**

Describe the single compose stack, Redis default behavior, and any wording that still assumes a single app-only container.

- [ ] **Step 2: Build docs**

Run: `bun run docs:build`
Expected: PASS.

### Task 4: Run Final Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: PASS.

- [ ] **Step 2: Build app**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

Run:
```bash
git add docker/docker-compose.yml docker/.env.example package.json COMMANDS.md apps/docs/src/content/docs/self-host.md docker/docker-compose.dev.yml docs/superpowers/specs/2026-03-30-single-docker-compose-design.md docs/superpowers/plans/2026-03-30-single-docker-compose.md
git commit -m "refactor: unify Docker compose stack"
```
