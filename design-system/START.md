# Design System Documentation

**Version:** 1.0.0
**Last Updated:** 2026-01-19
**Framework:** Astro 5.x + Tailwind CSS v4 + DaisyUI v5

## Overview

This design system provides comprehensive guidelines for building consistent, accessible, and maintainable UI components for the Personal Finance Manager application. It is specifically tailored for **AI coding agents** to follow when implementing frontend features.

## Purpose

This documentation serves as:

1. **Single source of truth** for design decisions
2. **Reference guide** for implementing new components
3. **Quality checklist** for code reviews
4. **Consistency framework** to ensure unified UX across the application

## How to Use This Documentation

### For AI Coding Agents

**BEFORE implementing any UI component:**

1. **Read the relevant documentation** from the table of contents below
2. **Check existing components** in `src/components/` for patterns
3. **Use design tokens** from `src/lib/tokens.ts` (never hardcode values)
4. **Follow accessibility guidelines** - this is mandatory, not optional
5. **Test responsiveness** across breakpoints (sm, md, lg, xl, 2xl)

### Documentation Structure

This design system is organized into the following sections:

```
design-system/
├── START.md                    # ← You are here (index & usage guide)
├── 01-foundations.md           # Colors, typography, spacing, shadows, etc.
├── 02-components.md            # Component patterns & guidelines
├── 03-forms.md                 # Form controls & validation patterns
├── 04-accessibility.md         # A11y requirements & ARIA patterns
├── 05-responsive.md            # Breakpoints & responsive patterns
├── 06-data-visualization.md    # Charts, tables, currency displays
└── 07-patterns.md              # Common UI patterns & compositions
```

## Quick Reference

### Key Principles

1. **Use design tokens** - Import from `@/lib/tokens` (never hardcode)
2. **DaisyUI first** - Leverage DaisyUI classes before custom CSS
3. **Accessibility required** - Every component must be keyboard navigable with proper ARIA
4. **Mobile-first** - Design for small screens, enhance for larger
5. **Server-side rendering** - Astro components are server-rendered by default
6. **Semantic HTML** - Use appropriate HTML elements for their intended purpose

### Design Token Import

```typescript
import { colors, fontSizes, spacing, formatCurrency } from '@/lib/tokens';
```

### Color Palette (Quick Reference)

```typescript
Primary (Emerald):  #10b981  // Financial growth, CTAs
Warning (Amber):    #f59e0b  // Budget alerts, cautions
Error (Red):        #ef4444  // Over budget, errors
Success (Green):    #10b981  // Confirmations, positive actions
Info (Blue):        #3b82f6  // Neutral information
```

### Spacing Scale (Quick Reference)

```typescript
4px   → spacing-1      // Tight spacing
8px   → spacing-2      // Small spacing
16px  → spacing-4      // Form fields (--spacing-form)
24px  → spacing-6      // Card padding (--spacing-card)
32px  → spacing-8      // Section gaps (--spacing-section)
```

### Typography Scale (Quick Reference)

```typescript
12px → text-xs         // Small labels, helper text
14px → text-sm         // Body text (small)
16px → text-base       // Body text (default)
20px → text-xl         // Section headings
24px → text-2xl        // Page headings
36px → text-4xl        // Hero headings
```

## Common Patterns

### Component Structure

All Astro components should follow this structure:

```astro
---
/**
 * Component Name
 *
 * Brief description of what this component does.
 *
 * @param {string} variant - Description
 * @param {boolean} disabled - Description
 */

export interface Props {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

const { variant = 'primary', disabled = false, className = '' } = Astro.props;

// Build class strings using arrays + filter + join
const componentClasses = [
  'base-classes',
  variant === 'primary' && 'variant-classes',
  disabled && 'disabled-classes',
  className,
]
  .filter(Boolean)
  .join(' ');
---

<element class={componentClasses}>
  <slot />
</element>
```

### Responsive Classes

