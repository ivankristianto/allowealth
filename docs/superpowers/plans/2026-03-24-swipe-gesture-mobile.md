# Swipe Gesture Mobile Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-down gesture support to the Mobile Command Center bottom sheet so users can dismiss it by dragging the drag handle pill downward.

**Architecture:** Insert a drag handle pill strip as the first child of the `.command-sheet` element. Add four touch event handlers (`touchstart`, `touchmove`, `touchend`, `touchcancel`) inside the existing `initMobileNav()` function in `MobileCommandCenter.astro`. Patch the existing `closeSheet()` and `openSheet()` functions to clear inline styles before their class-based animations run.

**Tech Stack:** Astro 6, Tailwind CSS v4, bun:test (unit), Playwright (E2E)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/components/layouts/MobileCommandCenter.astro` | Modify | Add drag handle HTML; add touch handlers in `initMobileNav()`; patch `closeSheet()` and `openSheet()` |
| `src/components/layouts/MobileCommandCenter.test.ts` | Modify | Add structural test asserting `data-drag-handle` and `touch-none` are present |
| `e2e/tests/mobile/swipe-gesture.spec.ts` | Create | E2E tests for swipe-to-dismiss, snap-back, and existing close methods |

---

## Task 1: Add structural unit test and drag handle HTML

**Files:**
- Modify: `src/components/layouts/MobileCommandCenter.test.ts`
- Modify: `src/components/layouts/MobileCommandCenter.astro`

- [ ] **Step 1: Write the failing test**

  Open `src/components/layouts/MobileCommandCenter.test.ts`. Add inside the `describe('structure', ...)` block, after the last existing `it(...)`:

  ```ts
  it('includes a drag handle for swipe gesture', () => {
    expect(source).toContain('data-drag-handle');
    expect(source).toContain('touch-none');
    expect(source).toContain('bg-base-content/30');
  });
  ```

- [ ] **Step 2: Run the test to confirm it fails**

  ```bash
  bun test src/components/layouts/MobileCommandCenter.test.ts
  ```

  Expected: test `includes a drag handle for swipe gesture` fails with "Expected string to contain 'data-drag-handle'".

- [ ] **Step 3: Add the drag handle HTML to MobileCommandCenter.astro**

  In `src/components/layouts/MobileCommandCenter.astro`, locate the `command-sheet` div (line ~119):

  ```html
  <div
    id="command-sheet"
    class="command-sheet fixed left-0 right-0 bottom-0 ..."
    ...
  >
  ```

  Insert the drag handle strip as its **first child**, before the `{/* User Card Header */}` comment:

  ```html
  {/* Drag handle — touch target for swipe-to-dismiss */}
  <div
    class="flex justify-center items-center py-3 touch-none"
    data-drag-handle
    aria-hidden="true"
  >
    <div class="w-9 h-1 rounded-full bg-base-content/30"></div>
  </div>
  ```

- [ ] **Step 4: Run the test to confirm it passes**

  ```bash
  bun test src/components/layouts/MobileCommandCenter.test.ts
  ```

  Expected: all tests pass.

- [ ] **Step 5: Run typecheck**

  ```bash
  bun run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/layouts/MobileCommandCenter.astro src/components/layouts/MobileCommandCenter.test.ts
  git commit -m "feat(mobile): add drag handle pill to command sheet"
  ```

---

## Task 2: Patch closeSheet() and openSheet() to clear inline styles

**Files:**
- Modify: `src/components/layouts/MobileCommandCenter.astro`

The touch handlers (added in Task 3) set `sheet.style.transform` and `backdrop.style.opacity` as inline styles during a drag. If the sheet is closed by another mechanism (Escape, backdrop tap, close button) while a drag is in progress, or if `closeSheet()` is called after a gesture dismiss, inline styles must be cleared first — otherwise they override the Tailwind class-based animations.

- [ ] **Step 1: Patch closeSheet()**

  In `MobileCommandCenter.astro`, locate `const closeSheet = () => {` (around line 549). Add two lines at the very top of the function body, before any class manipulation:

  ```ts
  const closeSheet = () => {
    // Clear any inline styles left by an in-progress swipe gesture
    sheet.style.transform = '';
    backdrop.style.opacity = '';

    sheet.classList.add('translate-y-full');
    // ... rest of existing closeSheet() body unchanged
  ```

- [ ] **Step 2: Patch openSheet()**

  Locate `const openSheet = () => {` (around line 526). Add the same two lines at the very top:

  ```ts
  const openSheet = () => {
    // Clear any inline styles left by an interrupted swipe gesture
    sheet.style.transform = '';
    backdrop.style.opacity = '';

    // Store current focus
    lastFocusedElement = document.activeElement as HTMLElement;
    // ... rest of existing openSheet() body unchanged
  ```

- [ ] **Step 3: Run typecheck**

  ```bash
  bun run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 4: Run unit tests to confirm no regression**

  ```bash
  bun test src/components/layouts/MobileCommandCenter.test.ts
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/layouts/MobileCommandCenter.astro
  git commit -m "feat(mobile): clear inline swipe styles in closeSheet/openSheet"
  ```

---

## Task 3: Add touch event handlers for swipe-to-dismiss

**Files:**
- Modify: `src/components/layouts/MobileCommandCenter.astro`

All changes go inside `initMobileNav()`, after the existing `const backdrop = ...` query and before the `menuToggle.addEventListener('click', openSheet, ...)` line.

- [ ] **Step 1: Query the drag handle**

  Locate this block inside `initMobileNav()` (around line 504):

  ```ts
  const commandBar = commandCenter.querySelector('[data-command-bar]');
  const menuToggle = commandCenter.querySelector('[data-menu-toggle]');
  const menuClose = commandCenter.querySelector('[data-menu-close]');
  const sheet = commandCenter.querySelector('[data-command-sheet]');
  const backdrop = commandCenter.querySelector('[data-command-backdrop]');
  const logoutBtn = commandCenter.querySelector('[data-logout-button]');
  ```

  Add one line after the existing queries:

  ```ts
  const dragHandle = commandCenter.querySelector('[data-drag-handle]');
  ```

- [ ] **Step 2: Add drag state variables and four touch handlers**

  After the `let lastFocusedElement: HTMLElement | null = null;` declaration (around line 516), add:

  ```ts
  // Swipe-to-dismiss state
  let dragStartY = 0;
  let dragStartTime = 0;
  let isDragging = false;

  if (dragHandle instanceof HTMLElement) {
    // touchstart: record start position, disable CSS transition for real-time tracking
    dragHandle.addEventListener(
      'touchstart',
      (e) => {
        dragStartY = e.touches[0].clientY;
        dragStartTime = Date.now();
        isDragging = true;
        sheet.style.transition = 'none';
      },
      { passive: true, signal }
    );

    // touchmove: translate sheet and fade backdrop proportionally (downward only)
    dragHandle.addEventListener(
      'touchmove',
      (e) => {
        if (!isDragging) return;
        const deltaY = Math.max(0, e.touches[0].clientY - dragStartY);
        sheet.style.transform = `translateY(${deltaY}px)`;
        const progress = deltaY / sheet.offsetHeight;
        backdrop.style.opacity = String(0.5 * (1 - progress));
      },
      { passive: true, signal }
    );

    // touchend: dismiss if past threshold, otherwise snap back
    dragHandle.addEventListener(
      'touchend',
      (e) => {
        if (!isDragging) return;
        isDragging = false;

        const deltaY = Math.max(0, e.changedTouches[0].clientY - dragStartY);
        const velocity = deltaY / (Date.now() - dragStartTime); // px/ms

        const DISTANCE_THRESHOLD = sheet.offsetHeight * 0.25;
        const VELOCITY_THRESHOLD = 0.4; // px/ms

        // Restore CSS transition before either animation
        sheet.style.transition = '';

        if (deltaY >= DISTANCE_THRESHOLD || velocity >= VELOCITY_THRESHOLD) {
          // closeSheet() clears sheet.style.transform and backdrop.style.opacity internally
          closeSheet();
        } else {
          // Snap back: clearing inline styles lets CSS transition return to translate-y-0
          sheet.style.transform = '';
          backdrop.style.opacity = '';
        }
      },
      { signal }
    );

    // touchcancel: OS interrupted the touch (e.g. incoming call) — snap back cleanly
    dragHandle.addEventListener(
      'touchcancel',
      () => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = '';
        sheet.style.transform = '';
        backdrop.style.opacity = '';
      },
      { signal }
    );
  }
  ```

  > **Why `if (dragHandle instanceof HTMLElement)`?** TypeScript requires a type guard before calling `addEventListener` on the result of `querySelector`, which returns `Element | null`. This matches the existing guard pattern in `initMobileNav()` for `sheet` and `backdrop`.

- [ ] **Step 3: Run typecheck**

  ```bash
  bun run typecheck
  ```

  Expected: 0 errors.

- [ ] **Step 4: Run unit tests**

  ```bash
  bun test src/components/layouts/MobileCommandCenter.test.ts
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/layouts/MobileCommandCenter.astro
  git commit -m "feat(mobile): add swipe-to-dismiss gesture to command sheet"
  ```

---

## Task 4: E2E tests for swipe gesture

**Files:**
- Create: `e2e/tests/mobile/swipe-gesture.spec.ts`

These tests run under the `mobile-chrome` Playwright project (Pixel 5 emulation, 393×851 viewport). They use `page.evaluate` to dispatch real `TouchEvent` objects because our handlers listen to `touchstart`/`touchmove`/`touchend` directly — Playwright's `page.mouse` API dispatches pointer/mouse events, not touch events.

The dev server runs on port 4320 with a pre-seeded database and stored auth state (see `e2e/playwright.config.ts`).

- [ ] **Step 1: Create the test file**

  Create `e2e/tests/mobile/swipe-gesture.spec.ts`:

  ```ts
  import { test, expect } from '@playwright/test';

  /**
   * Simulates a touch swipe on `[data-drag-handle]` by dispatching TouchEvents.
   * Playwright's mouse API sends pointer/mouse events; our handlers require touch events.
   *
   * Dispatching touchstart and touchend in rapid succession (same evaluate call)
   * results in near-zero elapsed time, producing very high velocity — useful for
   * testing the velocity threshold path. Use a large deltaY for the distance threshold path.
   *
   * @param page - Playwright page
   * @param deltaY - Pixels to drag downward (positive = down)
   */
  async function swipeDragHandle(
    page: import('@playwright/test').Page,
    deltaY: number
  ): Promise<void> {
    await page.evaluate(
      ({ deltaY }) => {
        const handle = document.querySelector('[data-drag-handle]') as HTMLElement | null;
        if (!handle) throw new Error('[data-drag-handle] not found');

        const rect = handle.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const endY = startY + deltaY;

        const makeTouch = (target: HTMLElement, x: number, y: number): Touch =>
          new Touch({ identifier: 1, target, clientX: x, clientY: y, radiusX: 1, radiusY: 1, force: 1, rotationAngle: 0 });

        const dispatch = (type: string, y: number, activeTouches: Touch[]) => {
          const t = makeTouch(handle, cx, y);
          handle.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: activeTouches,
              changedTouches: [t],
            })
          );
        };

        const startTouch = makeTouch(handle, cx, startY);

        handle.dispatchEvent(
          new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [startTouch],
            changedTouches: [startTouch],
          })
        );

        dispatch('touchmove', startY + Math.floor(deltaY * 0.5), [makeTouch(handle, cx, startY + Math.floor(deltaY * 0.5))]);
        dispatch('touchend', endY, []);
      },
      { deltaY }
    );
  }

  /**
   * Opens the command sheet by clicking the menu toggle button.
   * Waits until the sheet is visible (inert attribute removed).
   */
  async function openSheet(page: import('@playwright/test').Page): Promise<void> {
    await page.click('[data-menu-toggle]');
    await page.waitForSelector('[data-command-sheet]:not([inert])', { timeout: 3000 });
  }

  test.describe('Mobile Command Center — swipe gesture', () => {
    test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      // Ensure the mobile nav is visible (lg:hidden hides it on desktop)
      await page.waitForSelector('.mobile-command-center', { timeout: 5000 });
    });

    test('swipe past distance threshold dismisses the sheet', async ({ page }) => {
      await openSheet(page);

      const sheet = page.locator('[data-command-sheet]');
      await expect(sheet).not.toHaveAttribute('inert');

      // Drag handle height is ~44px; sheet is ~85vh ≈ 723px; threshold = 25% ≈ 181px.
      // Drag 220px — safely past the distance threshold.
      await swipeDragHandle(page, 220);

      await expect(sheet).toHaveAttribute('inert', '', { timeout: 1000 });
    });

    test('swipe below threshold snaps the sheet back open', async ({ page }) => {
      await openSheet(page);

      const sheet = page.locator('[data-command-sheet]');

      // Drag only 60px — well below the ~181px distance threshold.
      await swipeDragHandle(page, 60);

      // Sheet should still be open (no inert attribute)
      await expect(sheet).not.toHaveAttribute('inert');
      // Inline transform should be cleared after snap-back
      await expect(sheet).not.toHaveCSS('transform', /translateY\([^0]/);
    });

    test('close button still dismisses the sheet after gesture is initialized', async ({ page }) => {
      await openSheet(page);

      const sheet = page.locator('[data-command-sheet]');
      await expect(sheet).not.toHaveAttribute('inert');

      // Do a short swipe (snap-back) to exercise the gesture handlers
      await swipeDragHandle(page, 40);
      await expect(sheet).not.toHaveAttribute('inert');

      // Then close via the close button
      await page.click('[data-menu-close]');
      await expect(sheet).toHaveAttribute('inert', '', { timeout: 1000 });
    });

    test('fast flick (velocity threshold) dismisses the sheet with small deltaY', async ({ page }) => {
      await openSheet(page);

      const sheet = page.locator('[data-command-sheet]');
      await expect(sheet).not.toHaveAttribute('inert');

      // Dispatch touchstart and touchend in the same evaluate call so elapsed ≈ 0ms.
      // With deltaY = 30px and elapsed ≈ 0ms, velocity >> 0.4 px/ms threshold.
      // Distance 30px is well below the ~181px distance threshold — only velocity triggers dismiss.
      await swipeDragHandle(page, 30);

      await expect(sheet).toHaveAttribute('inert', '', { timeout: 1000 });
    });

    test('drag handle element is present in the DOM', async ({ page }) => {
      await openSheet(page);
      await expect(page.locator('[data-drag-handle]')).toBeVisible();
    });
  });
  ```

- [ ] **Step 2: Run the E2E tests against the mobile-chrome project**

  Start the dev server first if it isn't running, then:

  ```bash
  bun run test:e2e -- --project=mobile-chrome --grep "swipe gesture" e2e/tests/mobile/swipe-gesture.spec.ts
  ```

  Expected: all 4 tests pass.

  > If the dev server isn't running, start it in a separate terminal: `bun run dev`. The E2E config uses `reuseExistingServer: true` so it won't start a duplicate.

- [ ] **Step 3: Run the full unit test suite to check for regressions**

  ```bash
  bun test
  ```

  Expected: all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add e2e/tests/mobile/swipe-gesture.spec.ts
  git commit -m "test(e2e): add swipe gesture tests for mobile command sheet"
  ```

---

## Task 5: Quality gates and final verification

- [ ] **Step 1: Run all quality gates**

  ```bash
  bun run lint:fix
  bun run stylelint:fix
  bun run format:fix
  bun run typecheck
  ```

  Expected: all pass with 0 errors.

- [ ] **Step 2: Run the full unit test suite**

  ```bash
  bun test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Run the build to verify no new errors**

  ```bash
  bun run build
  ```

  Expected: build completes with 0 errors.

- [ ] **Step 4: Commit any formatting fixes**

  If quality gates auto-fixed any formatting, commit those changes:

  ```bash
  git add -A
  git commit -m "chore: apply formatting after swipe gesture implementation"
  ```

  Skip this step if there are no uncommitted changes.
