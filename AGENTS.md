# Project Overview

Personal and family financial application for expense tracking, budgeting, asset management, and financial forecasting.

# Agent Instructions

## Agent Initialization

**Before any task, read the constitution and design system.**

```
1. Read `docs/constitution.md` — understand principles and fences
2. Read `design-system/START.md` — understand design patterns and tokens
3. Read task context (spec, plan, or issue)
4. Use TodoWrite to make the plan of execution
5. Execute
```

Agents must internalize:

- **Implementation order**: UI → Service → API → CLI → Seeder
- **Quality gates**: Which block, which don't
- **Refactor checklist**: Apply each loop, not at the end

**If constitution conflicts with task instructions, constitution wins.**

## Tech Stack

- **Runtime:** Bun 1.x
- **Framework:** Astro 5.x (file-based routing)
- **Styling:** Tailwind CSS v4 + DaisyUI v5
- **Components:** Astro components (server-side)
- **State Management:** Nano Stores (client-side reactive state)
- **Animations:** Motion (client-side animations)
- **Storybook:** 8.x with HTML framework
- **Database:** Drizzle ORM + SQLite (dev) / MySQL (prod)
- **Auth:** Lucia Auth

## Routes

```
/                          # Dashboard
/transactions              # Transaction list
/transactions/add          # Add transaction
/budget                    # Budget overview
/budget/history            # Budget history
/assets                    # Asset list
/assets/add                # Add asset
/assets/history            # Asset history
/reports                   # Monthly reports
/reports/yearly            # Yearly reports
/reports/custom            # Custom date range
/forecast                  # Forecast calculator
/forecast/comparison       # Scenario comparison
/calculators               # Compound interest calculator
/settings                  # Profile settings
/settings/categories       # Category management
/settings/payment-methods  # Payment methods
```

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
│   ├── stores/           # Nano Stores for client-side state
│   │   └── toastStore.ts # Toast notification state
│   └── tokens.ts         # Design tokens & helpers
└── styles/
    ├── globals.css       # Global styles
    └── tokens.css        # CSS custom properties
```

## Interactive Pages Architecture

For pages that need client-side interactivity (filtering, pagination, dynamic updates), we use **server-rendered HTML fragments** instead of client-side DOM construction.

**Read the full documentation:** `docs/architecture/interactive-pages.md`

### Key Principles

1. **Single Source of Truth**: All HTML rendering happens in Astro components
2. **No DOM Construction**: Client-side code only injects pre-rendered HTML
3. **API Dual Response**: Endpoints support both `?_render=json` and `?_render=html`

### File Structure

```
src/components/
├── partials/                    # Server-rendered fragments (no layout)
│   ├── TransactionListPartial.astro
│   └── PaginationPartial.astro
└── organisms/
    ├── MyRenderer.client.ts     # HTML injection + animations
    └── MyPage.client.ts         # Event handling + orchestration
```

### Quick Example

```typescript
// ❌ DON'T: Construct DOM on the client
function createRow(data) {
  const div = document.createElement('div');
  div.innerHTML = `<span>${data.name}</span>`; // Duplicates server logic
  return div;
}

// ✅ DO: Inject server-rendered HTML
async function fetchAndRender() {
  const { html } = await fetch('/api/items?_render=html');
  document.getElementById('list').innerHTML = html;
}
```

## API Documentation

The project uses **OpenAPI 3.1.0** for API documentation with a modular file structure.

### File Structure

```
openapi.yml                    # Main entry point with $ref references
openapi/
├── README.md                  # Documentation for OpenAPI structure
├── paths/                     # API endpoint definitions organized by feature
│   ├── auth.yml               # Authentication endpoints
│   ├── user.yml               # User profile and settings
│   ├── transactions.yml       # Transaction management
│   ├── categories.yml         # Category management
│   ├── payment-methods.yml    # Payment method management
│   ├── assets.yml             # Asset tracking
│   └── budget.yml             # Budget overview and alerts
├── schemas/                   # Reusable data model definitions
│   ├── ApiErrorResponse.yml   # Base API response schema
│   ├── ErrorResponse.yml      # Error response schema
│   ├── SignupRequest.yml      # Registration request schema
│   ├── LoginRequest.yml       # Login request schema
│   └── ... (40+ schema files)
├── responses/                 # Reusable response definitions
│   └── common.yml             # Common HTTP responses (400, 401, 404, 500)
└── parameters/                # Reusable parameter definitions
    └── common.yml             # Common parameters (id)
