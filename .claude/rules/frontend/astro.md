---
paths:
  - 'src/components/**/*.astro'
  - 'src/pages/**/*.astro'
  - 'src/**/*.client.ts'
---

# Astro Patterns

## Interactive Pages Architecture

Server-rendered HTML fragments, not client-side DOM construction.

**Pattern**: Fetch `?_render=html` from API and inject pre-rendered markup.

```typescript
// ✅ Correct: Fetch server-rendered HTML
const response = await fetch('/api/budgets?_render=html');
const html = await response.text();
container.innerHTML = html;

// ❌ Wrong: Build HTML in JavaScript
const html = `<div class="card">${data.name}</div>`;
```

See `docs/architecture/002-interactive-pages.md` for full details.

## View Transition Compatibility

Astro view transitions swap the DOM but preserve module state. Init guards must be DOM-based, not module-based.

- ✅ **Use DOM-based init tracking (`element.dataset.initialized`)** - survives view transitions because new DOM elements don't carry the attribute
- ❌ **Use module-level `let initialized = false` flags** - module persists across soft navigations, flag stays `true`, new DOM elements never get listeners
- ✅ **Use `await import('astro:transitions/client')` dynamically** in `.client.ts` files that export pure functions for unit testing — `bun:test` can't resolve `astro:transitions/client`
- ❌ **Top-level `import { navigate } from 'astro:transitions/client'`** in testable `.client.ts` files — breaks unit tests outside Astro context
- ✅ **Consolidate dynamic imports before try/catch** — import `csrfFetch` and `addToast` once at the top of an async handler, not repeated in each branch

## Client Script Initialization (CRITICAL)

Scripts MUST work on initial load AND after ViewTransitions navigation. The golden rule: **Always listen to `astro:page-load`, never rely solely on `DOMContentLoaded`.**

### Required Pattern for All Client Scripts

```typescript
// ✅ CORRECT: Standard pattern for all client scripts
const CONTROLLER_KEY = '__myComponentController';

// Window interface augmentation for type safety
declare global {
  interface Window {
    [CONTROLLER_KEY]?: AbortController;
  }
}

function initMyComponent() {
  // Cleanup previous listeners - abort on init replaces need for astro:before-swap
  window[CONTROLLER_KEY]?.abort();

  const controller = new AbortController();
  window[CONTROLLER_KEY] = controller;
  const { signal } = controller;

  // Query DOM elements
  const container = document.querySelector('[data-my-component]');
  if (!container) return;

  // Attach listeners with signal for auto-cleanup
  container.addEventListener('click', handleClick, { signal });
}

// Initialize on initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMyComponent, { once: true });
} else {
  initMyComponent();
}

// CRITICAL: Re-initialize after ViewTransitions navigation
document.addEventListener('astro:page-load', initMyComponent);
```

### Anti-Patterns That Cause Regressions

```typescript
// ❌ WRONG: Only DOMContentLoaded - breaks on ViewTransitions
document.addEventListener('DOMContentLoaded', () => {
  // This never runs after client-side navigation
});

// ❌ WRONG: Module-level init flag - breaks after ViewTransitions
let initialized = false;
function init() {
  if (initialized) return; // Stays true after navigation, new DOM never gets listeners
  initialized = true;
}
document.addEventListener('astro:page-load', init);

// ❌ WRONG: Element data attributes with transition:persist
// When element has transition:persist, data-bound attribute survives navigation
// and prevents re-attaching listeners to the persisted element
toggle.dataset.bound = 'true'; // Persists with transition:persist!
if (toggle.dataset.bound === 'true') return; // Skips after navigation

// ❌ WRONG: No cleanup - event listeners accumulate
document.addEventListener('click', handler); // Never removed, fires multiple times
```

### Common Issues and Solutions

| Issue                              | Cause                                       | Solution                                                     |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Tabs stop working after navigation | Only `DOMContentLoaded`                     | Add `astro:page-load` listener                               |
| Toggles unresponsive               | `data-*-bound` + `transition:persist`       | Use `AbortController` + window key instead of DOM attributes |
| Duplicate event handlers           | No cleanup mechanism                        | Abort previous controller on init, use `{ signal }` option   |
| Stale DOM references               | Closures capture elements that get replaced | Use event delegation or re-query DOM on each interaction     |

### Decision Tree: When to Use Each Pattern

```
Does your component need to handle dynamic elements?
├── YES (elements added/removed dynamically)
│   └── Use event delegation with AbortController signal
│
└── NO (static elements, just needs re-init on navigation)
    └── Use AbortController + window[CONTROLLER_KEY]
```

