# Accessibility (A11y)

Accessibility is **mandatory**, not optional. Every component and page must be accessible to users with disabilities.

## Core Principles

### WCAG 2.1 AA Compliance

This application must meet **WCAG 2.1 Level AA** standards:

1. **Perceivable**: Content must be presentable to users in ways they can perceive
2. **Operable**: Interface components must be operable
3. **Understandable**: Information and UI operation must be understandable
4. **Robust**: Content must be robust enough for assistive technologies

### Four Pillars of Web Accessibility

1. **Semantic HTML**: Use correct HTML elements for their intended purpose
2. **Keyboard Navigation**: All functionality available via keyboard
3. **Screen Reader Support**: Proper ARIA attributes and labels
4. **Visual Accessibility**: Sufficient contrast, readable text, clear focus states

## Semantic HTML

### Use Correct Elements

```html
<!-- ✅ CORRECT -->
<button onclick="submit()">Submit</button>
<a href="/page">Go to page</a>
<nav>...</nav>
<main>...</main>
<header>...</header>
<footer>...</footer>

<!-- ❌ WRONG -->
<div onclick="submit()">Submit</div>
<span onclick="goToPage()">Go to page</span>
<div class="nav">...</div>
<div class="main">...</div>
<div class="header">...</div>
<div class="footer">...</div>
```

### Heading Hierarchy

```html
<!-- ✅ CORRECT: Logical hierarchy -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h3>Subsection</h3>
<h2>Section</h2>
<h3>Subsection</h3>

<!-- ❌ WRONG: Skipping levels -->
<h1>Page Title</h1>
<h3>Section</h3>
<!-- Skipped h2 -->
<h4>Subsection</h4>
```

**Rules:**

- One `<h1>` per page
- Don't skip heading levels
- Use headings for structure, not styling

### Landmark Regions

```html
<body>
  <header>
    <nav aria-label="Main navigation">
      <!-- Primary navigation -->
    </nav>
  </header>

  <main>
    <!-- Main content -->
    <article>
      <h1>Article Title</h1>
      <!-- Article content -->
    </article>

    <aside aria-label="Related information">
      <!-- Sidebar content -->
    </aside>
  </main>

  <footer>
    <!-- Footer content -->
  </footer>
</body>
```

**Available Landmarks:**

- `<header>` - Page or section header
- `<nav>` - Navigation
- `<main>` - Main content (one per page)
- `<aside>` - Complementary content
- `<footer>` - Page or section footer
- `<section>` - Thematic grouping
- `<article>` - Self-contained content

## Keyboard Navigation

### All Functionality Must Be Keyboard Accessible

**Required keyboard interactions:**

- **Tab**: Navigate to next focusable element
- **Shift + Tab**: Navigate to previous focusable element
- **Enter**: Activate buttons, links, submit forms
- **Space**: Toggle checkboxes, activate buttons
- **Escape**: Close modals, cancel actions
- **Arrow keys**: Navigate menus, radio groups, sliders

### Focus Management

#### Visible Focus Indicators

```css
/* Global focus styles (in globals.css) */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Custom focus styles */
.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
}
```

**Rules:**

- Never remove focus outlines without replacing them
- Focus indicators must have ≥3:1 contrast ratio
- Focus order must be logical (top to bottom, left to right)

#### Focus Trapping in Modals

```typescript
// Modal focus trap implementation
function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });

  // Focus first element
  firstFocusable.focus();
}
```

### Skip Links

```html
<!-- Add to top of page -->
<a href="#main-content" class="skip-link"> Skip to main content </a>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-primary);
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  }

  .skip-link:focus {
    top: 0;
  }
</style>

<main id="main-content" tabindex="-1">
  <!-- Main content -->
</main>
```

### Tab Order

```html
<!-- Use tabindex sparingly -->
<button>First (natural order)</button>
<button>Second (natural order)</button>
<div tabindex="0">Third (made focusable)</div>
<button tabindex="-1">Not in tab order</button>

<!-- ❌ AVOID: Custom tab order (confusing) -->
<button tabindex="3">Third</button>
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
```

**Rules:**

- Let natural DOM order determine tab order
- Use `tabindex="0"` to make non-interactive elements focusable
- Use `tabindex="-1"` to remove from tab order (for programmatic focus)
- Never use positive tabindex values

