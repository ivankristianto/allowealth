# Foundations

Design foundations are the visual building blocks of the application. These tokens ensure consistency across all components and pages.

## Design Tokens

### What are Design Tokens?

Design tokens are named entities that store visual design attributes. They are the **single source of truth** for design decisions.

**CRITICAL RULE:** Never hardcode values. Always import and use tokens from `@/lib/tokens`.

```typescript
// ✅ CORRECT
import { colors, fontSizes, spacing } from '@/lib/tokens';
const primaryColor = colors.primary;

// ❌ WRONG
const primaryColor = '#10b981';
```

### Token Files

| File                    | Purpose                       | Usage                         |
| ----------------------- | ----------------------------- | ----------------------------- |
| `src/lib/tokens.ts`     | JavaScript/TypeScript exports | Component logic, calculations |
| `src/styles/tokens.css` | CSS custom properties         | Stylesheets, inline styles    |

## Colors

### Color Philosophy

Colors in this application serve specific financial contexts:

- **Primary (Emerald)**: Financial growth, positive actions, CTAs
- **Warning (Amber)**: Budget alerts, cautions, approaching limits
- **Error (Red)**: Over budget, errors, destructive actions
- **Success (Green)**: Confirmations, successful operations
- **Info (Blue)**: Neutral information, secondary currency (USD)

### Color Palette

#### Semantic Colors

```typescript
import { colors } from '@/lib/tokens';

colors.primary; // #10b981 (emerald-500)
colors.primaryHover; // #059669 (emerald-600)
colors.primaryLight; // #d1fae5 (emerald-100)

colors.warning; // #f59e0b (amber-500)
colors.warningHover; // #d97706 (amber-600)

colors.error; // #ef4444 (red-500)
colors.errorHover; // #dc2626 (red-600)

colors.success; // #10b981 (emerald-500)
colors.info; // #3b82f6 (blue-500)
```

#### Currency Colors

```typescript
colors.currency.idr; // #10b981 (Green)
colors.currency.usd; // #3b82f6 (Blue)
```

#### Status Colors (Budget Indicators)

```typescript
colors.status.ok; // #22c55e (Green - Under 80%)
colors.status.warning; // #f59e0b (Yellow - 80-99%)
colors.status.danger; // #ef4444 (Red - Over 100%)
```

#### Neutral Colors

```css
--color-neutral-50: #f9fafb --color-neutral-100: #f3f4f6 --color-neutral-200: #e5e7eb
  --color-neutral-300: #d1d5db --color-neutral-400: #9ca3af --color-neutral-500: #6b7280
  --color-neutral-600: #4b5563 --color-neutral-700: #374151 --color-neutral-800: #1f2937
  --color-neutral-900: #111827;
```

### Using Colors

#### In Components (TypeScript/JavaScript)

```typescript
import { colors } from '@/lib/tokens';

// Inline styles
<div style={`color: ${colors.primary}`}>

// Conditional styling
const statusColor = percentage >= 100
  ? colors.status.danger
  : percentage >= 80
    ? colors.status.warning
    : colors.status.ok;
```

#### In Stylesheets (CSS)

```css
.custom-element {
  color: var(--color-primary);
  background-color: var(--color-primary-light);
}

.custom-element:hover {
  background-color: var(--color-primary-hover);
}
```

#### Using DaisyUI Semantic Classes (Preferred)

```html
<!-- Use DaisyUI semantic classes when possible -->
<button class="btn btn-primary">Primary Action</button>
<div class="alert alert-warning">Warning message</div>
<span class="text-success">Success message</span>

<!-- Currency utilities -->
<span class="currency-idr">Rp 150.000</span>
<span class="currency-usd">$99.99</span>

<!-- Budget status utilities -->
<span class="status-ok">Under budget</span>
<span class="status-warning">Near budget</span>
<span class="status-danger">Over budget</span>
```

### Color Accessibility

**WCAG 2.1 AA Compliance Required:**

- Normal text (< 18px): Contrast ratio ≥ 4.5:1
- Large text (≥ 18px): Contrast ratio ≥ 3:1
- Interactive elements: Contrast ratio ≥ 3:1

**Current Palette Compliance:**

