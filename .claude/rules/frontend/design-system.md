---
paths:
  - 'src/components/**/*.astro'
  - 'src/pages/**/*.astro'
  - 'src/styles/**/*.css'
---

# Design System

**Version:** 1.1.0 | **Framework:** Astro 5.x + Tailwind v4 + DaisyUI v5

## Visual Debugging with Chrome

Always verify component rendering in actual browser before declaring work complete.

**Pattern:**

1. Open page in Chrome at `http://<worktree>.expenses.local:4322`
2. Zoom in to inspect visual details (spacing, borders, alignment)
3. Check both desktop and mobile views (responsive testing)
4. Verify against reference implementations

**Rules:**

- ✅ **Visit page in Chrome to see actual rendered state** - HTML source doesn't reveal visual issues like awkward borders
- ✅ **Zoom in to inspect visual details** - `Cmd + Plus` to see spacing, borders, shadows
- ✅ **Test mobile view via DevTools device toggle** - mobile stacks differently than desktop
- ❌ **Trust template code review for visual correctness** - `border-t` in rounded card looks fine in code but wrong visually

## Core Rules

1. **Use design tokens** - Import from `@/lib/tokens` (never hardcode)
2. **DaisyUI first** - Use DaisyUI classes, then Tailwind utilities
3. **Accessibility required** - WCAG 2.1 AA (keyboard nav + ARIA + contrast)
4. **Mobile-first** - Base styles for mobile, enhance for desktop
5. **Semantic HTML** - Use `<button>`, `<nav>`, `<main>`, `<section>`
6. **Icons** - Use `@lucide/astro` for all icons
7. **Animations** - Use `motion/mini` for complex animations

## Import Tokens

```typescript
import { colors, fontSizes, spacing, tokenClasses } from '@/lib/tokens';
import { formatCurrency, formatCurrencyCompact, formatPercentage } from '@/lib/formatting';
import { X, Plus, Edit, Trash2 } from '@lucide/astro';
import { animate } from 'motion/mini';
```

## Colors

**DaisyUI Semantic Classes (theme-aware):**

```typescript
'text-primary'; // Primary brand color (slate-900 light / slate-50 dark)
'text-accent'; // Accent color (forest-700) - CTAs, interactive elements
'text-success'; // Success states (emerald-500) - confirmations, IDR
'text-warning'; // Warning states (amber-500) - budget alerts
'text-error'; // Error states (rose-500) - over budget, danger
'text-info'; // Info states (sky-500) - informational

'bg-base-100'; // Base background
'bg-base-200'; // Elevated background (cards, inputs)
'bg-base-300'; // More elevated (hover states)
'text-base-content'; // Main text color (auto-adjusts with theme)
'border-base-300'; // Border color (theme-aware)
```

**Color Tokens (JavaScript):**

```typescript
colors.primary; // #0f172a (slate-900 - headings, text)
colors.accent; // #15803d (forest-700 - CTAs, WCAG AA)
colors.success; // #10b981 (emerald-500)
colors.warning; // #f59e0b (amber-500)
colors.error; // #f43f5e (rose-500)
colors.info; // #0ea5e9 (sky-500)

colors.currency.idr; // #10b981 (emerald)
colors.currency.usd; // #3b82f6 (blue)

colors.status.ok; // #22c55e (<80%)
colors.status.warning; // #f59e0b (80-99%)
colors.status.danger; // #f43f5e (≥100%)
```

**Color Semantics:**

- Use `btn-accent` for primary CTAs (forest green)
- Use `text-primary` for headings (slate)
- Use `focus:ring-accent` for focus states
- **Avoid Tailwind color names** (`text-slate-500`, `bg-gray-100`) - they don't change with themes

## Typography

```typescript
fontSizes.xs; // 0.8125rem (13px) - labels, minimum accessible size
fontSizes.sm; // 0.875rem (14px) - body (small)
fontSizes.base; // 0.9375rem (15px) - body (default)
fontSizes.md; // 1rem (16px) - emphasized
fontSizes.lg; // 1.0625rem (17px) - emphasized
fontSizes.xl; // 1.25rem (20px) - section headings
fontSizes['2xl']; // 1.5rem (24px) - page headings
```

## Spacing

```typescript
spacing.form; // 16px - form field gaps
spacing.card; // 24px - card padding
spacing.section; // 32px - section gaps
```

## Breakpoints

```typescript
sm: 640px   md: 768px   lg: 1024px   xl: 1280px   2xl: 1536px
```

## DaisyUI Components

```html
<!-- Buttons -->
<button class="btn btn-accent">Primary CTA</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-ghost btn-square" aria-label="Close">
  <X size="{24}" aria-hidden="true" />
</button>

<!-- Inputs -->
<input class="input input-bordered" />
<textarea class="textarea textarea-bordered"></textarea>

<!-- Cards -->
<div class="card card-bordered bg-base-100">
  <div class="card-body">Content</div>
</div>

<!-- Badges -->
<span class="badge badge-primary">Badge</span>

<!-- Alerts -->
<div class="alert alert-warning">
  <TriangleAlert size="{20}" aria-hidden="true" />
  <span>Warning message</span>
</div>
```