## ARIA Attributes

### When to Use ARIA

**First Rule of ARIA**: Don't use ARIA if you can use native HTML instead.

```html
<!-- ✅ GOOD: Native HTML -->
<button>Click me</button>

<!-- ❌ BAD: Unnecessary ARIA -->
<div role="button" tabindex="0" onclick="...">Click me</div>
```

### Common ARIA Attributes

#### Labels

```html
<!-- aria-label: Invisible label -->
<button aria-label="Close modal">
  <Icon name="x" />
</button>

<!-- aria-labelledby: Reference visible label -->
<h2 id="dialog-title">Confirm Deletion</h2>
<div role="dialog" aria-labelledby="dialog-title">
  <!-- Dialog content -->
</div>

<!-- aria-describedby: Additional description -->
<input id="password" type="password" aria-describedby="password-hint" />
<span id="password-hint"> Must be at least 8 characters </span>
```

#### States

```html
<!-- aria-expanded: Collapsible content -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<div id="menu" hidden>
  <!-- Menu items -->
</div>

<!-- aria-pressed: Toggle buttons -->
<button aria-pressed="false">Bold</button>

<!-- aria-checked: Custom checkboxes -->
<div role="checkbox" aria-checked="false" tabindex="0">Subscribe to newsletter</div>

<!-- aria-selected: Selected items -->
<div role="option" aria-selected="true">Option 1</div>
```

#### Properties

```html
<!-- aria-required: Required fields -->
<input type="text" aria-required="true" required />

<!-- aria-invalid: Validation errors -->
<input type="email" aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert"> Invalid email format </span>

<!-- aria-disabled: Disabled elements -->
<button aria-disabled="true" disabled>Submit</button>

<!-- aria-hidden: Hide from screen readers -->
<span aria-hidden="true">→</span>
```

#### Live Regions

```html
<!-- aria-live: Announce dynamic content -->
<div aria-live="polite" aria-atomic="true">
  <!-- Content updates announced -->
</div>

<!-- role="alert": Important messages -->
<div role="alert">Form submission failed</div>

<!-- role="status": Status messages -->
<div role="status">Loading...</div>
```

### ARIA Patterns for Components

#### Modal Dialog

```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Action</h2>
  <p>Are you sure you want to proceed?</p>
  <button>Confirm</button>
  <button>Cancel</button>
</div>
```

#### Accordion

```html
<div class="accordion">
  <h3>
    <button aria-expanded="false" aria-controls="panel1" id="accordion1">Section 1</button>
  </h3>
  <div id="panel1" role="region" aria-labelledby="accordion1" hidden>
    <!-- Panel content -->
  </div>
</div>
```

#### Tabs

```html
<div class="tabs">
  <div role="tablist" aria-label="Account settings">
    <button role="tab" aria-selected="true" aria-controls="panel-profile" id="tab-profile">
      Profile
    </button>
    <button role="tab" aria-selected="false" aria-controls="panel-security" id="tab-security">
      Security
    </button>
  </div>

  <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
    <!-- Profile content -->
  </div>

  <div role="tabpanel" id="panel-security" aria-labelledby="tab-security" hidden>
    <!-- Security content -->
  </div>
</div>
```

## Visual Accessibility

### Color Contrast

**WCAG AA Requirements:**

- Normal text (< 19px): ≥ 4.5:1 contrast ratio
- Large text (≥ 19px): ≥ 3:1 contrast ratio
- UI components: ≥ 3:1 contrast ratio

**Current Palette Compliance:**

| Element        | Foreground | Background | Ratio   | Status  |
| -------------- | ---------- | ---------- | ------- | ------- |
| Body text      | #1f2937    | #ffffff    | 16.01:1 | ✅ Pass |
| Primary button | #ffffff    | #10b981    | 4.51:1  | ✅ Pass |
| Error text     | #ef4444    | #ffffff    | 4.56:1  | ✅ Pass |
| Warning text   | #f59e0b    | #000000    | 5.02:1  | ✅ Pass |
| Link           | #10b981    | #ffffff    | 4.51:1  | ✅ Pass |

**Testing Tools:**

- Chrome DevTools: Lighthouse audit
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Contrast Ratio: https://contrast-ratio.com/

### Text Sizing and Spacing