```

### Updating API Documentation

**IMPORTANT:** Whenever you modify or add API endpoints, you MUST update the appropriate OpenAPI files:

1. **For new endpoints:** Add to the appropriate `openapi/paths/*.yml` file
2. **For new schemas:** Add to `openapi/schemas/*.yml`
3. **For references:** Update main `openapi.yml` with new `$ref` entries

See `openapi/README.md` for detailed documentation on the structure and conventions.

### Validation Commands

```bash
# Install OpenAPI validation tool
npm install -g @redocly/cli

# Validate the OpenAPI specification
npx @redocly/cli lint openapi.yml

# Preview documentation locally
npx @redocly/cli preview-docs openapi.yml
```

## Component Guidelines

**IMPORTANT:** Follow the design system guidelines in `design-system/START.md` for all UI implementation. This includes using design tokens, DaisyUI classes, accessibility requirements, and responsive patterns.

### Use Astro Components For:

- All UI components (atoms, molecules, organisms)
- Pages and layouts
- Server-rendered content

### Astro Files - DO NOT:

- **DO NOT use TypeScript types in client-side `<script>` tags** - Astro's inline scripts run in the browser and don't support TypeScript type annotations. Use plain JavaScript or move typed code to separate `.ts` files.
- **DO NOT access `user.attributes.property`** - The User type has properties directly on the object (`user.name`, `user.email`), not nested in `attributes`.
- **DO NOT declare `Astro.locals` types in multiple files** - Centralize in `src/env.d.ts` only.
- **DO NOT use `vitest` to write test, use `bun:test` instead.**
- **DO NOT mix `define:vars`, `is:inline`, or `type="module"` with npm imports in `<script>` tags** - These attributes make Astro treat scripts as inline, which cannot resolve npm package imports (e.g., `import { animate } from 'motion'`). Instead, pass server values via `data-*` attributes on HTML elements and read them in a regular `<script>` tag:

  ```astro
  <!-- ✅ Correct: Use data attributes -->
  <dialog data-modal data-backdrop-close={backdropClose ? 'true' : 'false'}>
    <script>
      import { animate } from 'motion'; // Works!
      document.querySelectorAll('dialog[data-modal]').forEach((modal) => {
        const backdropClose = modal.dataset.backdropClose === 'true';
      });
    </script>

    <!-- ❌ Wrong: define:vars breaks npm imports -->
    <script define:vars={{ backdropClose }}>
      import { animate } from 'motion'; // Error: Cannot resolve module
    </script>
  </dialog>
  ```

### Storybook Stories:

- All atomic components must have stories
- Use `.stories.ts` files (TypeScript)
- Render functions create DOM elements directly
- Test all variants and states

### Toast Notifications

Use the toast system for user feedback instead of inline alerts:

```typescript
// In client-side <script> tags
import { addToast } from '@lib/stores/toastStore';

// After successful action
addToast('Changes saved!', 'success');

// After error
addToast('Failed to save. Please try again.', 'error');
```

**When to use:**

- Form submission feedback
- API response notifications
- Background task completion
- Error messages that don't block UI

**When NOT to use:**

- Form validation errors (use inline errors)
- Critical blocking errors (use error page/modal)
- Confirmation dialogs (use Modal)

## TypeScript Guidelines

### Extending Astro.locals

When extending `Astro.locals`, use this pattern in `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

import type { User, Session } from '@/lib/auth/lucia';

declare global {
  namespace App {
    interface Locals {
      user?: User | null;
      session?: Session | null;
    }
  }
}

export {};
```

**Key points:**

- Use `declare global { namespace App { ... } }` when the file has imports
- Import custom types from project files (`@/lib/auth/lucia`), not from library packages directly
- The `export {}` at the end ensures the file is treated as a module

## Pre-Commit Quality Gates

**Before committing ANY code**, you MUST run:

```bash
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"
bun run lint:fix          # ESLint check
bun run stylelint:fix          # ESLint check
bun run format:fix    # Prettier auto-format
bun run typecheck     # TypeScript type checking
```

**CRITICAL:** If `bun:` imports are found in files that are imported by middleware (src/middleware.ts), the code MUST be refactored. Astro middleware runs in Node.js and cannot load Bun-specific APIs.
