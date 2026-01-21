# Icon Migration Guide

**Version:** 1.0.0 | **Last Updated:** 2026-01-21

This guide documents the migration from the custom `Icon.astro` component to `@lucide/astro` icons. All icons in the application now use Lucide icons directly.

## Quick Reference

### Import Pattern

```astro
---
// Import the icons you need
import { X, Plus, Edit, Trash2, Check, TriangleAlert, Search, ChevronRight } from '@lucide/astro';
---
```

### Basic Usage

```astro
<!-- Icon with explicit size -->
<Plus size={20} />

<!-- Icon with classes for styling -->
<Check size={16} class="text-success" />

<!-- Decorative icon (not announced to screen readers) -->
<Search size={16} class="stroke-current" aria-hidden="true" />
```

## Size Conversion

### From Icon.astro Props

| Old Prop | New Value   | Example Usage                    |
| -------- | ----------- | -------------------------------- |
| `xs`     | `size={12}` | Compact badges, inline icons     |
| `sm`     | `size={16}` | Button icons, inline text icons  |
| `md`     | `size={20}` | Form field icons, card headers   |
| `lg`     | `size={24}` | Alert icons, modal headers       |
| `xl`     | `size={32}` | Empty states, hero illustrations |

### From Inline SVG Classes

| Tailwind Class | New Value   |
| -------------- | ----------- |
| `h-3 w-3`      | `size={12}` |
| `h-4 w-4`      | `size={16}` |
| `h-5 w-5`      | `size={20}` |
| `h-6 w-6`      | `size={24}` |
| `h-8 w-8`      | `size={32}` |

## Icon Name Mapping

The following table maps icon names from the old `Icon.astro` component to their Lucide equivalents.

| Old Icon Name     | Lucide Icon                 | Import                              |
| ----------------- | --------------------------- | ----------------------------------- |
| `arrow-left`      | `ArrowLeft`                 | `{ ArrowLeft }`                     |
| `arrow-right`     | `ArrowRight`                | `{ ArrowRight }`                    |
| `check`           | `Check`                     | `{ Check }`                         |
| `x`               | `X`                         | `{ X }`                             |
| `plus`            | `Plus`                      | `{ Plus }`                          |
| `minus`           | `Minus`                     | `{ Minus }`                         |
| `pencil`          | `Pencil` or `Edit`          | `{ Pencil }` or `{ Edit }`          |
| `trash`           | `Trash2`                    | `{ Trash2 }`                        |
| `ban`             | `Ban`                       | `{ Ban }`                           |
| `refresh`         | `RefreshCw`                 | `{ RefreshCw }`                     |
| `tag`             | `Tag`                       | `{ Tag }`                           |
| `search`          | `Search`                    | `{ Search }`                        |
| `calendar`        | `Calendar`                  | `{ Calendar }`                      |
| `chevron-down`    | `ChevronDown`               | `{ ChevronDown }`                   |
| `chevron-up`      | `ChevronUp`                 | `{ ChevronUp }`                     |
| `information`     | `Info`                      | `{ Info }`                          |
| `warning`         | `TriangleAlert`             | `{ TriangleAlert }`                 |
| `alert`           | `TriangleAlert`             | `{ TriangleAlert }`                 |
| `eye`             | `Eye` / `EyeOff`            | `{ Eye }` or `{ EyeOff }`           |
| `currency-dollar` | `DollarSign`                | `{ DollarSign }`                    |
| `home`            | `Home` or `LayoutDashboard` | `{ Home }` or `{ LayoutDashboard }` |
| `menu`            | `Menu`                      | `{ Menu }`                          |
| `list`            | `List`                      | `{ List }`                          |
| `download`        | `Download`                  | `{ Download }`                      |
| `credit-card`     | `CreditCard`                | `{ CreditCard }`                    |

**Note:** Some icons like `AlertTriangle`, `AlertCircle`, `XCircle`, and `CircleHelp` have been replaced with their non-deprecated equivalents: `TriangleAlert`, `CircleAlert`, `CircleX`, and `CircleInfo`.

## Migration Patterns

### Before: Icon Component

```astro
---
import Icon from '../atoms/Icon.astro';
---

<Icon name="plus" size="sm" />
<Icon name="warning" size="md" className="text-warning" />
<Icon name="x" size="lg" />
```

### After: Lucide Icons

```astro
---
import { Plus, TriangleAlert, X } from '@lucide/astro';
---

<Plus size={16} />
<TriangleAlert size={20} class="text-warning" aria-hidden="true" />
<X size={24} />
```

## Common Patterns

### Button with Icon

```astro
---
import { Plus } from '@lucide/astro';
---

<button class="btn btn-primary">
  <Plus size={20} class="stroke-current" aria-hidden="true" />
  <span>Add New</span>
</button>
```

### Icon-Only Button

```astro
---
import { X } from '@lucide/astro';
---

<!-- Always include aria-label for icon-only buttons -->
<button class="btn btn-ghost btn-circle" aria-label="Close dialog">
  <X size={16} class="stroke-current" aria-hidden="true" />
</button>
```

