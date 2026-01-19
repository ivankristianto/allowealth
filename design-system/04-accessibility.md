# Accessibility

WCAG 2.1 AA compliance is **mandatory**.

## Core Requirements

1. **Semantic HTML** - Use correct elements (`<button>`, `<nav>`, `<main>`)
2. **Keyboard navigation** - All functionality via keyboard
3. **Screen reader support** - Proper ARIA attributes
4. **Visual accessibility** - Contrast ≥4.5:1, readable text

## Semantic HTML

```html
✅ <button onclick="submit()">Submit</button> ❌
<div onclick="submit()">Submit</div>

✅
<nav><a href="/">Home</a></nav>
❌
<div class="nav"><span onclick="goHome()">Home</span></div>

✅
<main>
  <h1>Page Title</h1>
  <section>...</section>
</main>
❌
<div class="main"><div class="title">Page Title</div></div>
```

### Heading Hierarchy

```html
<h1>Page Title</h1>
<!-- One per page -->
<h2>Section</h2>
<h3>Subsection</h3>
<h2>Section</h2>
```

## Keyboard Navigation

**Required keys:**

- **Tab** - Next element
- **Shift+Tab** - Previous element
- **Enter** - Activate button/link
- **Space** - Toggle checkbox/button
- **Esc** - Close modal
- **Arrow keys** - Navigate menus/radios

### Focus Styles

```css
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

**Never remove focus without replacement.**

### Skip Link

```html
<a href="#main-content" class="skip-link">Skip to main content</a>

<main id="main-content" tabindex="-1"></main>
```

## ARIA Attributes

### Labels

```astro
---
import { X } from '@lucide/astro';
---

<!-- Invisible label -->
<button aria-label="Close modal">
  <X size={24} />
</button>

<!-- Reference visible label -->
<h2 id="dialog-title">Confirm</h2>
<div role="dialog" aria-labelledby="dialog-title">
  <!-- Description -->
  <input id="password" aria-describedby="password-hint" />
  <span id="password-hint">Min 8 characters</span>
</div>
```

### States

```html
<!-- Expanded/collapsed -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<div id="menu" hidden></div>

<!-- Selected -->
<div role="option" aria-selected="true">Option 1</div>

<!-- Invalid -->
<input aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Invalid email</span>
```

### Live Regions

```html
<!-- Announce updates -->
<div role="alert">Error message</div>
<div role="status">Loading...</div>
<div aria-live="polite">5 new messages</div>
```

## Common Patterns

### Modal

```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Action</h2>
  ...
</div>
```

### Form Field

```html
<label for="email">Email <span class="text-error">*</span></label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
  aria-invalid="{!!errors.email}"
  aria-describedby="email-error"
/>
<span id="email-error" class="text-error" role="alert">{errors.email}</span>
```

## Color Contrast

**WCAG AA:**

- Normal text: ≥4.5:1
- Large text: ≥3:1
- UI components: ≥3:1

**Don't rely on color alone** - use icons, text, patterns.

```astro
---
import { AlertCircle, Check, Info } from '@lucide/astro';
---

✅ Good - Icon + text + color
<div class="flex items-center gap-2 text-error">
  <AlertCircle size={16} />
  <span>Error occurred</span>
</div>

<div class="flex items-center gap-2 text-success">
  <Check size={16} />
  <span>Success</span>
</div>

❌ Bad - Color only
<span class="text-error">Error occurred</span>
```

## Touch Targets

Minimum **44x44px** on mobile.

```astro
---
import { X } from '@lucide/astro';
---

<button class="btn min-h-[44px]">Submit</button>
<button class="btn-square w-11 h-11" aria-label="Close">
  <X size={24} />
</button>
```

## Testing

**Keyboard:** Tab through page, activate with Enter/Space, close with Esc
**Screen reader:** VoiceOver (macOS) or NVDA (Windows)
**Tools:** Lighthouse, axe DevTools

## Checklist

- [ ] Semantic HTML elements
- [ ] One `<h1>` per page, logical hierarchy
- [ ] Keyboard accessible (Tab, Enter, Space, Esc)
- [ ] Visible focus indicators
- [ ] All inputs have labels
- [ ] Error messages have `role="alert"`
- [ ] Color contrast ≥4.5:1
- [ ] Touch targets ≥44px on mobile
- [ ] Tested with keyboard only
- [ ] Tested with screen reader
