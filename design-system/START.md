# Design System

**Version:** 1.0.0 | **Framework:** Astro 5.x + Tailwind v4 + DaisyUI v5

## Quick Start

**Read this file first.** Consult other docs only when needed.

### ⚠️ Design System Migration

This guide reflects the **Oasis Finance** design system (v1.0.0).

**Source of truth:** `design-system/styles.json`

**Color system update:**

- **Primary:** `#0f172a` (slate-900) - main brand color, text, borders
- **Accent:** `#6366f1` (indigo-500) - interactive elements, CTAs, focus states
- **Success:** `#10b981` (emerald-500) - confirmations, positive states, IDR currency
- **Warning:** `#f59e0b` (amber-500) - budget alerts, caution states
- **Error:** `#f43f5e` (rose-500) - errors, over budget, danger states
- **Info:** `#6366f1` (indigo-500) - informational messages

See `styles.json` for complete token definitions and theme configurations.

### Core Rules

1. **Use design tokens** - Import from `@/lib/tokens` (never hardcode)
2. **DaisyUI first** - Use DaisyUI classes, then Tailwind. Use @design-system/daisyui-llm.md as reference.
3. **Accessibility required** - Keyboard nav + ARIA + contrast
4. **Mobile-first** - Base styles for mobile, enhance for desktop
5. **Server-side** - Astro components are SSR by default
6. **Modern HTML** - Use semantic elements (`<button>`, `<nav>`, `<main>`, `<section>`, `<article>`)
7. **Icons** - Use `@lucide/astro` for all icons (consistent, accessible)
8. **Animations** - Use `motion` for complex animations and transitions

**DaisyUI v5 Note:** Themes are configured using CSS `@plugin` syntax in `src/styles/globals.css`, not in `tailwind.config.ts`. See the DaisyUI theme configuration section for details.

### Import Tokens

```typescript
import { colors, fontSizes, spacing } from '@/lib/tokens';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercentage,
  formatCompactNumber,
} from '@/lib/formatting';
```

### Import Icons

```typescript
import { X, Plus, Edit, Trash2 } from '@lucide/astro';
```

### Import Animations

```typescript
import { animate } from 'motion';
```

## Token Quick Reference

### Colors

**Use DaisyUI semantic classes for theme compatibility:**

```typescript
// Primary color (slate) - headings, primary text, secondary buttons
colors.primary; // #0f172a (slate-900 - headings, text)
colors.primaryLight; // #f1f5f9 (slate-100 - backgrounds)

// Accent color (indigo) - CTAs, interactive elements, active states
colors.accent; // #6366f1 (indigo-500 - CTAs, interactive)
colors.accentHover; // #4f46e5 (indigo-600)

colors.warning; // #f59e0b (amber - budget alerts)
colors.error; // #f43f5e (rose - over budget)
colors.success; // #10b981 (emerald - confirmations)
colors.info; // #6366f1 (indigo - info)

colors.currency.idr; // #10b981 (emerald)
colors.currency.usd; // #3b82f6 (blue)

colors.status.ok; // #22c55e (<80%)
colors.status.warning; // #f59e0b (80-99%)
colors.status.danger; // #f43f5e (≥100%)
```

**DaisyUI Semantic Classes (automatically switch with light/dark theme):**

```typescript
'text-primary'; // Primary brand color (slate-900 light / slate-50 dark)
'text-accent'; // Accent color (indigo-500) - CTAs, interactive elements
'text-success'; // Success states (emerald-500) - confirmations, IDR
'text-warning'; // Warning states (amber-500) - budget alerts
'text-error'; // Error states (rose-500) - over budget, danger
'text-info'; // Info states (indigo-500) - informational

'bg-base-100'; // Base background
'bg-base-200'; // Elevated background (cards, inputs)
'bg-base-300'; // More elevated (hover states)
'text-base-content'; // Main text color (auto-adjusts with theme)
'border-base-300'; // Border color (theme-aware)
```