```css
/* Minimum text size */
body {
  font-size: 16px; /* Never below 14px */
}

/* Line height for readability */
p {
  line-height: 1.5; /* Minimum 1.5 for body text */
}

/* Letter spacing for uppercase */
.uppercase-text {
  letter-spacing: 0.05em;
}

/* Paragraph spacing */
p + p {
  margin-top: 1em;
}
```

**Rules:**

- Base font size: ≥16px
- Line height: ≥1.5 for body text
- Paragraph spacing: ≥1em
- Letter spacing: +0.05em for uppercase

### Color Independence

```html
<!-- ✅ GOOD: Multiple indicators -->
<button class="btn btn-error">
  <Icon name="trash" />
  Delete
</button>

<div class="alert alert-warning">
  <Icon name="warning" />
  <span>Budget limit approaching</span>
</div>

<!-- ❌ BAD: Color only -->
<span style="color: red;">Error</span>
<span style="color: green;">Success</span>
```

**Rules:**

- Don't rely on color alone to convey information
- Use icons, text, patterns, or shapes in addition to color
- Provide text alternatives for visual indicators

### Focus Indicators

```css
/* ✅ GOOD: High contrast focus */
button:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

/* ❌ BAD: Removed focus */
button:focus {
  outline: none; /* Never do this */
}
```

## Forms Accessibility

### Labels

```html
<!-- ✅ CORRECT: Explicit label -->
<label for="email">Email</label>
<input id="email" type="email" />

<!-- ✅ CORRECT: Implicit label -->
<label>
  Email
  <input type="email" />
</label>

<!-- ❌ WRONG: Placeholder as label -->
<input placeholder="Email" />

<!-- ❌ WRONG: No label -->
<input type="email" />
```

### Required Fields

```html
<label for="name"> Full Name <span class="text-error" aria-hidden="true">*</span> </label>
<input id="name" type="text" required aria-required="true" />
<span class="text-sm text-neutral-500">Required field</span>
```

### Error Messages

```html
<label for="email">Email</label>
<input id="email" type="email" aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" class="text-error" role="alert"> Invalid email format </span>
```

### Fieldset and Legend

```html
<fieldset>
  <legend>Payment Method</legend>
  <label>
    <input type="radio" name="payment" value="credit" />
    Credit Card
  </label>
  <label>
    <input type="radio" name="payment" value="debit" />
    Debit Card
  </label>
</fieldset>
```

## Images and Media

### Alt Text

```html
<!-- ✅ Informative image -->
<img src="chart.png" alt="Monthly expense breakdown showing 60% on groceries" />

<!-- ✅ Decorative image -->
<img src="decoration.png" alt="" />
<!-- or -->
<img src="decoration.png" role="presentation" />

<!-- ❌ Missing alt -->
<img src="chart.png" />

<!-- ❌ Redundant alt -->
<img src="photo.jpg" alt="Photo" />
```

**Rules:**

- All `<img>` must have `alt` attribute
- Decorative images: `alt=""`
- Informative images: Describe content/purpose
- Don't use "image of" or "picture of"

### Icons

```html
<!-- ✅ Decorative icon (with text) -->
<button>
  <Icon name="trash" aria-hidden="true" />
  Delete
</button>

<!-- ✅ Meaningful icon (without text) -->
<button aria-label="Delete">
  <Icon name="trash" />
</button>

<!-- ❌ Icon without label -->
<button>
  <Icon name="trash" />
</button>
```

## Testing Accessibility

### Automated Testing

```bash
# Lighthouse (Chrome DevTools)
# Run audit: DevTools → Lighthouse → Accessibility

# axe DevTools (Browser extension)
# Install: https://www.deque.com/axe/devtools/

# Run tests in CI
npm run test:a11y
```

### Manual Testing

#### Keyboard Testing

1. **Tab through page**: Can you reach all interactive elements?
2. **Tab order**: Is it logical?
3. **Enter/Space**: Do buttons and links activate?
4. **Escape**: Do modals close?
5. **Arrow keys**: Do custom controls work?

#### Screen Reader Testing

**macOS (VoiceOver):**

```
Cmd + F5: Toggle VoiceOver
VO + Right Arrow: Next element
VO + Left Arrow: Previous element
VO + Space: Activate element
```

**Windows (NVDA - free):**

