# Swipe Gestures for Drawers and Transaction Rows

**Date:** 2026-03-25
**Status:** Draft
**Builds on:** `2026-03-24-swipe-gesture-mobile-design.md` (MobileCommandCenter swipe-to-dismiss)

---

## Problem

The MobileCommandCenter bottom sheet supports swipe-to-dismiss, but the side drawers (Transaction, Recurring) and transaction rows do not. Mobile users expect to swipe side drawers closed and swipe list rows to reveal quick actions. The existing kebab menu on transaction rows requires precise tapping.

## Goal

1. Extract a shared swipe gesture controller from the MobileCommandCenter implementation.
2. Add swipe-right-to-dismiss to side drawers on mobile.
3. Add swipe-left-to-reveal actions (Edit, Delete) on transaction rows in the transaction list page.

## Scope

**In scope:**
- Shared `SwipeGesture` controller class
- Refactor MobileCommandCenter to use the shared controller
- Swipe-right-to-dismiss for the generic `Drawer` component (mobile only)
- Swipe-left-to-reveal Edit + Delete on `TransactionCard` (transaction list page, mobile only)
- Direction lock to distinguish swipe from scroll
- Form element exclusion (inputs, selects inside drawers)
- `prefers-reduced-motion` support
- Single-revealed-row constraint

**Out of scope:**
- Swipe on desktop viewports
- Swipe on dashboard RecentTransactionsList widget
- Bidirectional row swipe
- Long press gestures
- Swipe-to-delete (full row removal via swipe alone)

---

## Design

### 1. Shared Gesture Controller

**New file:** `src/lib/gestures/swipe.ts`

A `SwipeGesture` class encapsulates touch tracking, threshold math, direction locking, and snap-back.

```ts
interface SwipeGestureConfig {
  direction: 'down' | 'right' | 'left';
  element: HTMLElement;           // touch target surface
  target: HTMLElement;            // element to transform (may differ from element)
  distanceThresholdPx?: number;   // absolute pixel threshold (takes precedence if set)
  distanceThreshold?: number;     // fraction of target dimension (default 0.25, ignored if distanceThresholdPx is set)
  velocityThreshold?: number;     // px/ms, default 0.4
  ignoreFrom?: string;            // CSS selector for elements to ignore (default: 'input, textarea, select, [role="listbox"]')
  onThreshold: () => void;        // called when distance or velocity threshold met
  onMove?: (progress: number) => void;  // 0-1 progress for custom feedback
  onCancel?: () => void;          // snap-back completed
}
```

The controller computes the effective threshold in pixels at `touchend`: if `distanceThresholdPx` is set, use it directly; otherwise compute `distanceThreshold * targetDimension` (height for `down`, width for `right`/`left`).

**Public API:**

```ts
class SwipeGesture {
  constructor(config: SwipeGestureConfig);
  destroy(): void;    // remove all listeners via AbortController
  reset(): void;      // programmatically snap target back and clear state
}
```

**Core behavior:**

- **`touchstart`** (passive): Check `ignoreFrom` — if the touch originates from a matching element, abort. Record start position and timestamp. Set `isDragging = true`. Disable CSS transition on target.
- **`touchmove`** (passive): On the first move event, determine direction lock — if the initial movement is more perpendicular than parallel to the configured direction (angle > 45°), abort the gesture and let the browser handle scrolling. Once locked, compute delta clamped to the configured direction, apply `transform` on target, call `onMove` with progress (0–1). Note: because `touchmove` is passive, `preventDefault()` cannot be called. On some devices the browser may still scroll slightly during a locked horizontal gesture. This is an acceptable tradeoff — blocking scroll would cause jank.
- **`touchend`**: Compute final delta. Compute velocity (guarded against zero elapsed time). Restore CSS transition. If delta exceeds distance threshold OR velocity exceeds velocity threshold, call `onThreshold`. Otherwise clear inline styles (snap-back), call `onCancel`.
- **`touchcancel`**: Reset all inline styles and state, call `onCancel`.
- **`destroy()`**: Remove all event listeners via `AbortController`.
- **`reset()`**: Restore CSS transition, clear inline `transform` on target, reset `isDragging` and direction lock state. Used by external code to programmatically close a revealed row.

**Direction-specific transform:**

| Direction | Axis | Clamp | Transform | Threshold dimension |
|---|---|---|---|---|
| `down` | Y | deltaY >= 0 | `translateY(${delta}px)` | target height |
| `right` | X | deltaX >= 0 | `translateX(${delta}px)` | target width |
| `left` | X | deltaX <= 0 | `translateX(${delta}px)` | `distanceThresholdPx` value |

For the `left` direction, delta is negative. The `onMove` progress is computed as `Math.abs(delta) / threshold`, yielding 0–1. The `onThreshold` callback receives no arguments — the consumer sets the final transform (e.g., `translateX(-128px)` for the revealed position).

**Direction lock logic:**

