# Components

Component patterns for atoms, molecules, and organisms.

## Structure Template

```astro
---
/**
 * ComponentName - Brief description
 * @param {string} variant - primary | secondary
 */
export interface Props {
  variant?: 'primary' | 'secondary';
  className?: string;
}

const { variant = 'primary', className = '' } = Astro.props;

const classes = ['base-classes', variant === 'primary' && 'primary-classes', className]
  .filter(Boolean)
  .join(' ');
---

<element class={classes}><slot /></element>
```

## Core Components

### Icon (`@lucide/astro`)

**Use Lucide icons** for all icons in the application. They are accessible, consistent, and well-maintained.

```astro
---
import {
  X,
  Plus,
  Edit,
  Trash2,
  Check,
  TriangleAlert,
  Info,
  Search,
  ChevronDown,
  ChevronRight,
} from '@lucide/astro';
---

<!-- Basic icon -->
<Plus size={20} />

<!-- With color -->
<Check size={16} class="text-success" />

<!-- In button -->
<button class="btn btn-primary">
  <Plus size={20} />
  <span>Add New</span>
</button>

<!-- Icon-only button (needs aria-label) -->
<button class="btn btn-ghost btn-square" aria-label="Close">
  <X size={24} />
</button>

<!-- With status -->
<div class="flex items-center gap-2 text-error">
  <TriangleAlert size={16} />
  <span>Error occurred</span>
</div>
```

**Icon Sizing Standards:**

| Context     | Size (px) | Usage Example                    |
| ----------- | --------- | -------------------------------- |
| Extra small | 12        | Compact badges, inline icons     |
| Small       | 16        | Button icons, inline text icons  |
| Medium      | 20        | Form field icons, card headers   |
| Large       | 24        | Alert icons, modal headers       |
| Extra large | 32        | Empty states, hero illustrations |

**Class-based sizing (for inline SVGs):**

| Tailwind Class | Size (px) |
| -------------- | --------- |
| `h-3 w-3`      | 12        |
| `h-4 w-4`      | 16        |
| `h-5 w-5`      | 20        |
| `h-6 w-6`      | 24        |
| `h-8 w-8`      | 32        |

**Common icons:**

- `Plus`, `Minus`, `X` - Actions
- `Edit` (or `Pencil`), `Trash2`, `Save` - CRUD operations
- `Search`, `Download`, `Upload` - Tools
- `Check`, `CircleCheck` - Success/complete
- `TriangleAlert`, `CircleX`, `Info` - Errors/warnings/info
- `ChevronDown`, `ChevronRight`, `ChevronLeft`, `ChevronUp` - Navigation
- `Menu`, `Settings`, `User`, `LogOut` - UI elements
- `Eye`, `EyeOff` - Password visibility toggle
- `Calendar`, `Tag`, `DollarSign` - Data entry icons

**Icon accessibility patterns:**

```astro
<!-- Decorative icon (not announced by screen readers) -->
<Search size={16} class="stroke-current" aria-hidden="true" />

<!-- Icon with adjacent text (no aria-label needed) -->
<button class="btn btn-primary">
  <Plus size={20} class="stroke-current" aria-hidden="true" />
  <span>Add New</span>
</button>

<!-- Icon-only button (aria-label required) -->
<button class="btn btn-ghost btn-circle" aria-label="Close dialog">
  <X size={16} class="stroke-current" aria-hidden="true" />
</button>

<!-- Status icon with text (aria-hidden on icon) -->
<div class="flex items-center gap-2">
  <Check size={16} class="text-success" aria-hidden="true" />
  <span>Changes saved</span>
</div>
```

**Standard icon classes:**

```astro
<!-- For buttons/interactive elements -->
<Icon size={16} class="stroke-current" aria-hidden="true" />

<!-- For flex layouts (prevents shrinking) -->
<Icon size={20} class="shrink-0" aria-hidden="true" />

<!-- For colored icons -->
<Icon size={24} class="text-primary" aria-hidden="true" />

<!-- Combined -->
<Icon size={16} class="stroke-current shrink-0" aria-hidden="true" />
```