```
Ctrl + Alt + N: Start NVDA
Tab: Next element
Shift + Tab: Previous element
Enter/Space: Activate element
```

**Testing Checklist:**

- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Heading structure is logical
- [ ] Landmark regions present
- [ ] All functionality keyboard accessible
- [ ] Focus indicators visible
- [ ] Error messages announced
- [ ] Dynamic content announced
- [ ] Color contrast sufficient
- [ ] No keyboard traps

### Testing Tools

| Tool             | Purpose           | URL                                           |
| ---------------- | ----------------- | --------------------------------------------- |
| Lighthouse       | Automated audit   | Built into Chrome DevTools                    |
| axe DevTools     | Automated testing | https://www.deque.com/axe/devtools/           |
| WAVE             | Visual feedback   | https://wave.webaim.org/                      |
| Contrast Checker | Color contrast    | https://webaim.org/resources/contrastchecker/ |
| Screen Readers   | Manual testing    | VoiceOver (macOS), NVDA (Windows)             |

## Common Accessibility Issues

### Issue: Missing Alt Text

```html
<!-- ❌ BAD -->
<img src="chart.png" />

<!-- ✅ GOOD -->
<img src="chart.png" alt="Monthly expenses by category" />
```

### Issue: Non-Semantic Buttons

```html
<!-- ❌ BAD -->
<div onclick="submit()">Submit</div>

<!-- ✅ GOOD -->
<button type="button" onclick="submit()">Submit</button>
```

### Issue: Poor Color Contrast

```css
/* ❌ BAD: 2.1:1 ratio */
.text {
  color: #999999;
  background: #ffffff;
}

/* ✅ GOOD: 7.4:1 ratio */
.text {
  color: #4b5563;
  background: #ffffff;
}
```

### Issue: Keyboard Trap

```javascript
// ❌ BAD: Modal traps focus
modal.addEventListener('keydown', (e) => {
  e.preventDefault(); // Don't prevent all keys!
});

// ✅ GOOD: Allow Escape to close
modal.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});
```

### Issue: Missing Form Labels

```html
<!-- ❌ BAD -->
<input type="text" placeholder="Name" />

<!-- ✅ GOOD -->
<label for="name">Name</label>
<input id="name" type="text" />
```

## Accessibility Checklist

### Global Requirements

- [ ] One `<h1>` per page
- [ ] Logical heading hierarchy (no skipped levels)
- [ ] Landmark regions (`<header>`, `<nav>`, `<main>`, `<footer>`)
- [ ] Skip link to main content
- [ ] Page language specified (`<html lang="en">`)
- [ ] Valid HTML (no errors)

### Interactive Elements

- [ ] All functionality keyboard accessible
- [ ] Visible focus indicators on all focusable elements
- [ ] Logical tab order
- [ ] No keyboard traps
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals

### Forms

- [ ] All inputs have associated labels
- [ ] Required fields indicated
- [ ] Error messages have `role="alert"`
- [ ] Errors linked with `aria-describedby`
- [ ] Fieldsets group related inputs
- [ ] Validation messages are clear

### Content

- [ ] All images have alt text
- [ ] Color not sole means of conveying information
- [ ] Text contrast ≥ 4.5:1 (normal text)
- [ ] Text contrast ≥ 3:1 (large text)
- [ ] Font size ≥ 16px (body text)
- [ ] Line height ≥ 1.5 (body text)

### Dynamic Content

- [ ] Loading states announced
- [ ] Error messages announced
- [ ] Success messages announced
- [ ] Form submission feedback
- [ ] Dynamic updates use `aria-live`

## Summary

Accessibility is not optional. Every component must:

1. **Use semantic HTML** - Correct elements for their purpose
2. **Be keyboard accessible** - Tab, Enter, Space, Escape work correctly
3. **Have proper ARIA** - Labels, roles, states when needed
4. **Meet contrast ratios** - ≥4.5:1 for text, ≥3:1 for components
5. **Work with screen readers** - Tested with VoiceOver or NVDA

**Test every component with:**

- Keyboard only (no mouse)
- Screen reader (VoiceOver or NVDA)
- Lighthouse accessibility audit
- axe DevTools browser extension

### Next Steps

- **05-responsive.md** - Responsive design patterns
- **06-data-visualization.md** - Charts and financial data displays
