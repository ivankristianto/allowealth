# Foundations

Visual building blocks. **Always import from `@/lib/tokens`** - never hardcode.

## Files

| File                    | Usage                         |
| ----------------------- | ----------------------------- |
| `src/lib/tokens.ts`     | Component logic, calculations |
| `src/styles/tokens.css` | CSS custom properties         |

## Colors

### Semantic Colors (v1.2.0 - Forest Green + Comfortable Dark)

```typescript
import { colors } from '@/lib/tokens';

// Primary color (slate) - headings, primary text, secondary buttons
colors.primary; // #0f172a (slate-900)
colors.primaryLight; // #f1f5f9 (slate-100)

// Accent color (forest green) - CTAs, interactive elements, active states
colors.accent; // #15803d (forest-700 - WCAG AA)
colors.accentHover; // #166534 (forest-800)

colors.warning; // #f59e0b (amber-500)
colors.error; // #f43f5e (rose-500)
colors.errorHover; // #e11d48 (rose-600)

colors.success; // #10b981 (emerald-500)
colors.info; // #0ea5e9 (sky-500)
```

**Color Semantic Model:**

| Usage         | Color   | Hex     | Semantic                   |
| ------------- | ------- | ------- | -------------------------- |
| Primary CTAs  | accent  | #15803d | forest-700 - CTAs, WCAG AA |
| Headings/text | primary | #0f172a | slate - headings, text     |
| Success       | success | #10b981 | emerald - positive status  |
| Warning       | warning | #f59e0b | amber - caution states     |
| Error         | error   | #f43f5e | rose - destructive actions |
| Info          | info    | #0ea5e9 | sky - informational        |

### Dark Mode Colors (v1.2.0 - Comfortable Dark)

Dark mode uses raised backgrounds, softer text, and desaturated accents for extended reading comfort.

**Base surfaces — visible 3-step elevation:**

| Token          | Hex       | Tailwind  | Role                          |
| -------------- | --------- | --------- | ----------------------------- |
| `base-100`     | `#111827` | gray-900  | Body, sidebar                 |
| `base-200`     | `#1e293b` | slate-800 | Cards, elevated surfaces      |
| `base-300`     | `#334155` | slate-700 | Borders, hover states         |
| `base-content` | `#cbd5e1` | slate-300 | Body text (~10:1 on base-100) |

**Text hierarchy:**

| Token          | Hex       | Contrast on base-100 | Role             |
| -------------- | --------- | -------------------- | ---------------- |
| `primary`      | `#e2e8f0` | ~12:1                | Headings         |
| `base-content` | `#cbd5e1` | ~10:1                | Body text        |
| `neutral`      | `#94a3b8` | ~6.5:1               | Secondary, muted |

**Semantic colors — dark mode adjusted:**

| Usage   | Color   | Hex       | Dark mode note                            |
| ------- | ------- | --------- | ----------------------------------------- |
| CTAs    | accent  | `#22c55e` | green-500 — desaturated from green-400    |
| Success | success | `#34d399` | emerald-400                               |
| Warning | warning | `#fbbf24` | amber-400                                 |
| Error   | error   | `#f87171` | red-400 — warmer, less pink than rose-400 |
| Info    | info    | `#38bdf8` | sky-400                                   |

**Design rationale:** Light mode colors use 500-700 level tokens for good contrast on white. Dark mode shifts to 400-500 level but desaturates where needed to avoid neon glare on near-black backgrounds. Surface stepping uses standard Tailwind gray/slate values proven at scale (GitHub, Linear, Vercel).

### Currency & Status

```typescript
colors.currency.idr; // #10b981 (emerald-500)
colors.currency.usd; // #0ea5e9 (sky-500)

colors.status.ok; // #22c55e (emerald-500, <80%)
colors.status.warning; // #f59e0b (amber-500, 80-99%)
colors.status.danger; // #f43f5e (rose-500, ≥100%)
```

### Neutral Scale (Slate)

```css
--color-slate-50: #f8fafc --color-slate-100: #f1f5f9 --color-slate-200: #e2e8f0
  --color-slate-300: #cbd5e1 --color-slate-400: #94a3b8 --color-slate-500: #64748b
  --color-slate-600: #475569 --color-slate-700: #334155 --color-slate-800: #1e293b
  --color-slate-900: #0f172a;
```