**Stroke-width guidance:**

Lucide icons use a default stroke-width of 2, which provides good visual clarity at all standard sizes. **Do NOT explicitly set stroke-width** - use Lucide's default for consistency.

| Size (px) | Default Stroke Width | Visual Effect              |
| --------- | -------------------- | -------------------------- |
| 12        | 2 (default)          | Crisp at small sizes       |
| 16        | 2 (default)          | Standard for buttons       |
| 20        | 2 (default)          | Balanced for UI elements   |
| 24        | 2 (default)          | Clear for alerts/status    |
| 32        | 2 (default)          | Proportionate for emphasis |

**Rationale:** Lucide's default stroke-width is carefully designed for each icon's visual balance. Changing stroke-width can make icons appear too heavy or too light, reducing accessibility and visual consistency.

**Avoid:**

```astro
<!-- Don't explicitly set stroke-width -->
<X size={16} stroke-width={1} />
<Plus size={20} stroke={3} />
```

**Use:**

```astro
<!-- Let Lucide use its default stroke-width -->
<X size={16} class="stroke-current" />
<Plus size={20} class="stroke-current shrink-0" />
```

**Migration note:** The custom `Icon.astro` component has been removed. All icons now use `@lucide/astro` directly. See `docs/icon-migration-guide.md` for migration patterns.

### Button (`src/components/atoms/Button.astro`)

```astro
<Button variant="primary" type="submit">Save</Button>
<Button variant="outline" size="sm">Filter</Button>
<Button variant="danger" onclick="confirmDelete()">Delete</Button>
<Button loading={isSubmitting}>Submitting...</Button>
```

**Variants:** `primary` | `secondary` | `outline` | `ghost` | `danger` | `warning` | `success`
**Sizes:** `sm` | `md` | `lg`

### Card (`src/components/atoms/Card.astro`)

```astro
<Card>Content</Card>
<Card compact>Compact padding</Card>
<Card hoverable>Interactive card</Card>
```

### Input (`src/components/atoms/Input.astro`)

```astro
<Input id="name" name="name" type="text" required />
<Input id="amount" type="number" min={0} step={0.01} />
<Input id="email" type="email" error={!!errors.email} errorMessage={errors.email} />
```

### Modal (`src/components/molecules/Modal.astro`)

```astro
<Modal id="confirm-delete" title="Confirm">
  <p>Are you sure?</p>
  <div slot="actions">
    <Button variant="danger">Delete</Button>
  </div>
</Modal>

<script>
  document.getElementById('modal-id')?.showModal();
  document.getElementById('modal-id')?.close();
</script>
```

**Sizes:** `sm` | `md` | `lg` | `xl`

### Badge (`src/components/atoms/Badge.astro`)

```astro
<Badge variant="success">Paid</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="primary" outline>New</Badge>
```

### Toast (`src/components/molecules/ToastContainer.astro`)

**Global toast notification system** using Nano Stores and Motion for state management and animations. Automatically included in `BaseLayout.astro`.

**Usage (in client-side scripts):**

```astro
<script>
  import { addToast } from '@lib/stores/toastStore';

  // Basic usage
  addToast('Profile saved!', 'success');
  addToast('Failed to save', 'error');
  addToast('Please review', 'warning');
  addToast('New update available', 'info');

  // Custom duration (ms)
  addToast('Quick message', 'success', { duration: 2000 });

  // Persistent (manual dismiss)
  addToast('Action required', 'warning', { duration: 0 });

  // Remove specific toast
  import { removeToast } from '@lib/stores/toastStore';
  const toastId = addToast('Message', 'info');
  removeToast(toastId);

  // Clear all toasts
  import { clearAllToasts } from '@lib/stores/toastStore';
  clearAllToasts();
</script>
```

**Types:** `success` | `error` | `warning` | `info`

**Behavior:**

- Success/info/warning: Auto-dismiss after 5 seconds
- Error: Persistent until manually dismissed
- Maximum 5 toasts visible at once (older toasts removed when limit reached)
- Positioned top-right with slide animations
- Cleaned up on page navigation to prevent memory leaks

