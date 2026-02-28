---
title: Architecture Map
description: Where things live in the repository and how requests flow through the system.
draft: false
head: []
sidebar:
  label: Architecture Map
  order: 4
audience:
  - developer
---

Use this page to orient quickly inside the codebase.

## Directory map

- `src/pages/`: Astro routes and server-rendered page entries
- `src/components/`: reusable UI building blocks
- `src/services/`: framework-agnostic business logic
- `src/pages/api/`: HTTP API endpoints
- `src/cli/`: `aw` command definitions
- `src/db/`: schema, migration, connection, seed scripts
- `docs/sites/`: Starlight user/developer docs site
- `docs/architecture/`: ADRs and deeper architecture decisions

## Request flow

```text
Browser/Client
  -> Astro page route (src/pages)
  -> Service layer (src/services)
  -> DB abstraction (src/db)
  -> Response (HTML/JSON)
```

For operational automations, the flow can enter through CLI first:

```text
CLI (src/cli)
  -> Service layer (src/services)
  -> DB abstraction (src/db)
```

## Design principle

Keep business rules in services so UI, API, and CLI stay consistent and easier to test.

Continue with [Developer Feature Workflow](/developers/feature-workflow/) for change sequencing.
