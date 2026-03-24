# Swipe Gesture Support for Mobile Command Center Bottom Sheet

**Issue:** ALL-26
**Date:** 2026-03-24
**Status:** Approved

---

## Problem

The Mobile Command Center bottom sheet displays a rounded-top-corner shape that implies swipe-to-dismiss is available. No gesture support exists. Users who swipe down expect the sheet to close; instead, nothing happens. The visual affordance misleads them.

## Goal

Add swipe-down gesture support to the bottom sheet so users can dismiss it by dragging downward. The sheet must follow the finger in real time, snap back if the gesture falls short, and dismiss smoothly when the threshold is met.

## Scope

**In scope:**
- Swipe-down to dismiss via a dedicated drag handle pill
- Visual feedback: sheet translates with the finger during drag
- Proportional backdrop fade during drag
- Snap-back when gesture falls below threshold
- Smooth dismiss animation when threshold is met
- Works alongside existing close button, backdrop tap, and Escape key

**Out of scope:**
- Swipe-up to expand (sheet is already full height)
- Horizontal swipe gestures
- Pull-to-refresh within the sheet
- Multi-touch gestures

---

## Design

### HTML Changes

Insert a drag handle strip as the first child of `.command-sheet`, before the existing user card header:

```html
<!-- NEW: drag handle strip -->
<div
  class="flex justify-center items-center py-3 touch-none"
  data-drag-handle
  aria-hidden="true"
>
  <div class="w-9 h-1 rounded-full bg-base-content/30"></div>
</div>

<!-- existing header follows unchanged -->
<div class="flex items-center justify-between px-4 sm:px-6 py-3 ...">
```

The pill (`w-9 h-1`) matches native iOS/Android conventions. `touch-none` prevents the browser from intercepting the touch for scrolling. `aria-hidden="true"` keeps it invisible to screen readers — the existing close button covers dismissal for assistive technology.

### JavaScript Changes

All changes go inside the existing `initMobileNav()` function in `MobileCommandCenter.astro`. No new files.

**Query the drag handle:**
```ts
const dragHandle = commandCenter.querySelector('[data-drag-handle]');
```

**Three touch handlers on `dragHandle`:**

**`touchstart`** — record the starting position and time; strip the CSS transition so the sheet can track the finger without animation lag:
```ts
let dragStartY = 0;
let dragStartTime = 0;

dragHandle.addEventListener('touchstart', (e) => {
  dragStartY = e.touches[0].clientY;
  dragStartTime = Date.now();
  sheet.style.transition = 'none';
}, { passive: true, signal });
```

**`touchmove`** — compute `deltaY` (clamped to ≥ 0 so the sheet can only move down, not up); apply inline `translateY`; fade the backdrop proportionally:
```ts
dragHandle.addEventListener('touchmove', (e) => {
  const deltaY = Math.max(0, e.touches[0].clientY - dragStartY);
  sheet.style.transform = `translateY(${deltaY}px)`;
  const progress = deltaY / sheet.offsetHeight;
  backdrop.style.opacity = String(0.5 * (1 - progress));
}, { passive: true, signal });
```

**`touchend`** — evaluate distance and velocity against thresholds; either dismiss or snap back:
```ts
dragHandle.addEventListener('touchend', (e) => {
  const deltaY = Math.max(0, e.changedTouches[0].clientY - dragStartY);
  const velocity = deltaY / (Date.now() - dragStartTime); // px/ms

  const DISTANCE_THRESHOLD = sheet.offsetHeight * 0.25;
  const VELOCITY_THRESHOLD = 0.4; // px/ms

  // Restore transition before either animation
  sheet.style.transition = '';

  if (deltaY >= DISTANCE_THRESHOLD || velocity >= VELOCITY_THRESHOLD) {
    sheet.style.transform = ''; // clear inline, let closeSheet() take over
    closeSheet();
  } else {
    sheet.style.transform = ''; // snap back via CSS transition
    backdrop.style.opacity = ''; // restore backdrop
  }
}, { signal });
```

**Cleanup** — add `sheet.style.transform = ''` and `backdrop.style.opacity = ''` to the top of the existing `closeSheet()` and `openSheet()` functions to guard against stale inline styles if the sheet is closed by another mechanism mid-drag.

### Gesture States

| State | CSS transition | Sheet transform | Backdrop |
|---|---|---|---|
| At rest (open) | active | `translateY(0)` via class | 50% opacity |
| Dragging | removed | inline `translateY(Npx)` | scales 50% → 0% |
| Snap back | restored | inline cleared → class wins | restored to 50% |
| Dismissed | restored | inline cleared → `closeSheet()` applies `translate-y-full` | 0% via `closeSheet()` |

### Thresholds

- **Distance:** 25% of sheet height. At `max-h-[85vh]` on a 844px iPhone, this is ~180px — enough to be intentional, short enough to feel responsive.
- **Velocity:** 0.4 px/ms. A quick flick covers ~40px in 100ms, well below the distance threshold but fast enough to signal intent.

Either condition alone is sufficient to dismiss.

---

## Tests

The existing `MobileCommandCenter.test.ts` tests the Astro source as a string. Add one structural test:

```ts
it('includes a drag handle element', () => {
  expect(source).toContain('data-drag-handle');
  expect(source).toContain('touch-none');
});
```

Gesture behavior (touch events, thresholds, animation) requires browser-based testing. Add E2E tests using Playwright's `touchscreen` API:

- Swipe down past threshold → sheet closes
- Swipe down below threshold → sheet snaps back open
- Fast flick (velocity threshold) → sheet closes
- Existing close button still works after gesture initialization

---

## Accessibility

- The drag handle strip is `aria-hidden="true"` — screen readers skip it.
- The existing close button (`data-menu-close`) and Escape key handler remain the primary dismissal methods for keyboard and assistive technology users.
- No change to focus management or focus trap logic.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/layouts/MobileCommandCenter.astro` | Add drag handle HTML + three touch event handlers in `initMobileNav()` |
| `src/components/layouts/MobileCommandCenter.test.ts` | Add structural test for `data-drag-handle` |