**Important Color Semantics:**

- Use `btn-accent` for primary CTAs (indigo interactive elements)
- Use `text-primary` for headings and primary text (slate)
- Use `focus:ring-accent` for focus states (indigo)
- Use DaisyUI semantic colors (`bg-base-200`, `border-base-300`) for theme-friendly styling

**Avoid Tailwind color names** (`text-slate-500`, `bg-gray-100`) - they don't change with themes.

### Typography

```typescript
// Accessibility-adjusted sizes (WCAG AA compliant minimums)
fontSizes.xs; // 0.75rem (12px) - labels, helper - minimum accessible size
fontSizes.sm; // 0.8125rem (13px) - body (small)
fontSizes.base; // 0.875rem (14px) - body (default) - accessible body text
fontSizes.md; // 0.9375rem (15px) - emphasized
fontSizes.lg; // 1rem (16px) - emphasized
fontSizes.xl; // 1.25rem (20px) - section headings
fontSizes['2xl']; // 1.5rem (24px) - page headings
fontSizes['3xl']; // 1.875rem (30px) - hero
```

### Spacing

```typescript
spacing.form; // 16px - form field gaps
spacing.card; // 24px - card padding
spacing.section; // 32px - section gaps
```

### Breakpoints

```typescript
sm: 640px   md: 768px   lg: 1024px   xl: 1280px   2xl: 1536px
```

### Utility Functions

```typescript
formatCurrency(150000, 'IDR'); // "Rp150.000"
formatCurrencyCompact(1500000, 'IDR'); // "Rp1.5M"
formatPercentage(85.5, 2); // "85.50%"
formatCompactNumber(1500000); // "1.5M"
getBudgetStatusClass(percentage); // 'status-ok' | 'status-warning' | 'status-danger'
```

## Component Pattern

```astro
---
/**
 * Component Name - Brief description
 * @param {string} variant - Description
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

## File Structure

```
design-system/
├── START.md              # ← You are here (read first)
├── 01-foundations.md     # Tokens, colors, typography, spacing
├── 02-components.md      # Button, Card, Input, Modal patterns
├── 03-forms.md           # Form controls, validation
├── 04-accessibility.md   # WCAG, keyboard, ARIA, screen readers
├── 05-responsive.md      # Mobile-first, breakpoints
├── 06-data-visualization.md # Currency, charts, tables
├── 07-patterns.md        # Layouts, navigation, lists
└── 08-animations.md      # Motion animation patterns
```

## When to Consult Docs

| Task                           | Read                     |
| ------------------------------ | ------------------------ |
| Need color/spacing/font values | 01-foundations.md        |
| Building Button/Card/Modal     | 02-components.md         |
| Creating forms                 | 03-forms.md              |
| Keyboard nav / ARIA            | 04-accessibility.md      |
| Responsive layout              | 05-responsive.md         |
| Display currency/charts        | 06-data-visualization.md |
| Dashboard/list page            | 07-patterns.md           |
| Complex animations             | 08-animations.md         |

## Essential Checklists

### Before Implementation

- [ ] Checked existing components first
- [ ] Imported design tokens from `@/lib/tokens`
- [ ] Planned component props and variants

## Common Patterns

### Icons (Lucide)

```astro
---
import { X, Plus, Edit, Trash2, Check, TriangleAlert } from '@lucide/astro';
---

<!-- Button with icon -->
<button class="btn btn-accent">
  <Plus size={20} class="stroke-current" aria-hidden="true" />
  <span>Add Transaction</span>
</button>

<!-- Icon button -->
<button class="btn btn-ghost btn-square" aria-label="Close">
  <X size={24} class="stroke-current" aria-hidden="true" />
</button>

<!-- Status with icon -->
<div class="flex items-center gap-2 text-success">
  <Check size={16} aria-hidden="true" />
  <span>Complete</span>
</div>

<!-- Alert with icon -->
<div class="alert alert-warning">
  <TriangleAlert size={20} class="shrink-0" aria-hidden="true" />
  <span>Budget limit reached</span>
