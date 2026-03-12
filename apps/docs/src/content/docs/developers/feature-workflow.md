---
title: Developer Feature Workflow
description: Recommended implementation order and quality process for product changes.
draft: false
head: []
sidebar:
  label: Feature Workflow
  order: 2
audience:
  - developer
---

Follow this workflow to keep changes predictable and reviewable.

## Implementation order

Use this sequence:

1. **UI** (`src/pages`, `src/components`) with realistic mock or seeded data
2. **Service** (`src/services`) for business logic
3. **API** (`src/pages/api`) for transport
4. **CLI** (`src/cli`) when operational access is needed
5. **Seeder** (`src/db`) if new setup/test data is required

:::tip[💡 Tip]
UI-first catches requirement mismatches early and reduces backend churn.
:::

## Typical feature loop

1. Add/adjust tests for expected behavior.
2. Implement minimal code to satisfy tests.
3. Run local validation commands.
4. Confirm related docs are updated.
5. Open PR with clear scope and verification notes.

## Required validations

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

Run targeted tests for your affected area, then run broader suites if risk is high.

## Documentation updates you should not skip

- Update docs content in `apps/docs/src/content/docs/` for user-visible behavior changes.
- Update command docs in `COMMANDS.md` when scripts change.
- Update OpenAPI artifacts when API response/contract changes.

Use [Reference: API Overview](/reference/api-overview/) and [Reference: CLI](/reference/cli/) while implementing.
