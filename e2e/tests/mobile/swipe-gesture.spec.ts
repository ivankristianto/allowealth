import { test, expect } from '@playwright/test';

/**
 * Fast swipe — all touch events dispatched synchronously in a single evaluate call.
 * With the zero-elapsed guard (`elapsed > 0 ? … : 0`), velocity is 0 when all events
 * fire in the same JS turn.  Only the distance threshold can trigger dismissal.
 * Use for distance-threshold tests with large deltaY.
 */
async function swipeDragHandle(
  page: import('@playwright/test').Page,
  deltaY: number
): Promise<void> {
  await page.evaluate((dy: number) => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');

    const rect = handle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const mkTouch = (x: number, y: number) =>
      new Touch({
        identifier: 1,
        target: handle,
        clientX: x,
        clientY: y,
        radiusX: 1,
        radiusY: 1,
        force: 1,
        rotationAngle: 0,
      });

    const fire = (type: string, y: number, touches: Touch[]) =>
      handle.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches,
          changedTouches: [mkTouch(cx, y)],
        })
      );

    fire('touchstart', startY, [mkTouch(cx, startY)]);
    fire('touchmove', startY + Math.floor(dy * 0.5), [mkTouch(cx, startY + Math.floor(dy * 0.5))]);
    fire('touchend', startY + dy, []);
  }, deltaY);
}

/**
 * Slow swipe — touch events dispatched across separate evaluate calls with
 * real delays between them.  Total elapsed ≈ 300 ms, so velocity stays well
 * below the 0.4 px/ms threshold.  Only the distance threshold matters.
 * Use for snap-back tests (small deltaY, slow speed).
 */
async function slowSwipeDragHandle(
  page: import('@playwright/test').Page,
  deltaY: number
): Promise<void> {
  // 1) touchstart
  await page.evaluate(() => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const rect = handle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const t = new Touch({
      identifier: 1,
      target: handle,
      clientX: cx,
      clientY: startY,
      radiusX: 1,
      radiusY: 1,
      force: 1,
      rotationAngle: 0,
    });
    handle.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [t],
        changedTouches: [t],
      })
    );
  });

  await page.waitForTimeout(150);

  // 2) touchmove
  await page.evaluate((dy: number) => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const rect = handle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2 + Math.floor(dy * 0.5);
    const t = new Touch({
      identifier: 1,
      target: handle,
      clientX: cx,
      clientY: midY,
      radiusX: 1,
      radiusY: 1,
      force: 1,
      rotationAngle: 0,
    });
    handle.dispatchEvent(
      new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [t],
        changedTouches: [t],
      })
    );
  }, deltaY);

  await page.waitForTimeout(150);

  // 3) touchend
  await page.evaluate((dy: number) => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const rect = handle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const endY = rect.top + rect.height / 2 + dy;
    const t = new Touch({
      identifier: 1,
      target: handle,
      clientX: cx,
      clientY: endY,
      radiusX: 1,
      radiusY: 1,
      force: 1,
      rotationAngle: 0,
    });
    handle.dispatchEvent(
      new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        touches: [],
        changedTouches: [t],
      })
    );
  }, deltaY);
}

/**
 * Flick swipe — short real delays between events so velocity is measurable
 * and exceeds the 0.4 px/ms threshold.
 * Example: deltaY=50px in ~30ms total → velocity ≈ 1.67 px/ms.
 * Use for velocity-threshold dismiss tests with small deltaY.
 */
