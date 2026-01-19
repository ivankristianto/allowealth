# Animations (Motion)

**Version:** 1.0.0 | **Library:** Motion (replaces framer-motion)

This document covers animation patterns using the **Motion** library for client-side animations in Astro applications.

## Installation

```bash
bun add motion
```

## Import Pattern

```astro
---
import { animate } from 'motion';
---
```

## Standard Animation Durations

| Duration | Time  | Use Case                          |
| -------- | ----- | --------------------------------- |
| Fast     | 150ms | Micro-interactions (hover, focus) |
| Normal   | 300ms | Enter animations, transitions     |
| Slow     | 500ms | Page transitions, large elements  |

## Standard Easings

| Easing    | Use Case                                |
| --------- | --------------------------------------- |
| easeOut   | Enter animations (elements appearing)   |
| easeIn    | Exit animations (elements disappearing) |
| easeInOut | State changes, transforms               |

## Enter/Exit Animations

### Fade + Slide (Toast Pattern)

```typescript
import { animate } from 'motion';

// Enter animation (fade in + slide from right)
animate(element, { opacity: [0, 1], x: [50, 0] }, { duration: 0.3, easing: 'easeOut' });

// Exit animation (fade out + slide to right)
animate(element, { opacity: [1, 0], x: [0, 50] }, { duration: 0.2, easing: 'easeIn' }).then(() =>
  element.remove()
);
```

### Fade + Slide Up (Modal Pattern)

```typescript
import { animate } from 'motion';

// Modal enter
animate(modalElement, { opacity: [0, 1], y: [20, 0] }, { duration: 0.3, easing: 'easeOut' });

// Modal exit
animate(
  modalElement,
  { opacity: [1, 0], y: [0, 20], scale: [1, 0.95] },
  { duration: 0.2, easing: 'easeIn' }
);
```

### Fade Only

```typescript
// Simple fade in
animate(element, { opacity: [0, 1] }, { duration: 0.3 });

// Simple fade out
animate(element, { opacity: [1, 0] }, { duration: 0.2 });
```

## Common Patterns

### Stagger Children

```typescript
import { animate } from 'motion';

// Animate list items one by one
const items = document.querySelectorAll('.list-item');

items.forEach((item, index) => {
  animate(
    item,
    { opacity: [0, 1], y: [10, 0] },
    { duration: 0.3, delay: index * 0.1, easing: 'easeOut' }
  );
});
```

### Scale In

```typescript
// Scale up from 95% to 100%
animate(element, { scale: [0.95, 1], opacity: [0, 1] }, { duration: 0.2, easing: 'easeOut' });
```

### Hover Interactions

```typescript
const button = document.querySelector('.interactive-button');

button.addEventListener('mouseenter', () => {
  animate(button, { scale: 1.05 }, { duration: 0.15, easing: 'easeOut' });
});

button.addEventListener('mouseleave', () => {
  animate(button, { scale: 1 }, { duration: 0.15, easing: 'easeOut' });
});
```

## CSS Transitions vs Motion

### Use CSS Transitions For:

- Simple hover/focus states
- Color/opacity changes
- Simple transforms (translate, scale)
- Performance-critical frequent animations

```css
.button {
  transition:
    background-color 0.15s ease-out,
    transform 0.15s ease-out;
}

.button:hover {
  background-color: var(--color-primary-hover);
  transform: scale(1.05);
}
```

### Use Motion For:

- Complex multi-property animations
- Enter/exit animations with cleanup
- Staggered sequences
- Animations requiring promises/callbacks
- Dynamic values (e.g., calculated positions)

```typescript
import { animate } from 'motion';

animate(
  element,
  {
    opacity: [0, 1],
    x: [50, 0],
    scale: [0.9, 1],
  },
  { duration: 0.3 }
).then(() => {
  // Animation complete callback
  console.log('Animation finished');
});
```

## Performance Best Practices

### Animate Transform and Opacity Only

For smooth 60fps animations, prefer animating `transform` and `opacity` properties:

```typescript
// Good - GPU accelerated
animate(element, { opacity: [0, 1], transform: ['translateX(50px)', 'translateX(0)'] });

// Avoid - triggers layout
animate(element, { width: ['0px', '100px'] });
```

### Use will-change For Known Animations

```css
.animated-element {
  will-change: transform, opacity;
}
```

Remove `will-change` after animation completes to free up resources:

```typescript
element.style.willChange = 'transform, opacity';
animate(element, { opacity: [0, 1] }).then(() => {
  element.style.willChange = 'auto';
});
```

## Accessibility

### Respect Prefers-Reduced-Motion

```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  animate(element, { opacity: [0, 1], x: [50, 0] }, { duration: 0.3 });
} else {
  // Skip animation or use instant state change
  element.style.opacity = '1';
}
```

## Toast Animation Example (Reference)

```typescript
// Enter animation for toast
function toastEnter(element: HTMLElement) {
  animate(element, { opacity: [0, 1], x: [50, 0] }, { duration: 0.3, easing: 'easeOut' });
}

// Exit animation for toast (removes element after completion)
function toastExit(element: HTMLElement) {
  animate(element, { opacity: [1, 0], x: [0, 50] }, { duration: 0.2, easing: 'easeIn' }).then(() =>
    element.remove()
  );
}
```

## Library Migration Notes

### From Framer Motion to Motion

The project migrated from `framer-motion` to `motion` for better Astro compatibility:

**Framer Motion (old):**

```astro
<motion.div
  client:load
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
/>
```

**Motion (current):**

```typescript
import { animate } from 'motion';

animate(element, { opacity: [0, 1] }, { duration: 0.3 });
```

Key differences:

- Motion uses imperative `animate()` function instead of declarative components
- No need for `client:*` directives - works in any client-side script
- More flexible for dynamic DOM manipulation
- Smaller bundle size

## Further Reading

- [Motion Documentation](https://motion.dev/)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [Accessibility: Prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