Use Tailwind's responsive prefixes:

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
</div>
```

### Accessibility Checklist

- [ ] Semantic HTML elements used correctly
- [ ] Interactive elements keyboard accessible (Tab, Enter, Space, Esc)
- [ ] ARIA attributes for dynamic content (`aria-label`, `aria-describedby`, `role`)
- [ ] Focus visible styles (`:focus-visible` outline)
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Form fields have associated labels (`<Label>` component or `aria-label`)
- [ ] Error states announced with `role="alert"`

## File Organization

### Component Hierarchy

```
src/components/
├── atoms/           # Basic building blocks (Button, Input, Badge)
├── molecules/       # Compound components (Modal, Toast, Form groups)
├── organisms/       # Complex compositions (TransactionList, SummaryCards)
└── layouts/         # Layout components (Header, Footer, Navigation)
```

### When to Create New Components

**Create a new component when:**

- The pattern is reused 3+ times
- The component has distinct behavior or state
- It improves code organization and maintainability

**Use inline markup when:**

- The pattern is used once or twice
- It's a simple wrapper without logic
- Creating a component would add unnecessary abstraction

## Currency & Number Formatting

### Always Use Utility Functions

```typescript
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/tokens';

// Currency formatting
formatCurrency(150000, 'IDR'); // → "Rp150.000"
formatCurrency(1500000, 'IDR', true); // → "Rp1.5M"
formatCurrency(99.99, 'USD'); // → "$99.99"

// Percentage formatting
formatPercentage(85.5, 2); // → "85.50%"
formatPercentage(85.5, 0); // → "86%"

// Compact numbers
formatCompactNumber(1500000); // → "1.5M"
formatCompactNumber(2500); // → "2.5K"
```

### Currency Colors

```html
<span class="currency-idr">Rp 150.000</span>
<!-- Green -->
<span class="currency-usd">$99.99</span>
<!-- Blue -->
```

### Budget Status Colors

```html
<span class="status-ok">Under budget</span>
<!-- Green: <80% -->
<span class="status-warning">Near budget</span>
<!-- Yellow: 80-99% -->
<span class="status-danger">Over budget</span>
<!-- Red: ≥100% -->
```

## Testing & Validation

### Pre-Implementation Checklist

- [ ] Read relevant design system documentation
- [ ] Check existing components for similar patterns
- [ ] Identify design tokens needed (colors, spacing, typography)
- [ ] Plan component props and variants
- [ ] Consider accessibility requirements

### Pre-Commit Checklist

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run format:fix` applied
- [ ] Component has proper TypeScript interfaces
- [ ] Accessibility tested (keyboard navigation)
- [ ] Responsive behavior verified
- [ ] Design tokens used (no hardcoded values)

## Getting Help

### Where to Look

1. **Existing components** - Check `src/components/` for similar patterns
2. **Design tokens** - Reference `src/lib/tokens.ts` and `src/styles/tokens.css`
3. **DaisyUI docs** - https://daisyui.com/components/
4. **Tailwind CSS docs** - https://tailwindcss.com/docs
5. **Astro docs** - https://docs.astro.build

### Common Issues

**Issue:** "Should I use a DaisyUI class or custom Tailwind classes?"
**Answer:** Prefer DaisyUI classes when available (btn, card, input, modal, etc.). Use custom Tailwind for one-off styling.

**Issue:** "What spacing value should I use?"
**Answer:** Use semantic presets: `--spacing-card` (24px), `--spacing-section` (32px), `--spacing-form` (16px)

**Issue:** "How do I handle dark mode?"
**Answer:** DaisyUI handles dark mode automatically. Use semantic color classes (text-base-content, bg-base-100) that adapt to theme.

**Issue:** "Should I create a new component or use existing ones?"
**Answer:** Check atoms → molecules → organisms. Compose existing components before creating new ones.

## Version History

- **1.0.0** (2026-01-19) - Initial design system documentation created

## Next Steps

1. **Read 01-foundations.md** to understand colors, typography, and spacing
2. **Read 02-components.md** for component patterns and best practices
3. **Read 03-forms.md** if implementing form controls
4. **Read 04-accessibility.md** for accessibility requirements (mandatory)
5. **Read 05-responsive.md** for responsive design patterns
6. **Read 06-data-visualization.md** for charts and financial data displays
7. **Read 07-patterns.md** for common UI patterns and compositions

---

**Remember:** This design system exists to help you build better, more consistent UIs. When in doubt, check existing components first, then consult this documentation.