async function flickSwipeDragHandle(
  page: import('@playwright/test').Page,
  deltaY: number
): Promise<void> {
  // 1) touchstart
  await page.evaluate(() => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const rect = handle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const t = new Touch({
      identifier: 1,
      target: handle,
      clientX: cx,
      clientY: startY,
      radiusX: 1,
      radiusY: 1,
      force: 1,
      rotationAngle: 0,
    });
    handle.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [t],
        changedTouches: [t],
      })
    );
  });

  // 2) short pause — enough to register elapsed time but short enough for high velocity
  await page.waitForTimeout(50);

  // 3) touchmove + touchend in quick succession
  await page.evaluate((dy: number) => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const rect = handle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const mkTouch = (x: number, y: number) =>
      new Touch({
        identifier: 1,
        target: handle,
        clientX: x,
        clientY: y,
        radiusX: 1,
        radiusY: 1,
        force: 1,
        rotationAngle: 0,
      });

    const fire = (type: string, y: number, touches: Touch[]) =>
      handle.dispatchEvent(
        new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches,
          changedTouches: [mkTouch(cx, y)],
        })
      );

    fire('touchmove', startY + Math.floor(dy * 0.5), [mkTouch(cx, startY + Math.floor(dy * 0.5))]);
    fire('touchend', startY + dy, []);
  }, deltaY);
}

/**
 * Opens the command sheet by clicking the menu toggle button.
 * Waits until the sheet is visible and the open animation has finished.
 */
async function openSheet(page: import('@playwright/test').Page): Promise<void> {
  await page.click('[data-menu-toggle]');
  await page.waitForSelector('[data-command-sheet]:not([inert])', { timeout: 3000 });
  // Wait for the CSS open animation to fully complete.
  // The sheet slides up — we detect completion when the drag handle's top
  // position stabilises across two animation frames.
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const handle = document.querySelector('[data-drag-handle]');
        if (!handle) return resolve(false);

        let prevTop = handle.getBoundingClientRect().top;
        const check = () => {
          const top = handle.getBoundingClientRect().top;
          if (Math.abs(top - prevTop) < 0.5) {
            resolve(true);
          } else {
            prevTop = top;
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      }),
    { timeout: 2000 }
  );
}

test.describe('Mobile Command Center — swipe gesture', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the menu toggle button to be visible (mobile nav renders at bottom)
    await page.waitForSelector('[data-menu-toggle]', { timeout: 5000 });
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

    // Slow swipe 60px — well below the ~181px distance threshold.
    // slowSwipeDragHandle ensures velocity stays below 0.4 px/ms,
    // so neither threshold is crossed and the sheet snaps back.
    await slowSwipeDragHandle(page, 60);

    // Sheet should still be open (no inert attribute)
    await expect(sheet).not.toHaveAttribute('inert');
    // Inline transform should be cleared after snap-back
    await expect(sheet).not.toHaveCSS('transform', /translateY\([^0]/);
  });

  test('close button still dismisses the sheet after gesture is initialized', async ({ page }) => {
    await openSheet(page);

    const sheet = page.locator('[data-command-sheet]');
    await expect(sheet).not.toHaveAttribute('inert');

    // Do a slow short swipe (snap-back) to exercise the gesture handlers
    await slowSwipeDragHandle(page, 40);
    await expect(sheet).not.toHaveAttribute('inert');

    // Then close via the close button
    await page.click('[data-menu-close]');
    await expect(sheet).toHaveAttribute('inert', '', { timeout: 1000 });
  });

  test('fast flick (velocity threshold) dismisses the sheet with small deltaY', async ({
    page,
  }) => {
    await openSheet(page);

    const sheet = page.locator('[data-command-sheet]');
    await expect(sheet).not.toHaveAttribute('inert');

    // flickSwipeDragHandle dispatches touchstart, waits ~50ms, then touchmove + touchend.
    // With deltaY = 100px and elapsed ≈ 50ms, velocity ≈ 2 px/ms >> 0.4 px/ms threshold.
    // Distance 100px is well below the ~181px distance threshold — only velocity triggers dismiss.
    await flickSwipeDragHandle(page, 100);

    await expect(sheet).toHaveAttribute('inert', '', { timeout: 1000 });
  });

  test('drag handle element is present in the DOM', async ({ page }) => {
    await openSheet(page);
    await expect(page.locator('[data-drag-handle]')).toBeVisible();
  });
});
