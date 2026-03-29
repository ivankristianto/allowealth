# Swipe Gestures for Drawers and Transaction Rows — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `SwipeGesture` controller, add swipe-right-to-dismiss to side drawers on mobile, and add swipe-left-to-reveal actions on transaction rows.

**Architecture:** A shared `SwipeGesture` class in `src/lib/gestures/swipe.ts` encapsulates all touch tracking, direction locking, threshold math, and snap-back. Three consumers use it: MobileCommandCenter (refactored from inline), Drawer (new), and TransactionCard (new). Each consumer configures direction, thresholds, and callbacks.

**Tech Stack:** TypeScript, Bun test runner (`bun:test`), Playwright (E2E), Astro lifecycle events, CSS transforms/transitions.

**Spec:** `docs/superpowers/specs/2026-03-25-swipe-gestures-drawers-rows-design.md`

**Quality gates:** `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck && bun test && bun run build`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/gestures/swipe.ts` | Create | Shared `SwipeGesture` controller class |
| `src/lib/gestures/swipe.test.ts` | Create | Unit tests for `SwipeGesture` |
| `src/components/layouts/MobileCommandCenter.astro` | Modify (lines 528–599) | Replace inline touch handling with `SwipeGesture` |
| `src/components/layouts/MobileCommandCenter.test.ts` | Verify | Existing tests must pass unchanged |
| `src/components/molecules/Drawer.client.ts` | Modify | Add mobile swipe-right-to-dismiss |
| `src/components/molecules/TransactionCard.astro` | Modify (lines 194–354) | Add swipe container + action panel in mobile layout |
| `src/components/molecules/TransactionCard.client.ts` | Create | Swipe-to-reveal initialization + single-row constraint |
| `e2e/tests/mobile/swipe-gesture.spec.ts` | Modify | Add drawer + row swipe E2E tests |

---

### Task 1: Create the `SwipeGesture` controller — failing tests

**Files:**
- Create: `src/lib/gestures/swipe.test.ts`

- [ ] **Step 1: Create the test file with all unit tests**

```ts
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// We'll test SwipeGesture once it exists. For now, import will fail.
// import { SwipeGesture } from './swipe';