### Status Message with Icon

```astro
---
import { Check, TriangleAlert, CircleX } from '@lucide/astro';
---

<!-- Success -->
<div class="alert alert-success">
  <Check size={24} class="shrink-0" aria-hidden="true" />
  <span>Changes saved successfully</span>
</div>

<!-- Warning -->
<div class="alert alert-warning">
  <TriangleAlert size={24} class="shrink-0" aria-hidden="true" />
  <span>Budget limit approaching</span>
</div>

<!-- Error -->
<div class="alert alert-error">
  <CircleX size={24} class="shrink-0" aria-hidden="true" />
  <span>Failed to save changes</span>
</div>
```

### Password Toggle

```astro
---
import { Eye, EyeOff } from '@lucide/astro';
---

<button type="button" data-toggle-password aria-label="Toggle password visibility">
  <Eye size={20} class="stroke-current" data-eye-icon aria-hidden="true" />
  <EyeOff size={20} class="hidden stroke-current" data-eye-off-icon aria-hidden="true" />
</button>
```

### Navigation Icons

```astro
---
import { ChevronLeft, ChevronRight } from '@lucide/astro';
---

<!-- Navigation with text - no aria-label needed -->
<button>
  <ChevronLeft size={20} class="stroke-current" aria-hidden="true" />
  <span>Previous</span>
</button>

<button>
  <span>Next</span>
  <ChevronRight size={20} class="stroke-current" aria-hidden="true" />
</button>
```

## Accessibility Guidelines

### When to Use `aria-hidden`

```astro
<!-- Decorative icon: aria-hidden="true" (screen readers ignore it) -->
<Search size={16} class="stroke-current" aria-hidden="true" />

<!-- Icon with text: aria-hidden="true" (text provides context) -->
<button class="btn btn-primary">
  <Plus size={20} class="stroke-current" aria-hidden="true" />
  <span>Add Transaction</span>
</button>

<!-- Icon-only button: aria-hidden="true" on icon, aria-label on button -->
<button class="btn btn-ghost btn-circle" aria-label="Close modal">
  <X size={16} class="stroke-current" aria-hidden="true" />
</button>

<!-- Status icon with text: aria-hidden="true" on icon -->
<div class="flex items-center gap-2">
  <Check size={16} class="text-success" aria-hidden="true" />
  <span>Completed</span>
</div>
```

### Standard Icon Classes

| Purpose             | Classes                                     |
| ------------------- | ------------------------------------------- |
| Interactive buttons | `class="stroke-current"`                    |
| Flex layouts        | `class="shrink-0"`                          |
| Colored icons       | `class="text-primary"` (or text-error, etc) |
| Combined            | `class="stroke-current shrink-0"`           |

## Client-Side SVG Usage

When creating SVG elements dynamically in client-side JavaScript (where Astro components cannot be used), use Lucide icon paths directly:

```javascript
// Lucide X icon path
const xIconPath = 'M18 6 6 18m6-12-12 12'; // Two diagonal lines

// Create SVG element dynamically
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox', '0 0 24 24');
svg.setAttribute('class', 'shrink-0 h-4 w-4 stroke-current');
svg.setAttribute('fill', 'none');
svg.setAttribute('stroke-width', '2');
svg.setAttribute('stroke-linecap', 'round');
svg.setAttribute('stroke-linejoin', 'round');

const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('d', xIconPath);

svg.appendChild(path);
```

## Common Lucide Icon Paths

| Icon        | Path(s)                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| X           | `M18 6 6 18m6-12-12 12`                                                                          |
| Check       | `M20 6 9 17l-5-5`                                                                                |
| CircleX     | Circle: `M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10z` + X paths    |
| CircleCheck | Circle: `M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10z` + Check path |

## Migration Checklist

When migrating a component from `Icon.astro` to Lucide icons:

- [ ] Replace `import Icon from ...` with `import { ... } from '@lucide/astro'`
- [ ] Convert size props (`xs`, `sm`, `md`, `lg`, `xl`) to pixel values
- [ ] Add `aria-hidden="true"` to decorative icons
- [ ] Ensure icon-only buttons have `aria-label`
- [ ] Add `stroke-current` class for color inheritance
- [ ] Add `shrink-0` class for flex layout consistency
- [ ] Run quality gates: `bun run typecheck lint stylelint format:fix`

## Resources

- **Lucide Icon Gallery:** https://lucide.dev/icons/
- **Lucide Astro Documentation:** https://www.npmjs.com/package/@lucide/astro
- **Design System:** `design-system/02-components.md` - Icon section
- **Accessibility Guidelines:** `design-system/04-accessibility.md`

## Migration Summary

This migration was completed in 2026-01-21. The following changes were made:

- **44 files migrated** (24 using Icon.astro, 20 with inline SVGs)
- **Icon.astro component deleted** (along with Icon.stories.ts)
- **20 atomic components updated**
- **7 page files updated**
- **14 Storybook stories updated**
- **Comprehensive test coverage added** (behavior tests for all migrated components)

All quality gates pass and no deprecated icons remain in the codebase.