### Accent Scale (Forest Green)

```css
--color-forest-50: #f0fdf4;
--color-forest-100: #dcfce7;
--color-forest-400: #4ade80;
--color-forest-500: #22c55e;
--color-forest-600: #16a34a;
--color-forest-700: #15803d;
--color-forest-800: #166534;
```

### Info Scale (Sky)

```css
--color-sky-50: #f0f9ff;
--color-sky-400: #38bdf8;
--color-sky-500: #0ea5e9;
--color-sky-600: #0284c7;
```

### Error Scale (Rose)

```css
--color-rose-50: #fff1f2 --color-rose-100: #ffe4e6 --color-rose-500: #f43f5e
  --color-rose-600: #e11d48;
```

### Usage

```typescript
// JS/TS
import { colors } from '@/lib/tokens';
const statusColor = colors.status.danger;

// CSS
.element { color: var(--color-accent); }

// DaisyUI (preferred for theme-friendly styling)
<button class="btn btn-accent">
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
fonts.sans; // 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
fonts.mono; // 'SF Mono', Monaco, monospace (for currency)
```

**Note:** Inter font is loaded via Google Fonts CDN in `src/layouts/BaseLayout.astro` with `display=swap` for FOUT handling.

### Sizes (Readability-Adjusted Scale)

```typescript
fontSizes.xs; // 0.8125rem (13px) - minimum accessible size
fontSizes.sm; // 0.875rem  (14px) - body (small)
fontSizes.base; // 0.9375rem (15px) - accessible body text
fontSizes.md; // 1rem      (16px) - emphasized
fontSizes.lg; // 1.0625rem (17px) - emphasized
fontSizes.xl; // 1.25rem   (20px) - section headings
fontSizes['2xl']; // 1.5rem    (24px) - page headings
fontSizes['3xl']; // 1.875rem  (30px) - hero
fontSizes['4xl']; // 2.25rem   (36px) - display
fontSizes['5xl']; // 3rem      (48px) - display
fontSizes['6xl']; // 3.75rem   (60px) - display
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
spacing.cardLg; // 2rem (32px) - large card padding
spacing.section; // 2rem   (32px) - section gaps
spacing.form; // 1rem   (16px) - form field gaps
```

## Token Classes

```typescript
import { tokenClasses } from '@/lib/tokens';

const classes = `${tokenClasses.badgePadding} ${tokenClasses.textXs}`;
```

## Budget Status Mapping

```typescript
import { type BudgetStatus } from '@/lib/utils/budget';
import { toBudgetStatusClassName } from '@/lib/tokens';

const status: BudgetStatus = 'exceeded';
const className = toBudgetStatusClassName(status); // status-danger
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

## Animations (Framer Motion)

Use **framer-motion** for complex animations, interactive gestures, and orchestrated sequences. Use CSS transitions for simple hover/focus states.

### Basic Animations

```astro
---
import { motion } from 'framer-motion';
---

<!-- Fade in -->
<motion.div
  client:load
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

### Common Animation Patterns

```typescript
// Fade in
{ initial: { opacity: 0 }, animate: { opacity: 1 } }

// Slide up
{ initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 } }

// Scale in
{ initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 } }

// Slide from left
{ initial: { x: -20, opacity: 0 }, animate: { x: 0, opacity: 1 } }
```

### Stagger Children

```astro
<motion.ul
  client:load
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }}
>
  <motion.li variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
    Item 1
  </motion.li>
  <motion.li variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
    Item 2
  </motion.li>
</motion.ul>
```

### Exit Animations

```astro
<motion.div client:load exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
  Dismissible content
</motion.div>
```

### Gesture Animations

```astro
<motion.button
  client:load
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>
```

### Animation Timing

- **Fast** (150-200ms): Hover effects, small UI changes
- **Base** (300-400ms): Modals, dropdowns, tooltips
- **Slow** (500-600ms): Page transitions, complex sequences
- **Spring**: Interactive elements (buttons, cards)

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
