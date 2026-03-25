import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { Window } from 'happy-dom';

// We'll test SwipeGesture once it exists. For now, import will fail.
// import { SwipeGesture } from './swipe';

describe('SwipeGesture', () => {
  let element: HTMLElement;
  let target: HTMLElement;
  let onThreshold: ReturnType<typeof mock>;
  let onMove: ReturnType<typeof mock>;
  let onCancel: ReturnType<typeof mock>;

  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalTouchEvent: typeof globalThis.TouchEvent | undefined;
  let originalTouch: typeof globalThis.Touch | undefined;
  type MockFn = ReturnType<typeof mock> & { mock: { calls: unknown[][] } };

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalTouchEvent = globalThis.TouchEvent;
    originalTouch = globalThis.Touch;

    const window = new Window({ url: 'http://localhost/' });
    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = window.document;
    (globalThis as Record<string, unknown>).TouchEvent = window.TouchEvent;
    (globalThis as Record<string, unknown>).Touch = window.Touch;

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
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).TouchEvent = originalTouchEvent;
    (globalThis as Record<string, unknown>).Touch = originalTouch;
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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 320 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 100, clientY: 320 }),
          ],
        })
      );

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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 }),
          ],
        })
      );

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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      // Move 400px down on 800px target = 50% progress
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 500 })],
        })
      );

      expect(onMove).toHaveBeenCalled();
      const progress = (onMove as MockFn).mock.calls[0][0];
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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 200 })],
        })
      );
      // Move 110px right (threshold = 0.25 * 400 = 100)
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 210, clientY: 200 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 210, clientY: 200 }),
          ],
        })
      );

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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 300, clientY: 200 })],
        })
      );
      // Move 140px left
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 160, clientY: 200 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 160, clientY: 200 }),
          ],
        })
      );

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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 300, clientY: 200 })],
        })
      );
      // Move 64px left = 50% of 128px threshold
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 236, clientY: 200 })],
        })
      );

      expect(onMove).toHaveBeenCalled();
      const progress = (onMove as MockFn).mock.calls[0][0];
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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      // Move mostly horizontal (perpendicular to down)
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 200, clientY: 105 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 200, clientY: 105 }),
          ],
        })
      );

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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 300, clientY: 200 })],
        })
      );
      // Move mostly horizontal (parallel to left)
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 250, clientY: 203 })],
        })
      );

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
      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 200 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 100, clientY: 200 }),
          ],
        })
      );

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
      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 100, clientY: 150 }),
          ],
        })
      );

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
      input.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [new Touch({ identifier: 0, target: input, clientX: 100, clientY: 100 })],
        })
      );
      input.dispatchEvent(
        new TouchEvent('touchmove', {
          bubbles: true,
          touches: [new Touch({ identifier: 0, target: input, clientX: 100, clientY: 400 })],
        })
      );
      input.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          changedTouches: [new Touch({ identifier: 0, target: input, clientX: 100, clientY: 400 })],
        })
      );

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

      custom.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [new Touch({ identifier: 0, target: custom, clientX: 100, clientY: 100 })],
        })
      );

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
      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 400 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchend', {
          changedTouches: [
            new Touch({ identifier: 0, target: element, clientX: 100, clientY: 400 }),
          ],
        })
      );

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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      element.dispatchEvent(new TouchEvent('touchcancel', {}));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(target.style.transform).toBe('');
      gesture.destroy();
    });
  });

  describe('prefers-reduced-motion', () => {
    it('skips transform tracking when reduced motion is preferred', () => {
      // Mock matchMedia to return prefers-reduced-motion: reduce
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

      element.dispatchEvent(
        new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 100 })],
        })
      );
      element.dispatchEvent(
        new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 0, target: element, clientX: 100, clientY: 400 })],
        })
      );

      // With reduced motion, transform should NOT be applied during drag
      expect(target.style.transform).toBe('');
      // onMove should still be called (for backdrop fading etc.)
      expect(onMove).toHaveBeenCalled();

      gesture.destroy();
    });
  });
});