## Accessibility Requirements

**WCAG 2.1 AA mandatory:**

- **Semantic HTML**: Use `<button>`, `<nav>`, `<main>`, not `<div>`
- **Labels**: Every input needs `<label for="id">` or `aria-label`
- **Keyboard**: Tab to navigate, Enter/Space to activate, Esc to close
- **Focus**: Never remove outline without replacement
- **Contrast**: Text ≥4.5:1, UI ≥3:1
- **ARIA**: Use `aria-label`, `aria-describedby`, `role="alert"`
- **Touch**: Min 44x44px for mobile buttons
- **Disabled controls**: Use native `disabled` attribute, not just `aria-disabled`

## Common Patterns

### Icons with Labels

```astro
<!-- Button with icon -->
<button class="btn btn-accent">
  <Plus size={20} class="stroke-current" aria-hidden="true" />
  <span>Add Transaction</span>
</button>

<!-- Icon-only button -->
<button class="btn btn-ghost btn-square" aria-label="Close">
  <X size={24} aria-hidden="true" />
</button>
```

### Animations

```astro
<script>
  import { animate } from 'motion/mini';

  const element = document.querySelector('.fade-in');
  animate(element, { opacity: [0, 1] }, { duration: 0.3 });

  const modal = document.querySelector('.modal');
  animate(modal, { y: [20, 0], opacity: [0, 1] }, { duration: 0.4 });
</script>
```

### Responsive Grid

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols -->
</div>
```

### Form Field

```astro
<FormField label="Name" htmlFor="name" required>
  <Input id="name" name="name" error={!!errors.name} errorMessage={errors.name} />
</FormField>
```

### Currency Display

```astro
<Currency amount={150000} currency="IDR" className="currency-idr" />
```

### Loading State

```astro
<Skeleton variant="rectangular" width="33%" height="16px" />
<Spinner size="sm" />
```

## Common Mistakes to Avoid

❌ Hardcoding values: `style="color: #10b981"`
✅ Use tokens: `class="text-success"`

❌ Non-semantic: `<div onclick="...">Submit</div>`
✅ Semantic: `<button type="submit">Submit</button>`

❌ Desktop-first: `@media (max-width: 768px)`
✅ Mobile-first: `class="text-sm md:text-base"`

❌ No labels: `<input placeholder="Name" />`
✅ With label: `<Label htmlFor="name">Name</Label><Input id="name" />`

❌ Color only: `<span class="text-red-500">Error</span>`
✅ Icon + text: `<TriangleAlert size={16} aria-hidden="true" /><span class="text-error">Error</span>`

❌ Custom icons: `<svg>...</svg>` or emoji
✅ Lucide icons: `<Plus size={20} />`

❌ **Use `btn btn-ghost` inside colored alerts** (`alert-error`, `alert-success`, `alert-info`) - ghost button has no visual boundary on colored backgrounds, failing WCAG SC 1.4.11 (Non-text Contrast ≥3:1 for interactive elements)
✅ **Use `underline font-bold` for secondary actions inside alerts** - underline is a universal interactive affordance that works on any alert color variant; keep underline on hover for discoverability

❌ **Use `@apply btn` in custom classes** - creates CSS cascade issues
✅ **Use DaisyUI classes directly**: `<button class="btn btn-accent">`

❌ **Hardcode sizes like `text-[10px]`** - breaks design system consistency
✅ **Use semantic classes**: `text-xs`, `text-sm`, `text-base`

❌ **Use `@xl:` container queries inside Card components** - Card.astro has no `@container`, queries resolve against page-level container. Use regular breakpoints (`xl:`) instead
❌ **Use `hoverable` on read-only Card components** - hover effect implies interactivity (clickable). Only use `hoverable` when the card triggers an action
❌ **Put title/description in ProtectedLayout header slot** - Header component renders title/subtitle from props. Slot is only for action buttons (refresh, export)
✅ **Add `data-testid` to major page sections and cards** - text-based locators break when heading text changes

❌ **Use responsive prefixes on custom CSS classes** (`md:rounded-card`, `lg:rounded-card-lg`) - Tailwind v4 only generates responsive variants for its own utilities, not custom classes defined in CSS
✅ **Use Tailwind utility equivalents**: `md:rounded-xl` (0.75rem = same as `--radius-card`), `rounded-card` is fine without responsive prefix

## Component Pattern

```astro
---
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

## Reference

For detailed patterns, see `design-system/` directory:

- `01-foundations.md` - Token details
- `02-components.md` - Component inventory
- `03-forms.md` - Form patterns
- `04-accessibility.md` - WCAG details
- `05-responsive.md` - Responsive patterns
- `06-data-visualization.md` - Charts, currency
- `07-patterns.md` - Page layouts
- `08-animations.md` - Animation patterns
