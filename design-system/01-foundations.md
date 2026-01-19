# Foundations

Visual building blocks. **Always import from `@/lib/tokens`** - never hardcode.

## Files

| File                    | Usage                         |
| ----------------------- | ----------------------------- |
| `src/lib/tokens.ts`     | Component logic, calculations |
| `src/styles/tokens.css` | CSS custom properties         |

## Colors

### Semantic Colors

```typescript
import { colors } from '@/lib/tokens';

colors.primary; // #10b981
colors.primaryHover; // #059669
colors.primaryLight; // #d1fae5

colors.warning; // #f59e0b
colors.warningHover; // #d97706

colors.error; // #ef4444
colors.errorHover; // #dc2626

colors.success; // #10b981
colors.info; // #3b82f6
```

### Currency & Status

```typescript
colors.currency.idr; // #10b981
colors.currency.usd; // #3b82f6

colors.status.ok; // #22c55e (<80%)
colors.status.warning; // #f59e0b (80-99%)
colors.status.danger; // #ef4444 (≥100%)
```

### Neutral Scale

```css
--color-neutral-50: #f9fafb --color-neutral-100: #f3f4f6 --color-neutral-200: #e5e7eb
  --color-neutral-300: #d1d5db --color-neutral-400: #9ca3af --color-neutral-500: #6b7280
  --color-neutral-600: #4b5563 --color-neutral-700: #374151 --color-neutral-800: #1f2937
  --color-neutral-900: #111827;
```

### Usage

```typescript
// JS/TS
import { colors } from '@/lib/tokens';
const statusColor = colors.status.danger;

// CSS
.element { color: var(--color-primary); }

// DaisyUI (preferred)
<button class="btn btn-primary">
<span class="text-success">
<span class="currency-idr">Rp 150.000</span>
<span class="status-warning">Near limit</span>
```

### Contrast Requirements (WCAG AA)

- Normal text: ≥4.5:1
- Large text: ≥3:1
- UI components: ≥3:1

## Typography

### Fonts

```typescript
fonts.sans; // 'system-ui, -apple-system, sans-serif'
fonts.mono; // 'SF Mono', Monaco, monospace (for currency)
```

### Sizes (Major Third scale 1.125)

```typescript
fontSizes.xs; // 0.75rem  (12px)
fontSizes.sm; // 0.875rem (14px)
fontSizes.base; // 1rem     (16px)
fontSizes.lg; // 1.125rem (18px)
fontSizes.xl; // 1.25rem  (20px)
fontSizes['2xl']; // 1.5rem   (24px)
fontSizes['3xl']; // 1.875rem (30px)
fontSizes['4xl']; // 2.25rem  (36px)
```

### Weights

```typescript
fontWeights.normal; // 400 - body text
fontWeights.medium; // 500 - emphasized
fontWeights.semibold; // 600 - headings, buttons
fontWeights.bold; // 700 - primary headings
```

### Line Heights

```css
--leading-tight: 1.25 /* headings */ --leading-normal: 1.5 /* body (default) */
  --leading-relaxed: 1.625 /* comfortable reading */;
```

### Classes

```html
<p class="text-sm md:text-base">Body text</p>
<h2 class="text-2xl font-semibold leading-tight">Heading</h2>
<span class="font-mono">$1,234.56</span>
```

## Spacing

### Scale (4px base)

```typescript
spacing.card; // 1.5rem (24px) - card padding
spacing.section; // 2rem   (32px) - section gaps
spacing.form; // 1rem   (16px) - form field gaps
```

### Full Scale

```css
--spacing-1: 0.25rem /* 4px */ --spacing-2: 0.5rem /* 8px */ --spacing-3: 0.75rem /* 12px */
  --spacing-4: 1rem /* 16px */ --spacing-6: 1.5rem /* 24px */ --spacing-8: 2rem /* 32px */
  --spacing-10: 2.5rem /* 40px */ --spacing-12: 3rem /* 48px */;
```

### Classes

```html
<Card className="p-6">
  <!-- 24px padding -->
  <div class="space-y-4">
    <!-- 16px vertical gap -->
    <section class="py-8 md:py-12"><!-- responsive padding --></section>
  </div></Card
>
```

## Shadows

```css
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1) --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
  /* default cards */ --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1) /* modals */ --shadow-xl: 0
  20px 25px -5px rgb(0 0 0 / 0.1) /* tooltips */;
```

```html
<Card className="shadow-md hover:shadow-lg transition-shadow"></Card>
```

## Border Radius

```css
--radius-md: 0.375rem /* 6px - default */ --radius-lg: 0.5rem /* 8px - cards, buttons */
  --radius-xl: 0.75rem /* 12px - large cards */ --radius-full: 9999px /* pills, avatars */;
```

## Z-Index

```css
--z-dropdown: 1000 --z-sticky: 1020 --z-fixed: 1030 --z-modal-backdrop: 1040 --z-modal: 1050
  --z-popover: 1060 --z-tooltip: 1070;
```

## Transitions

```typescript
transitions.fast; // 150ms - hover effects
transitions.base; // 200ms - default
transitions.slow; // 300ms - complex animations
```

```html
<button class="transition-colors duration-200 hover:bg-primary-hover"></button>
```

## Breakpoints

```typescript
breakpoints.sm; // 640px
breakpoints.md; // 768px
breakpoints.lg; // 1024px
breakpoints.xl; // 1280px
breakpoints['2xl']; // 1536px
```

```html
<div class="text-sm md:text-base lg:text-lg">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"></div>
</div>
```