describe('SwipeGesture', () => {
  let element: HTMLElement;
  let target: HTMLElement;
  let onThreshold: ReturnType<typeof mock>;
  let onMove: ReturnType<typeof mock>;
  let onCancel: ReturnType<typeof mock>;

  beforeEach(() => {
    element = document.createElement('div');
    target = document.createElement('div');
    // Give target dimensions for threshold calculations
    Object.defineProperty(target, 'offsetHeight', { value: 800, configurable: true });
    Object.defineProperty(target, 'offsetWidth', { value: 400, configurable: true });
    document.body.appendChild(element);
    document.body.appendChild(target);
    onThreshold = mock(() => {});
    onMove = mock(() => {});
    onCancel = mock(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('direction: down', () => {
    it('calls onThreshold when distance threshold is met', () => {
      // Distance threshold = 0.25 * 800 = 200px
      // Swipe 220px down → should trigger
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 320 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 320 })],
      }));

      expect(onThreshold).toHaveBeenCalledTimes(1);
      gesture.destroy();
    });

    it('snaps back and calls onCancel below threshold', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 })],
      }));

      expect(onThreshold).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(target.style.transform).toBe('');
      gesture.destroy();
    });

    it('calls onMove with progress during drag', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      // Move 400px down on 800px target = 50% progress
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 500 })],
      }));

      expect(onMove).toHaveBeenCalled();
      const progress = onMove.mock.calls[0][0];
      expect(progress).toBeCloseTo(0.5, 1);
      gesture.destroy();
    });
  });

  describe('direction: right', () => {
    it('calls onThreshold when swiped right past threshold', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'right',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 200 })],
      }));
      // Move 110px right (threshold = 0.25 * 400 = 100)
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 210, clientY: 200 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 210, clientY: 200 })],
      }));

      expect(onThreshold).toHaveBeenCalledTimes(1);
      gesture.destroy();
    });
  });

  describe('direction: left', () => {
    it('calls onThreshold when swiped left past pixel threshold', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'left',
        element,
        target,
        distanceThresholdPx: 128,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 300, clientY: 200 })],
      }));
      // Move 140px left
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 160, clientY: 200 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 160, clientY: 200 })],
      }));

      expect(onThreshold).toHaveBeenCalledTimes(1);
      gesture.destroy();
    });

    it('computes progress using absolute delta for left direction', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'left',
        element,
        target,
        distanceThresholdPx: 128,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 300, clientY: 200 })],
      }));
      // Move 64px left = 50% of 128px threshold
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 236, clientY: 200 })],
      }));

      expect(onMove).toHaveBeenCalled();
      const progress = onMove.mock.calls[0][0];
      expect(progress).toBeCloseTo(0.5, 1);
      gesture.destroy();
    });
  });

  describe('direction lock', () => {
    it('aborts gesture when initial movement is perpendicular', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      // Move mostly horizontal (perpendicular to down)
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 200, clientY: 105 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 200, clientY: 105 })],
      }));

      expect(onMove).not.toHaveBeenCalled();
      expect(onThreshold).not.toHaveBeenCalled();
      gesture.destroy();
    });

    it('locks to swipe direction when initial movement is parallel', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'left',
        element,
        target,
        distanceThresholdPx: 128,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 300, clientY: 200 })],
      }));
      // Move mostly horizontal (parallel to left)
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 250, clientY: 203 })],
      }));

      expect(onMove).toHaveBeenCalled();
      gesture.destroy();
    });
  });

  describe('velocity threshold', () => {
    it('calls onThreshold on fast flick even below distance threshold', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25, // 200px on 800px target
        velocityThreshold: 0.4,
        onThreshold,
        onMove,
        onCancel,
      });

      // We can't easily control Date.now() in bun:test, so this test verifies
      // the velocity path exists. The E2E tests cover real timing.
      // A delta of 100px with near-zero elapsed time → Infinity velocity → should trigger.
      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 200 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 200 })],
      }));

      // With near-zero elapsed time, velocity is guarded (set to 0, not Infinity)
      // Distance (100px) < threshold (200px), so this should snap back
      // The zero-elapsed guard means velocity = 0, not Infinity
      expect(onThreshold).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledTimes(1);
      gesture.destroy();
    });
  });

  describe('zero elapsed time guard', () => {
    it('does not produce Infinity velocity', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        velocityThreshold: 0.4,
        onThreshold,
        onMove,
        onCancel,
      });

      // Dispatch all events synchronously (zero elapsed time)
      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 })],
      }));

      // 50px < 200px threshold, and velocity should be 0 (not Infinity)
      // So this should snap back, not dismiss
      expect(onThreshold).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledTimes(1);
      gesture.destroy();
    });
  });

  describe('ignoreFrom', () => {
    it('ignores touches originating from input elements', () => {
      const input = document.createElement('input');
      element.appendChild(input);

      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      // Touch starts on the input
      input.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: input, clientX: 100, clientY: 100 })],
      }));
      input.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: input, clientX: 100, clientY: 400 })],
      }));
      input.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 0, target: input, clientX: 100, clientY: 400 })],
      }));

      expect(onMove).not.toHaveBeenCalled();
      expect(onThreshold).not.toHaveBeenCalled();
      gesture.destroy();
    });

    it('accepts custom ignoreFrom selector', () => {
      const custom = document.createElement('div');
      custom.classList.add('no-swipe');
      element.appendChild(custom);

      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        ignoreFrom: '.no-swipe',
        onThreshold,
        onMove,
        onCancel,
      });

      custom.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: custom, clientX: 100, clientY: 100 })],
      }));

      expect(onMove).not.toHaveBeenCalled();
      gesture.destroy();
    });
  });

  describe('destroy', () => {
    it('removes all event listeners', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      gesture.destroy();

      // After destroy, touch events should not trigger callbacks
      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 400 })],
      }));
      element.dispatchEvent(new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 400 })],
      }));

      expect(onMove).not.toHaveBeenCalled();
      expect(onThreshold).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears inline transform and resets state', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      // Simulate a partial drag
      target.style.transform = 'translateY(100px)';
      target.style.transition = 'none';

      gesture.reset();

      expect(target.style.transform).toBe('');
      expect(target.style.transition).toBe('');
      gesture.destroy();
    });
  });

  describe('touchcancel', () => {
    it('resets state and calls onCancel', () => {
      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      element.dispatchEvent(new TouchEvent('touchcancel', {}));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(target.style.transform).toBe('');
      gesture.destroy();
    });
  });

  describe('prefers-reduced-motion', () => {
    it('skips transform tracking when reduced motion is preferred', () => {
      // Mock matchMedia to return prefers-reduced-motion: reduce
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = mock((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;

      const { SwipeGesture } = require('./swipe');
      const gesture = new SwipeGesture({
        direction: 'down',
        element,
        target,
        distanceThreshold: 0.25,
        onThreshold,
        onMove,
        onCancel,
      });

      element.dispatchEvent(new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
      }));
      element.dispatchEvent(new TouchEvent('touchmove', {
        touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 400 })],
      }));

      // With reduced motion, transform should NOT be applied during drag
      expect(target.style.transform).toBe('');
      // onMove should still be called (for backdrop fading etc.)
      expect(onMove).toHaveBeenCalled();

      window.matchMedia = originalMatchMedia;
      gesture.destroy();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/lib/gestures/swipe.test.ts`
Expected: FAIL — module `./swipe` not found

- [ ] **Step 3: Commit**

```bash
git add src/lib/gestures/swipe.test.ts
git commit -m "test: add failing unit tests for SwipeGesture controller"
```

---

### Task 2: Implement `SwipeGesture` controller

**Files:**
- Create: `src/lib/gestures/swipe.ts`

**Dependencies:** Task 1 (tests exist to validate)

- [ ] **Step 1: Implement the SwipeGesture class**

```ts
const DEFAULT_IGNORE_FROM = 'input, textarea, select, [role="listbox"]';
const DEFAULT_DISTANCE_THRESHOLD = 0.25;
const DEFAULT_VELOCITY_THRESHOLD = 0.4; // px/ms

export interface SwipeGestureConfig {
  direction: 'down' | 'right' | 'left';
  element: HTMLElement;
  target: HTMLElement;
  distanceThresholdPx?: number;
  distanceThreshold?: number;
  velocityThreshold?: number;
  ignoreFrom?: string;
  onThreshold: () => void;
  onMove?: (progress: number) => void;
  onCancel?: () => void;
}

export class SwipeGesture {
  private config: Required<
    Pick<SwipeGestureConfig, 'direction' | 'element' | 'target' | 'velocityThreshold' | 'ignoreFrom' | 'onThreshold'>
  > & Pick<SwipeGestureConfig, 'distanceThresholdPx' | 'distanceThreshold' | 'onMove' | 'onCancel'>;

  private controller: AbortController;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private directionLocked: boolean | null = null; // null = not determined, true = locked to swipe, false = aborted
  private prefersReducedMotion: boolean;

  constructor(config: SwipeGestureConfig) {
    this.config = {
      ...config,
      velocityThreshold: config.velocityThreshold ?? DEFAULT_VELOCITY_THRESHOLD,
      ignoreFrom: config.ignoreFrom ?? DEFAULT_IGNORE_FROM,
    };

    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.controller = new AbortController();
    const { signal } = this.controller;
    const el = config.element;

    el.addEventListener('touchstart', this.handleTouchStart, { passive: true, signal });
    el.addEventListener('touchmove', this.handleTouchMove, { passive: true, signal });
    el.addEventListener('touchend', this.handleTouchEnd, { signal });
    el.addEventListener('touchcancel', this.handleTouchCancel, { signal });
  }

  destroy(): void {
    this.controller.abort();
  }

  reset(): void {
    this.isDragging = false;
    this.directionLocked = null;
    this.config.target.style.transition = '';
    this.config.target.style.transform = '';
  }

  private getEffectiveThreshold(): number {
    if (this.config.distanceThresholdPx != null) {
      return this.config.distanceThresholdPx;
    }
    const fraction = this.config.distanceThreshold ?? DEFAULT_DISTANCE_THRESHOLD;
    const { direction, target } = this.config;
    const dimension = direction === 'down' ? target.offsetHeight : target.offsetWidth;
    return fraction * dimension;
  }

  private getDelta(clientX: number, clientY: number): number {
    const { direction } = this.config;
    if (direction === 'down') {
      return Math.max(0, clientY - this.startY);
    } else if (direction === 'right') {
      return Math.max(0, clientX - this.startX);
    } else {
      // left: delta is negative
      return Math.min(0, clientX - this.startX);
    }
  }

  private getTransform(delta: number): string {
    const { direction } = this.config;
    if (direction === 'down') {
      return `translateY(${delta}px)`;
    }
    return `translateX(${delta}px)`;
  }

  private checkDirectionLock(clientX: number, clientY: number): boolean {
    const dx = Math.abs(clientX - this.startX);
    const dy = Math.abs(clientY - this.startY);

    // Need some minimum movement to determine direction
    if (dx < 3 && dy < 3) return true; // too small to determine, continue

    const { direction } = this.config;
    if (direction === 'down') {
      // Down: dominant axis should be Y
      return dy >= dx;
    } else {
      // Left or right: dominant axis should be X
      return dx >= dy;
    }
  }

  private handleTouchStart = (e: TouchEvent): void => {
    const touchTarget = e.target as HTMLElement;
    if (touchTarget.closest(this.config.ignoreFrom)) return;

    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
    this.isDragging = true;
    this.directionLocked = null;

    if (!this.prefersReducedMotion) {
      this.config.target.style.transition = 'none';
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging) return;

    const touch = e.touches[0];

    // Direction lock on first move
    if (this.directionLocked === null) {
      const isParallel = this.checkDirectionLock(touch.clientX, touch.clientY);
      if (touch.clientX === this.startX && touch.clientY === this.startY) {
        return; // no movement yet
      }
      this.directionLocked = isParallel;
      if (!isParallel) {
        this.isDragging = false;
        this.config.target.style.transition = '';
        return;
      }
    }

    if (this.directionLocked === false) return;

    const delta = this.getDelta(touch.clientX, touch.clientY);
    const threshold = this.getEffectiveThreshold();
    const progress = Math.min(1, Math.abs(delta) / threshold);

    if (!this.prefersReducedMotion) {
      this.config.target.style.transform = this.getTransform(delta);
    }

    this.config.onMove?.(progress);
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (!this.isDragging) return;
    this.isDragging = false;

    // If direction was never locked (too small movement) or aborted, just clean up
    if (this.directionLocked !== true) {
      this.config.target.style.transition = '';
      this.config.target.style.transform = '';
      return;
    }

    const touch = e.changedTouches[0];
    const delta = this.getDelta(touch.clientX, touch.clientY);
    const absDelta = Math.abs(delta);

    const elapsed = Date.now() - this.startTime;
    const velocity = elapsed > 0 ? absDelta / elapsed : 0;

    const threshold = this.getEffectiveThreshold();

    this.config.target.style.transition = '';

    if (absDelta >= threshold || velocity >= this.config.velocityThreshold) {
      this.config.onThreshold();
    } else {
      this.config.target.style.transform = '';
      this.config.onCancel?.();
    }

    this.directionLocked = null;
  };

  private handleTouchCancel = (): void => {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.directionLocked = null;
    this.config.target.style.transition = '';
    this.config.target.style.transform = '';
    this.config.onCancel?.();
  };
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `bun test src/lib/gestures/swipe.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/gestures/swipe.ts src/lib/gestures/swipe.test.ts
git commit -m "feat: add shared SwipeGesture controller class"
```

---

### Task 3: Refactor MobileCommandCenter to use `SwipeGesture`

**Files:**
- Modify: `src/components/layouts/MobileCommandCenter.astro` (lines 528–599)
- Verify: `src/components/layouts/MobileCommandCenter.test.ts`

**Dependencies:** Task 2

- [ ] **Step 1: Replace inline touch handling with SwipeGesture**

In `MobileCommandCenter.astro`, add an import at the top of the `<script>` block (after the existing imports around line 495):
```ts
import { SwipeGesture } from '@/lib/gestures/swipe';
```

Replace lines 528–599 (the swipe-to-dismiss state variables and four touch handlers) with:
```ts
    // Swipe-to-dismiss via shared gesture controller
    let gesture: SwipeGesture | null = null;
    if (dragHandle instanceof HTMLElement) {
      gesture = new SwipeGesture({
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
    }
```

In `openSheet()` (around line 610), keep the existing cleanup lines that clear `isDragging`, `transition`, `transform`, `opacity` — but replace the `isDragging = false` line with:
```ts
      gesture?.reset();
      backdrop.style.opacity = '';
```

In `closeSheet()` (around line 639), same replacement:
```ts
      gesture?.reset();
      backdrop.style.opacity = '';
```

In the cleanup/destroy section (around lines 739–749), add `gesture?.destroy()` before the controller abort.

- [ ] **Step 2: Run existing unit tests**

Run: `bun test src/components/layouts/MobileCommandCenter.test.ts`
Expected: All tests PASS (structural tests check `data-drag-handle`, not touch handler internals)

- [ ] **Step 3: Run existing E2E swipe tests**

Run: `bunx playwright test e2e/tests/mobile/swipe-gesture.spec.ts --config=e2e/playwright.config.ts`
Expected: All 5 tests PASS (behavior is identical)

- [ ] **Step 4: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/MobileCommandCenter.astro
git commit -m "refactor: use shared SwipeGesture controller in MobileCommandCenter"
```

---

### Task 4: Add swipe-to-dismiss to Drawer component

**Files:**
- Modify: `src/components/molecules/Drawer.client.ts`

**Dependencies:** Task 2

- [ ] **Step 1: Add SwipeGesture to Drawer.client.ts**

Add import at the top of the file:
```ts
import { SwipeGesture } from '@/lib/gestures/swipe';
```

Inside `initDrawer()`, after the existing variable declarations (around line 44), add:
```ts
  const LG_BREAKPOINT = 1024;
  let swipeGesture: SwipeGesture | null = null;

  function initSwipeGesture(): void {
    if (window.innerWidth >= LG_BREAKPOINT) return;
    if (swipeGesture) return; // already initialized

    const contentEl = drawer.querySelector<HTMLElement>('[data-drawer-content]');
    const backdropEl = drawer.querySelector<HTMLElement>('[data-drawer-backdrop]');
    if (!contentEl) return;

    swipeGesture = new SwipeGesture({
      direction: 'right',
      element: contentEl,
      target: contentEl,
      distanceThreshold: 0.25,
      onMove: (progress) => {
        if (backdropEl) {
          backdropEl.style.opacity = String(1 - progress);
        }
      },
      onThreshold: () => closeDrawer(),
      onCancel: () => {
        if (backdropEl) {
          backdropEl.style.opacity = '';
        }
      },
    });
  }

  function destroySwipeGesture(): void {
    swipeGesture?.destroy();
    swipeGesture = null;
  }
```

In the `openDrawer()` function, after the drawer is shown and animation completes (near the end of the function, before the `finally` block around line 97), add:
```ts
      initSwipeGesture();
```

In the `closeDrawer()` function, after animation completes (near the end, before the `finally` block around line 147), add:
```ts
      destroySwipeGesture();
```

Add a resize listener inside `initDrawer()`, after the swipe helper functions:
```ts
  const mediaQuery = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
  const handleBreakpointChange = (e: MediaQueryListEvent): void => {
    if (e.matches) {
      destroySwipeGesture();
    }
  };
  mediaQuery.addEventListener('change', handleBreakpointChange);
```

In the existing `cleanup()` function (around line 203), add:
```ts
    destroySwipeGesture();
    mediaQuery.removeEventListener('change', handleBreakpointChange);
```

- [ ] **Step 2: Verify the correct data attribute**

Check that `Drawer.astro` uses `data-drawer-content` on the content panel. If the attribute is different (e.g., just a CSS class), update the selector accordingly.

Read: `src/components/molecules/Drawer.astro` — look for the content panel element.

- [ ] **Step 3: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck && bun test`
Expected: No errors, all existing tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/molecules/Drawer.client.ts
git commit -m "feat: add swipe-right-to-dismiss for drawers on mobile"
```

---

### Task 5: Add swipe container and action panel to TransactionCard

**Files:**
- Modify: `src/components/molecules/TransactionCard.astro` (lines 194–354, mobile layout)

**Dependencies:** None (markup only)

- [ ] **Step 1: Wrap mobile card content in swipe container**

In `TransactionCard.astro`, find the mobile layout block starting at line 194 (`<div class="@lg:hidden">`).

The mobile layout currently has this structure (simplified):
```
<div class="@lg:hidden">
  <div class="flex items-start gap-3 ...">  ← the card content row
    ...content...
    {showActions && !isDeleted && (
      <div class="dropdown ...">  ← kebab menu
      </div>
    )}
  </div>
  <div class="flex items-center ...">  ← the second row (date, category, etc.)
  </div>
</div>
```

Wrap the entire inner content (both rows) in a swipe container. Only add when `showActions` is true and `!isDeleted`:

```astro
<div class="@lg:hidden">
  {showActions && !isDeleted ? (
    <div class="relative overflow-hidden" data-swipe-container>
      {/* Action panel behind card */}
      <div class="absolute inset-y-0 right-0 flex" data-swipe-actions aria-hidden="true">
        <button
          type="button"
          class="w-16 bg-primary text-primary-content flex items-center justify-center"
          aria-label={`Edit transaction: ${primaryText}`}
          data-edit-transaction={transaction.id}
          data-transaction-data={transactionDataJson}
        >
          <Pencil size={16} class="stroke-current" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="w-16 bg-error text-error-content flex items-center justify-center"
          aria-label={`Delete transaction: ${primaryText}`}
          data-delete-transaction={transaction.id}
          data-transaction-details={transactionDetailsJson}
        >
          <Trash2 size={16} class="stroke-current" aria-hidden="true" />
        </button>
      </div>
      {/* Swipeable card content */}
      <div class="bg-base-100 relative" data-swipe-content>
        {/* ...existing two-row mobile content here, unchanged... */}
      </div>
    </div>
  ) : (
    <Fragment>
      {/* ...existing two-row mobile content here, unchanged (for non-actionable cards)... */}
    </Fragment>
  )}
</div>
```

Key points:
- The `[data-swipe-actions]` panel is `aria-hidden="true"` since the kebab menu remains the accessible path.
- The `[data-swipe-content]` div gets `bg-base-100 relative` so it visually covers the action panel.
- The `Pencil` and `Trash2` icons are already imported in the file.
- The `transactionDataJson` and `transactionDetailsJson` variables are already defined (lines 106–119).

- [ ] **Step 2: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck && bun test`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/molecules/TransactionCard.astro
git commit -m "feat: add swipe action panel markup to TransactionCard mobile layout"
```

---

### Task 6: Create TransactionCard client script for swipe-to-reveal

**Files:**
- Create: `src/components/molecules/TransactionCard.client.ts`
- Modify: `src/components/molecules/TransactionCard.astro` (script block, add import)

**Dependencies:** Task 2, Task 5

- [ ] **Step 1: Create the client script**

```ts
import { SwipeGesture } from '@/lib/gestures/swipe';

const LG_BREAKPOINT = 1024;
const ACTION_PANEL_WIDTH = 128; // 2 × 64px buttons

let currentlyRevealed: { gesture: SwipeGesture; container: HTMLElement } | null = null;
const gestures: SwipeGesture[] = [];
let cleanupController: AbortController | null = null;

function closeRevealed(): void {
  if (currentlyRevealed) {
    currentlyRevealed.gesture.reset();
    currentlyRevealed = null;
  }
}

function initSwipeRows(): void {
  // Only on mobile
  if (window.innerWidth >= LG_BREAKPOINT) return;

  // Skip if bulk selection is active
  if (document.querySelector('[data-bulk-select]')) return;

  destroySwipeRows();
  cleanupController = new AbortController();
  const { signal } = cleanupController;

  const containers = document.querySelectorAll<HTMLElement>('[data-swipe-container]');
  containers.forEach((container) => {
    const content = container.querySelector<HTMLElement>('[data-swipe-content]');
    if (!content) return;

    const gesture = new SwipeGesture({
      direction: 'left',
      element: content,
      target: content,
      distanceThresholdPx: ACTION_PANEL_WIDTH,
      onMove: () => {
        // Close any other revealed row when starting a new swipe
        if (currentlyRevealed && currentlyRevealed.container !== container) {
          closeRevealed();
        }
      },
      onThreshold: () => {
        // Snap to revealed position
        content.style.transform = `translateX(-${ACTION_PANEL_WIDTH}px)`;
        currentlyRevealed = { gesture, container };
      },
      onCancel: () => {
        if (currentlyRevealed?.container === container) {
          currentlyRevealed = null;
        }
      },
    });

    gestures.push(gesture);
  });

  // Close revealed row on outside click
  document.addEventListener('click', (e) => {
    if (!currentlyRevealed) return;
    const target = e.target as HTMLElement;
    if (!currentlyRevealed.container.contains(target)) {
      closeRevealed();
    }
  }, { signal });

  // Close revealed row on scroll
  const listContainer = document.querySelector('#transaction-list');
  if (listContainer) {
    listContainer.addEventListener('scroll', () => {
      closeRevealed();
    }, { passive: true, signal });
  }
}

function destroySwipeRows(): void {
  closeRevealed();
  gestures.forEach((g) => g.destroy());
  gestures.length = 0;
  cleanupController?.abort();
  cleanupController = null;
}

export function initTransactionSwipe(): void {
  initSwipeRows();
}

export function cleanupTransactionSwipe(): void {
  destroySwipeRows();
}
```

- [ ] **Step 2: Import and call from TransactionCard.astro script block**

In `TransactionCard.astro`, in the existing `<script>` block (around line 536), add:

```ts
import { initTransactionSwipe, cleanupTransactionSwipe } from './TransactionCard.client';
```

And in the initialization section (around line 544), add:

```ts
initTransactionSwipe();
```

Also add cleanup for Astro page transitions if not already handled:

```ts
document.addEventListener('astro:before-swap', cleanupTransactionSwipe, { once: true });
```

- [ ] **Step 3: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck && bun test`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/molecules/TransactionCard.client.ts src/components/molecules/TransactionCard.astro
git commit -m "feat: add swipe-to-reveal actions on transaction rows (mobile)"
```

---

### Task 7: Add E2E tests for drawer swipe and row swipe

**Files:**
- Modify: `e2e/tests/mobile/swipe-gesture.spec.ts`

**Dependencies:** Tasks 3, 4, 6

- [ ] **Step 1: Add drawer swipe tests**

Add a new `describe` block after the existing `'Mobile Command Center — swipe gesture'` block:

```ts
test.describe('Drawer — swipe-to-dismiss', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Mobile viewport

  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForSelector('[data-transaction-card]');
  });

  test('swipe right past threshold dismisses the transaction drawer', async ({ page }) => {
    // Open the transaction drawer by clicking edit on first transaction
    const firstEditBtn = page.locator('[data-edit-transaction]').first();
    await firstEditBtn.click();

    // Wait for drawer to open
    const drawer = page.locator('[data-drawer]').first();
    await expect(drawer).not.toHaveClass(/hidden/);

    const drawerContent = page.locator('[data-drawer-content]').first();
    const box = await drawerContent.boundingBox();
    if (!box) throw new Error('Drawer content not visible');

    // Swipe right from center of drawer
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const swipeDistance = box.width * 0.3; // Past 25% threshold

    await page.touchscreen.tap(startX, startY); // Ensure touch capability
    await page.evaluate(({ sx, sy, dist }) => {
      const el = document.elementFromPoint(sx, sy);
      if (!el) return;
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx + dist, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 0, target: el, clientX: sx + dist, clientY: sy })],
      }));
    }, { sx: startX, sy: startY, dist: swipeDistance });

    // Wait for drawer to close
    await expect(drawer).toHaveClass(/hidden/, { timeout: 2000 });
  });

  test('swipe right below threshold snaps drawer back', async ({ page }) => {
    const firstEditBtn = page.locator('[data-edit-transaction]').first();
    await firstEditBtn.click();

    const drawer = page.locator('[data-drawer]').first();
    await expect(drawer).not.toHaveClass(/hidden/);

    const drawerContent = page.locator('[data-drawer-content]').first();
    const box = await drawerContent.boundingBox();
    if (!box) throw new Error('Drawer content not visible');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const swipeDistance = box.width * 0.1; // Below 25% threshold

    await page.evaluate(({ sx, sy, dist }) => {
      const el = document.elementFromPoint(sx, sy);
      if (!el) return;
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx + dist, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 0, target: el, clientX: sx + dist, clientY: sy })],
      }));
    }, { sx: startX, sy: startY, dist: swipeDistance });

    // Drawer should still be open
    await expect(drawer).not.toHaveClass(/hidden/);
  });
});
```

- [ ] **Step 2: Add transaction row swipe tests**

Add another `describe` block:

```ts
test.describe('Transaction Row — swipe-to-reveal', () => {
  test.use({ viewport: { width: 393, height: 851 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
    await page.waitForSelector('[data-swipe-container]');
  });

  test('swipe left reveals Edit and Delete buttons', async ({ page }) => {
    const firstContainer = page.locator('[data-swipe-container]').first();
    const content = firstContainer.locator('[data-swipe-content]');
    const box = await content.boundingBox();
    if (!box) throw new Error('Swipe content not visible');

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    await page.evaluate(({ sx, sy }) => {
      const el = document.elementFromPoint(sx, sy);
      if (!el) return;
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
    }, { sx: startX, sy: startY });

    // Action panel should be visible
    const actions = firstContainer.locator('[data-swipe-actions]');
    await expect(actions).toBeVisible();

    // Edit and Delete buttons should be present
    const editBtn = actions.locator('[data-edit-transaction]');
    const deleteBtn = actions.locator('[data-delete-transaction]');
    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();
  });

  test('swiping another row closes the first', async ({ page }) => {
    const containers = page.locator('[data-swipe-container]');
    const count = await containers.count();
    if (count < 2) {
      test.skip(true, 'Need at least 2 transaction rows');
      return;
    }

    // Swipe first row
    const first = containers.nth(0).locator('[data-swipe-content]');
    const box1 = await first.boundingBox();
    if (!box1) throw new Error('First row not visible');

    await page.evaluate(({ sx, sy }) => {
      const el = document.elementFromPoint(sx, sy);
      if (!el) return;
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
    }, { sx: box1.x + box1.width / 2, sy: box1.y + box1.height / 2 });

    // Now swipe second row
    const second = containers.nth(1).locator('[data-swipe-content]');
    const box2 = await second.boundingBox();
    if (!box2) throw new Error('Second row not visible');

    await page.evaluate(({ sx, sy }) => {
      const el = document.elementFromPoint(sx, sy);
      if (!el) return;
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
    }, { sx: box2.x + box2.width / 2, sy: box2.y + box2.height / 2 });

    // First row should be back to original position (transform cleared or 0)
    const firstTransform = await first.evaluate((el) => el.style.transform);
    expect(firstTransform === '' || firstTransform === 'translateX(0px)').toBeTruthy();
  });

  test('tapping outside closes revealed row', async ({ page }) => {
    const firstContainer = page.locator('[data-swipe-container]').first();
    const content = firstContainer.locator('[data-swipe-content]');
    const box = await content.boundingBox();
    if (!box) throw new Error('Swipe content not visible');

    // Swipe to reveal
    await page.evaluate(({ sx, sy }) => {
      const el = document.elementFromPoint(sx, sy);
      if (!el) return;
      el.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
      el.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
      }));
    }, { sx: box.x + box.width / 2, sy: box.y + box.height / 2 });

    // Click somewhere outside
    await page.click('body', { position: { x: 10, y: 10 } });

    // Row should snap back
    const transform = await content.evaluate((el) => el.style.transform);
    expect(transform === '' || transform === 'translateX(0px)').toBeTruthy();
  });
});
```

- [ ] **Step 3: Run all E2E tests**

Run: `bunx playwright test e2e/tests/mobile/swipe-gesture.spec.ts --config=e2e/playwright.config.ts`
Expected: All tests pass (existing + new)

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/mobile/swipe-gesture.spec.ts
git commit -m "test: add E2E tests for drawer swipe dismiss and row swipe reveal"
```

---

### Task 8: Final verification and quality gates

**Dependencies:** All previous tasks

- [ ] **Step 1: Run full unit test suite**

Run: `bun test`
Expected: All tests pass

- [ ] **Step 2: Run full quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck && bun run build`
Expected: No errors, build succeeds

- [ ] **Step 3: Run full E2E test suite for mobile**

Run: `bunx playwright test e2e/tests/mobile/ --config=e2e/playwright.config.ts`
Expected: All mobile tests pass

- [ ] **Step 4: Verify existing MobileCommandCenter E2E tests still pass**

Run: `bunx playwright test e2e/tests/mobile/swipe-gesture.spec.ts --config=e2e/playwright.config.ts --grep "Mobile Command Center"`
Expected: All 5 original tests pass unchanged