### For Persisted Elements (`transition:persist`)

When an element has `transition:persist`, use **event delegation** or **re-query DOM on each interaction** to avoid stale references:

```typescript
// ✅ CORRECT: Event delegation for persisted elements
function initComponent(signal: AbortSignal) {
  document.addEventListener(
    'click',
    (e) => {
      // Re-query DOM fresh on each interaction
      const button = (e.target as HTMLElement).closest('[data-action]');
      if (!button) return;

      const drawer = document.getElementById('drawer');
      // drawer is queried fresh, never stale
    },
    { signal }
  );
}
```

### Complete Working Example

```typescript
// src/components/organisms/RecurringPage.client.ts
import { animate } from 'motion/mini';

const CONTROLLER_KEY = '__recurringPageController';

// Window interface augmentation for type safety
declare global {
  interface Window {
    [CONTROLLER_KEY]?: AbortController;
  }
}

function initRecurringPage() {
  // Cleanup previous - abort on init pattern
  window[CONTROLLER_KEY]?.abort();

  const controller = new AbortController();
  window[CONTROLLER_KEY] = controller;
  const { signal } = controller;

  // Query elements
  const page = document.querySelector('[data-recurring-page]');
  if (!page) return;

  const viewButtons = page.querySelectorAll('[data-recurring-view]');

  // Attach listeners with auto-cleanup
  viewButtons.forEach((btn) => {
    btn.addEventListener(
      'click',
      async () => {
        const view = btn.getAttribute('data-recurring-view');
        await switchView(view);
      },
      { signal }
    );
  });
}

// Run on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRecurringPage, { once: true });
} else {
  initRecurringPage();
}

// Re-run after ViewTransitions
document.addEventListener('astro:page-load', initRecurringPage);
```

## Client Scripts

Use `.client.ts` files with `data-*` attributes to pass server values to client.

```astro
<!-- ✅ Correct: Use data attributes -->
<dialog data-modal data-backdrop-close={backdropClose ? 'true' : 'false'}>
  <script>
    import { animate } from 'motion/mini'; // Works!
    const modal = document.querySelector('dialog[data-modal]');
    const backdropClose = modal?.dataset.backdropClose === 'true';
  </script>
</dialog>

<!-- ❌ Wrong: define:vars breaks npm imports -->
<script define:vars={{ backdropClose }}>
  import { animate } from 'motion/mini'; // Error!
</script>
```

**Rules:**

- ❌ **Never use inline `onclick` handlers in Astro templates** - blocked by production CSP nonce policy; use `data-*` attributes and attach handlers in `<script>` block instead
- ❌ **Never mix `define:vars`, `is:inline`, or `type="module"` with npm imports**
- ✅ **Use `data-*` attributes** to pass server values to client scripts
- ✅ **Extract `data-action` from DOM, don't use `define:vars`**

## TypeScript in Components

```astro
<!-- ❌ Wrong: TypeScript in inline script tags -->
<script>
  const items: string[] = ['a', 'b']; // Error: TS not supported
</script>

<!-- ✅ Correct: Use separate .ts file -->
<script>
  import { processItems } from './component.client.ts';
  processItems();
</script>
```

**Rules:**

- ❌ **Use TypeScript types in client-side `<script>` tags** - Astro's inline scripts don't support TS annotations
- ✅ **Use TypeScript in separate `.ts` files** for client-side code
- ✅ **Define component props with interfaces**

## Component Props

```astro
---
export interface Props {
  title: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}

const { title, variant = 'primary', className = '' } = Astro.props;
---

<div class={`component ${variant} ${className}`}>
  {title}
</div>
```

## User Object

```typescript
// ✅ Correct: Access properties directly
const user = Astro.locals.user;
const name = user.name;
const email = user.email;

// ❌ Wrong: user.attributes doesn't exist
const name = user.attributes.name; // Error
```

**Rules:**

- ❌ **Access `user.attributes.property`** - User type has properties directly (`user.name`, `user.email`)

## Astro.locals Types

```typescript
// ✅ Correct: Centralize in src/env.d.ts
declare global {
  namespace App {
    interface Locals {
      user: User | null;
    }
  }
}

export {};
```

**Rules:**

- ❌ **Declare `Astro.locals` types in multiple files** - centralize in `src/env.d.ts` only
- ✅ **Use `declare global { namespace App { ... } }`** when `env.d.ts` has imports
- ✅ **Add `export {}` at the end** of module-scoped type files

## Toast Notifications

