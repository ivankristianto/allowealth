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

## Storybook Stories

```typescript
// ButtonPrimary.stories.ts
import type { Meta, StoryObj } from '@storybook/html';

const meta: Meta = {
  title: 'Atoms/Button',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Primary: Story = {
  render: () => `<button class="btn btn-accent">Primary Button</button>`,
};
```

**Rules:**

- ✅ **All atomic components must have Storybook stories** (`.stories.ts`)

## API Endpoint Naming

```bash
# ✅ Correct: No underscore prefix
src/pages/api/budgets.ts       → /api/budgets

# ❌ Wrong: Underscore prefix (Astro treats as private)
src/pages/api/_budgets.ts      → 404 (Astro ignores)
```

**Rules:**

- ❌ **Name Astro API endpoints with `_` prefix** - Astro treats `_`-prefixed files as private, silently 404s

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