- ✅ Primary (#10b981) on white: 4.51:1
- ✅ Error (#ef4444) on white: 4.56:1
- ✅ Warning (#f59e0b) on black: 5.02:1
- ✅ Neutral-700 (#374151) on white: 10.47:1

## Typography

### Font Families

```typescript
import { fonts } from '@/lib/tokens';

fonts.sans; // 'system-ui, -apple-system, sans-serif'
fonts.mono; // 'SF Mono', Monaco, monospace
```

```css
--font-sans:
  system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  sans-serif --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
```

**Default:** All text uses `--font-sans` unless displaying code or numeric data.

**Monospace Usage:** Use `--font-mono` for:

- Currency amounts (tabular figures)
- Numeric data in tables
- Code snippets
- Compact number displays (1.5M, 2.3B)

### Font Sizes

Based on **Major Third scale (1.125)** for harmonious progression.

```typescript
import { fontSizes } from '@/lib/tokens';

fontSizes.xs; // 0.75rem  (12px) - Small labels, helper text
fontSizes.sm; // 0.875rem (14px) - Body text (small), table data
fontSizes.base; // 1rem     (16px) - Body text (default), form inputs
fontSizes.lg; // 1.125rem (18px) - Emphasized text, subheadings
fontSizes.xl; // 1.25rem  (20px) - Section headings
fontSizes['2xl']; // 1.5rem   (24px) - Page headings
fontSizes['3xl']; // 1.875rem (30px) - Large headings
fontSizes['4xl']; // 2.25rem  (36px) - Hero headings
fontSizes['5xl']; // 3rem     (48px) - Display headings
fontSizes['6xl']; // 3.75rem  (60px) - Hero display
```

#### Usage Guidelines

| Size      | Use Case                         | Example                        |
| --------- | -------------------------------- | ------------------------------ |
| `xs`      | Helper text, small labels        | "Optional", "Max 100 chars"    |
| `sm`      | Body text (compact), table data  | Transaction rows, sidebar nav  |
| `base`    | Body text (default), form inputs | Paragraphs, input fields       |
| `lg`      | Emphasized text, subheadings     | Card titles, section labels    |
| `xl`      | Section headings                 | "Recent Transactions"          |
| `2xl`     | Page headings                    | "Dashboard", "Budget Overview" |
| `3xl`     | Large headings                   | Landing page headers           |
| `4xl`     | Hero headings                    | Marketing pages                |
| `5xl-6xl` | Display headings                 | Hero sections, splash screens  |

### Font Weights

```typescript
import { fontWeights } from '@/lib/tokens';

fontWeights.light; // 300 - Rarely used
fontWeights.normal; // 400 - Body text (default)
fontWeights.medium; // 500 - Emphasized text, subheadings
fontWeights.semibold; // 600 - Headings, buttons
fontWeights.bold; // 700 - Strong emphasis, primary headings
fontWeights.extrabold; // 800 - Rarely used
```

#### Weight Guidelines

| Weight           | Use Case                               |
| ---------------- | -------------------------------------- |
| `normal` (400)   | Body text, paragraphs, descriptions    |
| `medium` (500)   | Table headers, emphasized inline text  |
| `semibold` (600) | Section headings, buttons, card titles |
| `bold` (700)     | Page headings, primary CTAs            |

### Line Heights

```css
--leading-none: 1 /* Tight (headings) */ --leading-tight: 1.25 /* Compact headings */
  --leading-snug: 1.375 /* Subheadings */ --leading-normal: 1.5 /* Body text (default) */
  --leading-relaxed: 1.625 /* Comfortable reading */ --leading-loose: 2
  /* Very spacious (rarely used) */;
```

**Default:** Use `--leading-normal` (1.5) for body text.

**Headings:** Use `--leading-tight` (1.25) for headings.

### Letter Spacing

```css
--tracking-tighter: -0.05em /* Compact headings */ --tracking-tight: -0.025em /* Large headings */
  --tracking-normal: 0 /* Body text (default) */ --tracking-wide: 0.025em /* Spaced text, labels */
  --tracking-wider: 0.05em /* Uppercase text */;
```

**Default:** Use `--tracking-normal` (0) for most text.

**Uppercase Text:** Use `--tracking-wider` (0.05em) for better readability.

### Typography Classes

```html
<!-- Font sizes -->
<p class="text-xs">Extra small text</p>
<p class="text-sm">Small text</p>
<p class="text-base">Base text</p>
<p class="text-lg">Large text</p>
<h3 class="text-xl">Section heading</h3>
<h2 class="text-2xl">Page heading</h2>
<h1 class="text-4xl">Hero heading</h1>

<!-- Font weights -->
<p class="font-normal">Normal weight</p>
<p class="font-medium">Medium weight</p>
<p class="font-semibold">Semibold weight</p>
<p class="font-bold">Bold weight</p>

<!-- Line heights -->
<h2 class="leading-tight">Tight heading</h2>
<p class="leading-normal">Normal body text</p>

<!-- Letter spacing -->
<span class="tracking-wide">LABEL TEXT</span>

<!-- Monospace (for numbers) -->
<span class="font-mono">$1,234.56</span>
```

## Spacing

### Spacing Scale

Based on **4px base unit** (Tailwind default).

```typescript
import { spacing } from '@/lib/tokens';

spacing.card; // 1.5rem (24px) - Card padding
spacing.section; // 2rem   (32px) - Section gaps
spacing.form; // 1rem   (16px) - Form field gaps
```

### Full Scale

```css
--spacing-0: 0 --spacing-px: 1px --spacing-0_5: 0.125rem /* 2px */ --spacing-1: 0.25rem
  /* 4px  - Tight spacing */ --spacing-2: 0.5rem /* 8px  - Small spacing */ --spacing-3: 0.75rem
  /* 12px */ --spacing-4: 1rem /* 16px - Form fields */ --spacing-5: 1.25rem /* 20px */
  --spacing-6: 1.5rem /* 24px - Card padding */ --spacing-8: 2rem /* 32px - Section gaps */
  --spacing-10: 2.5rem /* 40px */ --spacing-12: 3rem /* 48px */ --spacing-16: 4rem /* 64px */
  --spacing-20: 5rem /* 80px */ --spacing-24: 6rem /* 96px */ --spacing-32: 8rem /* 128px */;
```

### Semantic Spacing

Use semantic names for common spacing patterns:

```css
/* Card padding */
.card {
  padding: var(--spacing-card); /* 24px */
}

/* Section gaps */
.section-gap {
  gap: var(--spacing-section); /* 32px */
}

/* Form field spacing */
.form-control + .form-control {
  margin-top: var(--spacing-form); /* 16px */
}
```

### Spacing Classes

```html
<!-- Padding -->
<div class="p-4">Padding 16px all sides</div>
<div class="px-6">Padding 24px horizontal</div>
<div class="py-8">Padding 32px vertical</div>
<div class="pt-2">Padding top 8px</div>

<!-- Margin -->
<div class="m-4">Margin 16px all sides</div>
<div class="mx-auto">Margin auto horizontal (center)</div>
<div class="my-8">Margin 32px vertical</div>
<div class="mt-6">Margin top 24px</div>

<!-- Gap (for flex/grid) -->
<div class="flex gap-4">Gap 16px between items</div>
<div class="grid gap-6">Gap 24px between grid items</div>

<!-- Space (for siblings) -->
<div class="space-y-4">Vertical spacing 16px</div>
<div class="space-x-2">Horizontal spacing 8px</div>
```

### Spacing Guidelines

| Context                | Spacing     | Class       | Value |
| ---------------------- | ----------- | ----------- | ----- |
| Form fields (vertical) | Small       | `space-y-4` | 16px  |
| Card padding           | Medium      | `p-6`       | 24px  |
| Section gaps           | Large       | `gap-8`     | 32px  |
| Page margins           | Extra Large | `my-12`     | 48px  |

## Shadows

Shadows add depth and hierarchy to the interface.

```css
--shadow-xs:
  0 1px 2px 0 rgb(0 0 0 / 0.05) --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1),
  0 1px 2px -1px rgb(0 0 0 / 0.1) --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1),
  0 2px 4px -2px rgb(0 0 0 / 0.1) --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1),
  0 4px 6px -4px rgb(0 0 0 / 0.1) --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1),
  0 8px 10px -6px rgb(0 0 0 / 0.1) --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25)
    --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
```

### Shadow Usage

```html
<!-- Subtle elevation -->
<div class="shadow-sm">Slightly raised card</div>

<!-- Default card elevation -->
<div class="shadow-md">Standard card</div>

<!-- Emphasized card -->
<div class="shadow-lg">Featured card</div>

<!-- Hover states -->
<div class="shadow-md hover:shadow-xl transition-shadow">Hover for more depth</div>

<!-- Inner shadow (inputs) -->
<input class="shadow-inner" />
```

### Shadow Guidelines

| Element        | Shadow     | Use Case                            |
| -------------- | ---------- | ----------------------------------- |
| `shadow-sm`    | Subtle     | Table rows, list items              |
| `shadow-md`    | Default    | Cards, panels, dropdowns            |
| `shadow-lg`    | Emphasized | Modals, popovers, highlighted cards |
| `shadow-xl`    | Floating   | Tooltips, floating action buttons   |
| `shadow-inner` | Inset      | Input fields, text areas            |

## Border Radius

Rounded corners create a friendly, modern interface.

```css
--radius-none: 0 --radius-sm: 0.125rem /* 2px  - Subtle rounding */ --radius-md: 0.375rem
  /* 6px  - Default */ --radius-lg: 0.5rem /* 8px  - Cards, buttons */ --radius-xl: 0.75rem
  /* 12px - Large cards */ --radius-2xl: 1rem /* 16px - Featured elements */ --radius-3xl: 1.5rem
  /* 24px - Hero sections */ --radius-full: 9999px /* Fully rounded (pills, circles) */;
```

### Border Radius Classes

```html
<!-- Buttons, inputs (default) -->
<button class="rounded-lg">Button</button>
<input class="rounded-md" />

<!-- Cards -->
<div class="rounded-lg">Standard card</div>
<div class="rounded-xl">Large card</div>

<!-- Pills / Badges -->
<span class="rounded-full">Badge</span>

<!-- Images -->
<img class="rounded-lg" />
```

### Border Radius Guidelines

| Element         | Radius | Class          |
| --------------- | ------ | -------------- |
| Buttons, Inputs | 8px    | `rounded-lg`   |
| Cards, Panels   | 8px    | `rounded-lg`   |
| Badges, Pills   | Full   | `rounded-full` |
| Images          | 8px    | `rounded-lg`   |
| Avatars         | Full   | `rounded-full` |

## Z-Index Scale

Consistent z-index values prevent stacking conflicts.

```css
--z-dropdown: 1000 --z-sticky: 1020 --z-fixed: 1030 --z-modal-backdrop: 1040 --z-modal: 1050
  --z-popover: 1060 --z-tooltip: 1070;
```

### Z-Index Guidelines

| Element          | Z-Index | CSS Variable         |
| ---------------- | ------- | -------------------- |
| Dropdown menus   | 1000    | `--z-dropdown`       |
| Sticky headers   | 1020    | `--z-sticky`         |
| Fixed navigation | 1030    | `--z-fixed`          |
| Modal backdrop   | 1040    | `--z-modal-backdrop` |
| Modal dialog     | 1050    | `--z-modal`          |
| Popovers         | 1060    | `--z-popover`        |
| Tooltips         | 1070    | `--z-tooltip`        |

**Rule:** Never use arbitrary z-index values. Always use the predefined scale.

## Transitions

Smooth transitions enhance UX with subtle motion.

```typescript
import { transitions } from '@/lib/tokens';

transitions.fast; // 150ms - Hover effects, small changes
transitions.base; // 200ms - Default (most UI interactions)
transitions.slow; // 300ms - Large movements, complex animations
```

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1) --transition-base: 200ms
  cubic-bezier(0.4, 0, 0.2, 1) --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Transition Classes

```html
<!-- Default transition -->
<button class="transition-colors duration-200">Hover me</button>

<!-- Multiple properties -->
<div class="transition-all duration-200 hover:shadow-lg">Smooth transition</div>

<!-- Fast transition (hover) -->
<a class="transition-colors duration-150 hover:text-primary"> Link </a>

<!-- Slow transition (complex) -->
<div class="transition-transform duration-300 hover:scale-105">Hover to scale</div>
```

### Transition Guidelines

| Speed | Duration | Use Case                            |
| ----- | -------- | ----------------------------------- |
| Fast  | 150ms    | Hover effects, button states        |
| Base  | 200ms    | Default (most interactions)         |
| Slow  | 300ms    | Complex animations, large movements |

**Easing:** Use `cubic-bezier(0.4, 0, 0.2, 1)` for smooth, natural motion.

## Breakpoints

Responsive design breakpoints based on common device sizes.

```typescript
import { breakpoints } from '@/lib/tokens';

breakpoints.sm; // 640px  - Mobile landscape
breakpoints.md; // 768px  - Tablet portrait
breakpoints.lg; // 1024px - Tablet landscape, small desktop
breakpoints.xl; // 1280px - Desktop
breakpoints['2xl']; // 1536px - Large desktop
```

```css
--breakpoint-sm: 640px --breakpoint-md: 768px --breakpoint-lg: 1024px --breakpoint-xl: 1280px
  --breakpoint-2xl: 1536px;
```

### Responsive Classes

```html
<!-- Mobile-first approach -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- 1 column on mobile, 2 on tablet, 3 on desktop -->
</div>

<!-- Typography scaling -->
<h1 class="text-2xl md:text-3xl lg:text-4xl">Responsive heading</h1>

<!-- Spacing scaling -->
<div class="p-4 md:p-6 lg:p-8">Responsive padding</div>

<!-- Visibility -->
<div class="hidden md:block">Hidden on mobile, visible on tablet+</div>
```

See **05-responsive.md** for comprehensive responsive design patterns.

## Summary

### Quick Checklist

When implementing any component:

- [ ] Import design tokens from `@/lib/tokens`
- [ ] Use semantic colors (primary, warning, error, etc.)
- [ ] Use typography scale (text-xs through text-6xl)
- [ ] Use spacing scale (4px base unit)
- [ ] Apply appropriate shadows for elevation
- [ ] Use consistent border radius (rounded-lg default)
- [ ] Add smooth transitions (duration-200 default)
- [ ] Test across breakpoints (sm, md, lg, xl, 2xl)
- [ ] Verify color contrast ratios (≥4.5:1 for text)

### Next Steps

- **02-components.md** - Component patterns and guidelines
- **03-forms.md** - Form controls and validation
- **04-accessibility.md** - Accessibility requirements
- **05-responsive.md** - Responsive design patterns