```astro
---
import { addToast } from '@/lib/toast';
---

<script>
  import { addToast } from '@/lib/toast';

  // Success
  addToast({ type: 'success', message: 'Budget saved!' });

  // Error
  addToast({ type: 'error', message: 'Failed to save budget' });

  // Warning
  addToast({ type: 'warning', message: 'Budget limit reached' });
</script>
```

**Rules:**

- ✅ **Use toast system (`addToast`)** for user feedback instead of inline alerts
- ❌ **Use `alert()`, `confirm()`** - use toast notifications or confirmation modals

## API Endpoint Naming

```bash
# ✅ Correct: No underscore prefix
src/pages/api/budgets.ts       → /api/budgets

# ❌ Wrong: Underscore prefix (Astro treats as private)
src/pages/api/_budgets.ts      → 404 (Astro ignores)
```

**Rules:**

- ❌ **Name Astro API endpoints with `_` prefix** - Astro treats `_`-prefixed files as private, silently 404s

## Vite SSR Runtime

Astro uses Vite for SSR. These patterns apply to any server-side code processed by Vite.

### Bun Runtime

```bash
# ✅ Correct: Force Bun runtime
"dev": "bun --bun astro dev"

# ❌ Wrong: Astro CLI has #!/usr/bin/env node shebang, runs under Node.js
"dev": "astro dev"
```

**Rules:**

- ✅ **Use `bun --bun` flag for dev/preview scripts** - Astro CLI shebang defaults to Node.js
- ❌ **Assume `bun run dev` runs Astro under Bun** - the shebang overrides, causing Node.js execution
- ✅ **Verify actual runtime with `ps aux`** before assuming Bun APIs are available

### Module Loading in Vite SSR

```typescript
// ✅ Correct: Use createRequire for runtime-only module loading
import { createRequire } from 'node:module';

function loadDriver() {
  const dynamicRequire = createRequire(import.meta.url);
  return dynamicRequire('bun:sqlite');
}

// ✅ Correct: Static import for externalized Node.js builtins
import fs from 'node:fs';

// ❌ Wrong: Bare require() — Vite transforms modules into ESM scope
const fs = require('node:fs'); // "require is not defined"
```

**Rules:**

- ❌ **Use bare `require()` in files processed by Vite SSR** - Vite transforms modules into ESM scope where `require` is not defined, even with `bun --bun`
- ✅ **Use `createRequire(import.meta.url)` for runtime-only module loading** - works in both Bun and Node.js ESM contexts
- ✅ **Use static `import` for externalized Node.js builtins** (`node:fs`, `node:path`) - safe since they're in `ssr.external`
- ❌ **Assume `createRequire` resolves `.ts` files in Vite SSR** - `createRequire` only resolves `.js`, `.json`, `.node`

## Common Patterns

### Modal with Animation

```astro
<dialog data-modal>
  <div class="modal-box">
    <slot />
  </div>
</dialog>

<script>
  import { animate } from 'motion/mini';

  const modal = document.querySelector('dialog[data-modal]');
  const openButton = document.querySelector('[data-open-modal]');

  openButton?.addEventListener('click', () => {
    modal?.showModal();
    animate(modal, { opacity: [0, 1], y: [20, 0] }, { duration: 0.3 });
  });
</script>
```

### Form Submission with HTML Update

```astro
<form data-form>
  <input type="text" name="name" />
  <button type="submit">Save</button>
</form>

<script>
  const form = document.querySelector('form[data-form]');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const response = await fetch('/api/save?_render=html', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const html = await response.text();
      document.querySelector('#results').innerHTML = html;
    }
  });
</script>
```

### Reading CSRF Token

```typescript
// ✅ Correct: Proper decoding loop
function getCsrfToken(): string | null {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// ❌ Wrong: Breaks on base64
const token = document.cookie.split('csrf_token=')[1];
```

**Rules:**

- ✅ **Read CSRF token with proper decoding loop** - don't use `split('=')[1]` (breaks on base64)

## Client-Side Visibility & Data Attributes

- ✅ **Rely on Nano Stores `subscribe()` for initial visibility** - `subscribe()` fires immediately with current value, so SSR→client hydration handles visibility of elements like toggles and tab panels without SSR-side hacks
- ❌ **Wrap components in a div for SSR visibility when client toggles on the component's data attribute** - client code uses `querySelector('[data-year-toggle-group]')` to toggle `hidden` on the component's own root element; wrapping in an outer div means the client toggles the inner element while the outer div remains hidden
- ✅ **Make tab/toggle SSR state dynamic via `class:list`** - use `class:list={[condition && 'active-class']}` for SSR-correct initial tab states so `subscribe()` doesn't need to correct visual state