</div>
```

### Animations (Motion)

```astro
---
// In client-side script
import { animate } from 'motion';
---

<script>
  // Fade in animation
  const element = document.querySelector('.fade-in');
  animate(element, { opacity: [0, 1] }, { duration: 0.3 });

  // Slide in from bottom
  const modal = document.querySelector('.modal');
  animate(modal, { y: [20, 0], opacity: [0, 1] }, { duration: 0.4 });

  // Stagger children
  const items = document.querySelectorAll('.list-item');
  items.forEach((item, index) => {
    animate(item, { opacity: [0, 1], y: [10, 0] }, { duration: 0.3, delay: index * 0.1 });
  });

  // Exit animation
  const dismissible = document.querySelector('.dismissible');
  animate(dismissible, { opacity: [1, 0], scale: [1, 0.95] }, { duration: 0.2 }).then(() =>
    dismissible.remove()
  );
</script>
```

### Responsive Grid

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
```

### Form Field

```astro
<div class="form-control">
  <Label htmlFor="name" required>Name</Label>
  <Input id="name" name="name" error={!!errors.name} errorMessage={errors.name} />
</div>
```

### Budget Status

```html
<span class="{getBudgetStatusClass(percentage)}">
  {percentage < 80 ? 'Under budget' : percentage < 100 ? 'Near limit' : 'Over budget'}
</span>
```

### Currency Display

```astro
<Currency amount={150000} currency="IDR" className="currency-idr" />
```

### Loading State

```html
<div class="animate-pulse">
  <div class="h-4 bg-neutral-200 rounded w-1/3"></div>
</div>
```

## DaisyUI Classes

```html
<!-- Buttons -->
<button class="btn btn-accent">Primary CTA</button>
<button class="btn btn-outline">Outline</button>

<!-- Inputs -->
<input class="input input-bordered" />

<!-- Cards -->
<div class="card card-bordered bg-base-100">
  <!-- Badges -->
  <span class="badge badge-primary">Badge</span>

  <!-- Alerts -->
  <div class="alert alert-warning">Warning</div>
</div>
```

## Accessibility Essentials

- **Semantic HTML**: Use `<button>`, `<nav>`, `<main>`, not `<div>`
- **Labels**: Every input needs `<label for="id">` or `aria-label`
- **Keyboard**: Tab to navigate, Enter/Space to activate, Esc to close
- **Focus**: Never remove outline without replacement
- **Contrast**: Text ≥4.5:1, UI ≥3:1
- **ARIA**: Use `aria-label`, `aria-describedby`, `role="alert"`
- **Touch**: Min 44x44px for mobile buttons

## Common Mistakes to Avoid

❌ Hardcoding values: `style="color: #10b981"`
✅ Use tokens: `class="text-primary"`

❌ Non-semantic: `<div onclick="...">Submit</div>`
✅ Semantic: `<button type="submit">Submit</button>`

❌ Non-semantic wrappers: `<div class="wrapper"><div class="content">...</div></div>`
✅ Modern HTML: `<section><article>...</article></section>`

❌ Desktop-first: `@media (max-width: 768px)`
✅ Mobile-first: `class="text-sm md:text-base"`

❌ No labels: `<input placeholder="Name" />`
✅ With label: `<Label htmlFor="name">Name</Label><Input id="name" />`

❌ Color only: `<span class="text-red-500">Error</span>`
✅ Icon + text: `<TriangleAlert size={16} aria-hidden="true" /><span class="text-error">Error</span>`

❌ Custom icons: `<svg>...</svg>` or emoji
✅ Lucide icons: `<Plus size={20} />`

❌ CSS transitions only: `transition: all 0.3s`
✅ Motion for complex: `animate(element, { scale: [1, 1.1] }, { duration: 0.2 })`

## Need More Details?

Consult the specific doc for your task from the file structure above. START.md covers 80% of daily use cases.