On the first `touchmove` event after `touchstart`, compute the angle of movement. If the dominant axis does not match the configured direction, set a `locked = false` flag and ignore all subsequent move/end events for this touch sequence. This prevents swipe gestures from hijacking vertical scrolling on transaction rows and horizontal scrolling in drawers.

### 2. Drawer Swipe-to-Dismiss

**Modified files:** `Drawer.client.ts`

The generic `Drawer` component gains swipe-to-dismiss on mobile. TransactionDrawer and RecurringTemplateForm inherit the behavior because they wrap `Drawer`.

**Initialization:**
- On `drawer:open`, check `window.innerWidth < 1024`. If mobile, create a `SwipeGesture` instance:
  - `direction: 'right'`
  - `element`: `[data-drawer-content]` (the drawer content panel)
  - `target`: same element
  - `ignoreFrom`: `'input, textarea, select, [role="listbox"]'` (default; note `button` is excluded from the default so drawer close/action buttons do not block swipe starts — the direction lock handles accidental swipes from button taps)
  - `onMove`: fade backdrop proportionally
  - `onThreshold`: call existing `closeDrawer()`
- On `drawer-closed`, call `gesture.destroy()`.
- On resize crossing the `lg` breakpoint, destroy the gesture.

**Visual feedback during drag:**
- Content panel translates right: `translateX(${deltaX}px)`
- Backdrop fades: `opacity * (1 - progress)`
- Snap-back uses CSS transition (matches existing drawer animation timing)

**No template changes.** The entire drawer content panel serves as the touch target.

### 3. Transaction Row Swipe-to-Reveal

**Modified files:** `TransactionCard.astro`, new `TransactionCard.client.ts`

**Markup changes (mobile layout only):**

The existing mobile card content gets wrapped in a swipe container. The action buttons carry the same data attributes as the kebab menu buttons so existing event delegation handlers work unchanged.

```html
<!-- Swipe container with overflow hidden -->
<div class="relative overflow-hidden" data-swipe-container>
  <!-- Action panel (hidden behind card) -->
  <div class="absolute inset-y-0 right-0 flex" data-swipe-actions>
    <button class="w-16 bg-primary text-primary-content flex items-center justify-center"
            data-edit-transaction={transaction.id}
            data-transaction-data={transactionDataJson}>
      <!-- Pencil icon -->
    </button>
    <button class="w-16 bg-error text-error-content flex items-center justify-center"
            data-delete-transaction={transaction.id}
            data-transaction-details={transactionDetailsJson}>
      <!-- Trash icon -->
    </button>
  </div>

  <!-- Existing card content (becomes the swipeable surface) -->
  <div class="..." data-swipe-content>
    <!-- existing mobile card layout unchanged -->
  </div>
</div>
```

The `transactionDataJson` and `transactionDetailsJson` variables already exist in `TransactionCard.astro` (lines 106–119). The swipe action buttons reuse them.

Action panel width: 128px (two 64px buttons). The panel sits at `right: 0`, hidden behind the card content. When the card translates left, the buttons appear.

**Event handling:** On the transactions page, `TransactionsPage.client.ts` uses event delegation (`document.addEventListener('click', ...)` with `target.closest('[data-edit-transaction]')` and `target.closest('[data-delete-transaction]')`). Because it delegates to `document`, the swipe action buttons are picked up automatically — no changes needed. The edit handler reads `data-transaction-data` (JSON) from the button; the delete handler reads `data-delete-transaction` (ID) and `data-transaction-details` (JSON). Both are present on the swipe buttons.

Note: `TransactionList.client.ts` uses direct binding (`querySelectorAll`), but it runs on the dashboard, not the transactions page. On the transactions page, `TransactionsPage.client.ts` handles everything via delegation.

**Client script (`TransactionCard.client.ts`):**

- On `astro:page-load`, query all `[data-swipe-container]` elements on the transaction list page
- For each, create a `SwipeGesture` instance:
  - `direction: 'left'`
  - `element`: `[data-swipe-content]`
  - `target`: same element
  - `distanceThresholdPx`: 128 (action panel width in pixels)
  - `onThreshold`: snap card to `translateX(-128px)` (revealed position), set `currentlyRevealed`
  - `onCancel`: snap card back to `translateX(0)`
- Only initialize on mobile (`window.innerWidth < 1024`)
- Destroy all instances on `astro:before-swap`, recreate on `astro:page-load`

**Bulk selection interaction:** When bulk selection is active (`showBulkSelection` prop), checkboxes appear and row behavior changes. Swipe gestures should be disabled during bulk selection to avoid conflicting with checkbox interaction. The client script checks for the presence of `[data-bulk-select]` checkboxes and skips gesture initialization if found. (Alternatively, listen for bulk selection state changes and dynamically enable/disable — but checking at init time is simpler since bulk selection is set server-side via props.)

**Single-row-open constraint:**

A module-level variable tracks the currently revealed row:

```ts
let currentlyRevealed: SwipeGesture | null = null;
```