**DaisyUI Classes Used:**

```html
<!-- Container -->
<div class="toast toast-top toast-end z-50" role="region" aria-label="Notifications">
  <!-- Individual toast -->
  <div class="alert alert-success" role="alert" aria-live="polite">
    <span>Message here</span>
    <button class="btn btn-ghost btn-xs" aria-label="Dismiss">✕</button>
  </div>
</div>
```

**Accessibility:**

- Container: `role="region"` and `aria-label="Notifications"`
- Each toast: `role="alert"` with `aria-live="polite"` (success/info/warning) or `aria-live="assertive"` (error)
- Dismissible button with `aria-label`

**Note:** The close button uses inline SVG instead of `@lucide/astro` icon component. This is necessary due to Astro SSR limitations for client-side scripts that dynamically create DOM elements.

## Patterns

### Conditional Classes

```typescript
const classes = [
  'base',
  variant === 'primary' && 'btn-primary',
  disabled && 'opacity-50',
  className,
]
  .filter(Boolean)
  .join(' ');
```

### Variant Mapping

```typescript
const variantClasses: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'bg-neutral-200',
};

const classes = ['base', variantClasses[variant] || variantClasses.primary]
  .filter(Boolean)
  .join(' ');
```

### Prop Defaults

```typescript
const { variant = 'primary', size = 'md', disabled = false, className = '' } = Astro.props;
```

## DaisyUI Classes

```html
<button class="btn btn-primary">
  <input class="input input-bordered" />
  <div class="card card-bordered bg-base-100">
    <span class="badge badge-primary">
      <div class="alert alert-warning">
        <dialog class="modal"></dialog></div
    ></span>
  </div>
</button>
```

## Component Checklist

- [ ] Check existing components first
- [ ] Use design tokens (import from `@/lib/tokens`)
- [ ] TypeScript Props interface
- [ ] Sensible prop defaults
- [ ] DaisyUI classes when available
- [ ] ARIA attributes where needed
- [ ] Keyboard accessible
- [ ] Responsive

## Modern HTML Elements

**Always use semantic HTML elements** instead of generic divs and spans. This improves accessibility, SEO, and code readability.

```html
<!-- Layout elements -->
<header><!-- Site/section header --></header>
<nav><!-- Navigation menu --></nav>
<main><!-- Primary content --></main>
<aside><!-- Sidebar, related content --></aside>
<footer><!-- Site/section footer --></footer>

<!-- Content sectioning -->
<section><!-- Thematic grouping --></section>
<article><!-- Self-contained content --></article>
<figure>
  <img src="..." alt="..." />
  <figcaption>Caption</figcaption>
</figure>

<!-- Interactive elements -->
<button><!-- Clickable action --></button>
<dialog><!-- Modal/popup --></dialog>
<details>
  <summary>Expandable title</summary>
  Content
</details>
```

**Example: Dashboard layout**

```html
<main class="container mx-auto p-6">
  <header class="mb-8">
    <h1 class="text-4xl font-bold">Dashboard</h1>
  </header>

  <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <article class="card">
      <h2 class="text-xl font-semibold">Budget Overview</h2>
      <p>...</p>
    </article>

    <article class="card">
      <h2 class="text-xl font-semibold">Recent Transactions</h2>
      <p>...</p>
    </article>
  </section>
</main>
```

## Anti-Patterns

❌ Hardcoded: `style="color: #10b981"`
✅ Token: `class="text-primary"`

❌ Over-engineered: `<TextWithColorAndSize text="Hello" color="primary" />`
✅ Simple: `<h3 class="text-lg text-primary">Hello</h3>`

❌ No accessibility: `<input placeholder="Name" />`
✅ With label: `<Label htmlFor="name">Name</Label><Input id="name" />`

❌ Generic divs: `<div class="wrapper"><div class="item" onclick="...">Click</div></div>`
✅ Semantic HTML: `<section><button>Click</button></section>`

❌ Custom icons: `<span class="icon">✓</span>`
✅ Lucide icons: `<Check size={16} />`
