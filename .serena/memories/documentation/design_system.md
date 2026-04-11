# Design System

**Version:** 1.2.0 | **Framework:** Astro 6.x + Tailwind v4 + DaisyUI v5

## Source of Truth

- `design-system/styles.json` — all design tokens and theme config
- `design-system/daisyui-llm.md` — DaisyUI v5 component reference (use when building UI)
- `design-system/START.md` — READ FIRST before any UI work

## Color Tokens (v1.2.0 - Comfortable Dark)

- **Primary:** `#0f172a` (slate-900) — brand, text, borders
- **Accent:** `#15803d` (forest-700) — CTAs, interactive elements, focus states (WCAG AA)
- **Success:** `#10b981` (emerald-500) — confirmations, positive, IDR currency display
- **Warning:** `#f59e0b` (amber-500) — budget alerts, caution
- **Error:** `#f43f5e` (rose-500) — errors, over-budget, danger
- **Info:** `#0ea5e9` (sky-500) — informational (distinct from accent)

Dark mode: raised 3-step elevation (gray-900 → slate-800 → slate-700), reduced-glare text.

## Core Rules

1. **DaisyUI classes first** (`bg-base-200`, `btn-primary`) — not raw Tailwind colors (`bg-slate-100`)
2. **Design tokens** — import from `@/lib/tokens`, never hardcode hex values
3. **Icons** — `@lucide/astro` only (no custom SVG, no emojis)
4. **Animations** — `motion/mini` (not full `motion`, not CSS-only)
5. **Charts** — `@/lib/chart-setup` + `createChartLifecycle` (not `chart.js/auto`)
6. **Loading states** — `Skeleton` or `Spinner` component (not raw `animate-pulse`)
7. **Accessibility** — keyboard nav + ARIA + WCAG contrast required
8. **Mobile-first** — base styles for mobile, enhance for desktop

## Token Import

```typescript
import { colors, fontSizes, spacing, tokenClasses } from '@/lib/tokens';
import { formatCurrency, formatPercentage } from '@/lib/formatting';
```

## DaisyUI v5 Setup Note

Themes configured via CSS `@plugin` syntax in `src/styles/globals.css` — NOT in `tailwind.config.ts`.

## Design System Docs Index

| File                       | Contents                                             |
| -------------------------- | ---------------------------------------------------- |
| `START.md`                 | Quick start, core rules, component inventory         |
| `01-foundations.md`        | Tokens, colors, typography                           |
| `02-components.md`         | Full component inventory (atoms/molecules/organisms) |
| `03-forms.md`              | Form patterns                                        |
| `04-accessibility.md`      | WCAG compliance                                      |
| `05-responsive.md`         | Responsive/mobile patterns                           |
| `06-data-visualization.md` | Charts, currency display                             |
| `07-patterns.md`           | Page layouts                                         |
| `08-animations.md`         | Animation patterns                                   |
| `daisyui-llm.md`           | DaisyUI v5 component reference for LLMs              |
| `styles.json`              | All token values (source of truth)                   |