- When a new row starts being swiped, call `currentlyRevealed.reset()` to close the previous row.
- Tapping anywhere outside a revealed row closes it (document-level `click` listener calls `reset()`).
- Scrolling the transaction list closes any revealed row (`scroll` listener on the list container calls `reset()`).

**Action buttons** are handled by `TransactionsPage.client.ts` via event delegation on `document` (see Event handling above). No new click handlers needed.

**Close revealed row:** The `SwipeGesture.reset()` method programmatically restores CSS transition, clears inline `transform`, and resets internal state. External code (scroll handler, document click, another row's swipe start) calls it to close a revealed row.

### 4. MobileCommandCenter Refactor

**Modified file:** `MobileCommandCenter.astro`

Replace the inline touch handling (~70 lines in the `initMobileNav()` function, identifiable by the `// Swipe-to-dismiss state` comment and `data-drag-handle` references) with a `SwipeGesture` instance:

```ts
const gesture = new SwipeGesture({
  direction: 'down',
  element: dragHandle,
  target: sheet,
  distanceThreshold: 0.25,
  velocityThreshold: 0.4,
  onMove: (progress) => {
    backdrop.style.opacity = String(0.5 * (1 - progress));
  },
  onThreshold: () => closeSheet(),
  onCancel: () => {
    backdrop.style.opacity = '';
  },
});
```

Behavior stays identical. Destroy on `astro:before-swap`, recreate on `astro:page-load`.

### 5. Error Handling and Edge Cases

**Scroll vs. swipe conflict:** Direction lock in the `SwipeGesture` controller handles this. First `touchmove` determines the dominant axis. If perpendicular to the configured direction, the gesture aborts.

**Form inputs inside drawers:** The `ignoreFrom` config defaults to `'input, textarea, select, [role="listbox"]'`. Touches originating from these elements do not start a gesture. Note: `button` is intentionally excluded from the default so that buttons inside drawers and cards do not create large dead zones for swipe initiation. The direction lock handles accidental swipes that start on buttons.

**`prefers-reduced-motion`:** Skip the drag-following animation during the gesture. When the threshold is met: for drawers and bottom sheet, dismiss instantly (no intermediate tracking). For transaction rows, snap instantly to the revealed position (`translateX(-128px)`) without tracking the finger. Snap-back also happens instantly. The swipe gesture itself still works — only the visual tracking is removed.

**Astro page transitions:** All `SwipeGesture` instances are destroyed on `astro:before-swap` and recreated on `astro:page-load`, matching the existing pattern.

**Fast touch sequences:** The Drawer's existing `pendingAction` queue prevents race conditions. Swipe dismiss feeds into `closeDrawer()`, which respects the queue.

**Zero elapsed time:** The controller guards `velocity = deltaY / elapsed` against division by zero (from the MobileCommandCenter fix).

### 6. Accessibility

Swipe gestures are enhancements. Every swipe action has a non-gesture equivalent:

| Gesture | Equivalent |
|---|---|
| Swipe drawer closed | Close button, Escape key, backdrop tap |
| Swipe row to reveal actions | Kebab dropdown menu (remains on mobile) |

No ARIA changes required. The drag handle on the bottom sheet is already `aria-hidden="true"`. Transaction row action buttons in the swipe panel carry the same `data-*` attributes and `aria-label` values as the kebab menu buttons.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/gestures/swipe.ts` | New shared `SwipeGesture` controller class |
| `src/lib/gestures/swipe.test.ts` | Unit tests for controller |
| `src/components/layouts/MobileCommandCenter.astro` | Refactor inline touch handling to use `SwipeGesture` |
| `src/components/molecules/Drawer.client.ts` | Add mobile swipe-right-to-dismiss using `SwipeGesture` |
| `src/components/molecules/TransactionCard.astro` | Add swipe container + action panel markup (mobile layout) |
| `src/components/molecules/TransactionCard.client.ts` | New client script: swipe-to-reveal using `SwipeGesture` |
| `e2e/tests/mobile/swipe-gesture.spec.ts` | Extend with drawer dismiss + row reveal tests |

---

## Testing

**Unit tests (`src/lib/gestures/swipe.test.ts`):**
- Distance threshold triggers dismiss; below threshold snaps back
- Velocity threshold triggers dismiss on fast flick
- Direction lock aborts gesture when movement is perpendicular
- Zero elapsed time guard prevents Infinity velocity
- `ignoreFrom` filtering skips touches on form elements
- `destroy()` removes all listeners
- `reset()` programmatically snaps target back

**Structural tests:**
- Existing `Drawer.test.ts` and `MobileCommandCenter.test.ts` remain passing
- `TransactionCard.test.ts`: verify action panel markup exists with correct data attributes

**E2E tests (`e2e/tests/mobile/swipe-gesture.spec.ts`):**
- Drawer: swipe right past threshold dismisses; below threshold snaps back
- Transaction row: swipe left reveals Edit + Delete; tap Edit opens drawer; swipe second row closes first; tap outside closes revealed row
- MobileCommandCenter: existing tests pass unchanged after refactor
