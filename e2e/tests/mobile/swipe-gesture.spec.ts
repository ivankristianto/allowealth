import { test, expect } from '@playwright/test';
import {
  createTransactionViaAPI,
  createCategoryViaAPI,
  createAccountViaAPI,
  deleteTransactionViaAPI,
  deleteCategoryViaAPI,
} from '../../helpers';
import { TEST_AMOUNTS } from '../../helpers/test-data';

const AUTH_STATE_PATH = 'e2e/.auth/user.json';
const TEST_RUN_ID = `swipe-${Date.now().toString(36)}`;

/** Augmented window type used by multi-step touch helpers to share state across evaluate calls. */
type WindowWithSwipeState = typeof window & {
  __swipeGestureStart?: { cx: number; startY: number };
};

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
  // 1) touchstart — cache start coords in window state so later steps are
  //    anchored to the original position even after the sheet is translated.
  await page.evaluate(() => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const rect = handle.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    (window as WindowWithSwipeState).__swipeGestureStart = { cx, startY };
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

  // 2) touchmove — use cached start coords so midY is relative to touchstart,
  //    not to the already-translated sheet position.
  await page.evaluate((dy: number) => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const state = (window as WindowWithSwipeState).__swipeGestureStart;
    if (!state) throw new Error('missing swipe gesture start state');
    const { cx, startY } = state;
    const midY = startY + Math.floor(dy * 0.5);
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

  // 3) touchend — use cached start coords so endY is relative to touchstart.
  await page.evaluate((dy: number) => {
    const handle = document.querySelector('[data-drag-handle]') as HTMLElement;
    if (!handle) throw new Error('[data-drag-handle] not found');
    const state = (window as WindowWithSwipeState).__swipeGestureStart;
    if (!state) throw new Error('missing swipe gesture start state');
    const { cx, startY } = state;
    const endY = startY + dy;
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
    delete (window as WindowWithSwipeState).__swipeGestureStart;
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
    (window as WindowWithSwipeState).__swipeGestureStart = {
      cx,
      startY,
    };
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
    const state = (window as WindowWithSwipeState).__swipeGestureStart;
    if (!state) throw new Error('missing swipe gesture start state');
    const { cx, startY } = state;

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
    delete (window as WindowWithSwipeState).__swipeGestureStart;
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

/**
 * Feature detection for Touch API support.
 * Desktop Chrome (non-mobile viewport) may not support Touch/TouchEvent constructors.
 * Skip tests that depend on touch simulation when not available.
 */
function hasTouchAPI(): boolean {
  try {
    return typeof Touch !== 'undefined' && typeof TouchEvent !== 'undefined';
  } catch {
    return false;
  }
}

test.describe('Mobile Command Center — swipe gesture', () => {
  test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

  test.beforeEach(async ({ page, browserName }) => {
    // Touch API feature detection - skip if not supported (e.g., Desktop Chrome)
    const touchSupported = await page.evaluate(() => {
      try {
        return typeof Touch !== 'undefined' && typeof TouchEvent !== 'undefined';
      } catch {
        return false;
      }
    });
    if (!touchSupported) {
      test.skip(true, 'Touch API not supported in this browser configuration');
      return;
    }
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
    const transform = await sheet.evaluate((el) => (el as HTMLElement).style.transform);
    expect(transform === '' || transform === 'translateY(0px)').toBeTruthy();
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

test.describe('Swipe gestures on transactions page', () => {
  let testCategoryId: string;
  let testAccountId: string;
  let testTransactionIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
    const page = await context.newPage();
    try {
      const category = await createCategoryViaAPI(page.request, {
        name: `Swipe Test ${TEST_RUN_ID}`,
        type: 'expense',
        icon: 'shopping-cart',
      });
      testCategoryId = category.id;

      const account = await createAccountViaAPI(page.request, {
        name: `Swipe Acct ${TEST_RUN_ID}`,
        type: 'bank_account',
        balance: TEST_AMOUNTS.SMALL_INCOME,
        currency: 'IDR',
      });
      testAccountId = account.id;

      // Create 2 transactions so we can test multi-row swipe interactions
      for (let i = 0; i < 2; i++) {
        const tx = await createTransactionViaAPI(page.request, {
          type: 'expense',
          amount: TEST_AMOUNTS.SMALL_EXPENSE,
          categoryId: testCategoryId,
          accountId: testAccountId,
          description: `Swipe E2E #${i + 1} ${TEST_RUN_ID}`,
        });
        testTransactionIds.push(tx.id);
      }
    } finally {
      await context.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: AUTH_STATE_PATH });
    const page = await context.newPage();
    try {
      for (const id of testTransactionIds) {
        await deleteTransactionViaAPI(page.request, id).catch(() => {});
      }
      if (testCategoryId) {
        await deleteCategoryViaAPI(page.request, testCategoryId).catch(() => {});
      }
      // Account cleanup not strictly needed (no deleteAccountViaAPI), but transactions are gone
    } finally {
      await context.close();
    }
  });

  test.describe('Drawer — swipe-to-dismiss', () => {
    test.use({ viewport: { width: 393, height: 851 } }); // Mobile viewport

    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions');
      await page.waitForSelector('[data-transaction-card]', { timeout: 10000 });
    });

    test('swipe right past threshold dismisses the transaction drawer', async ({ page }) => {
      // Open the kebab menu on the first transaction, then click Edit
      const firstKebab = page
        .locator('[data-transaction-actions] button[aria-haspopup="menu"]')
        .first();
      await firstKebab.click();
      const editMenuItem = page
        .locator('[data-transaction-actions] [data-edit-transaction]')
        .first();
      await editMenuItem.click();

      // Wait for drawer to open
      const drawer = page.locator('[data-drawer]').first();
      await expect(drawer).toHaveClass(/drawer-open/, { timeout: 5000 });

      // Wait for the open animation to complete and SwipeGesture to be initialized.
      // The drawer-open class is added before the 400ms enter animation starts;
      // initSwipeGesture() runs after the animation Promise resolves.
      await page.waitForTimeout(600);

      const drawerContent = page.locator('[data-drawer-content]').first();
      const box = await drawerContent.boundingBox();
      if (!box) throw new Error('Drawer content not visible');

      // Target the drawer content panel directly (not elementFromPoint which may
      // resolve to an input/textarea that SwipeGesture ignores).
      // Use the slow-swipe pattern (separate evaluate calls with real delays)
      // so elapsed time > 10ms and threshold detection works correctly.
      const startX = box.x + box.width * 0.25; // Start in the left quarter to avoid form inputs
      const startY = box.y + 30; // Near the top header area, away from form fields
      const swipeDistance = box.width * 0.35; // Past 25% threshold

      // 1) touchstart
      await page.evaluate(
        ({ sx, sy }) => {
          const el = document.querySelector('[data-drawer-content]') as HTMLElement;
          if (!el) throw new Error('[data-drawer-content] not found');
          const t = new Touch({
            identifier: 1,
            target: el,
            clientX: sx,
            clientY: sy,
            radiusX: 1,
            radiusY: 1,
            force: 1,
            rotationAngle: 0,
          });
          el.dispatchEvent(
            new TouchEvent('touchstart', {
              bubbles: true,
              cancelable: true,
              touches: [t],
              changedTouches: [t],
            })
          );
        },
        { sx: startX, sy: startY }
      );

      await page.waitForTimeout(50);

      // 2) touchmove — intermediate position
      await page.evaluate(
        ({ sx, sy, dist }) => {
          const el = document.querySelector('[data-drawer-content]') as HTMLElement;
          if (!el) throw new Error('[data-drawer-content] not found');
          const midX = sx + dist * 0.5;
          const t = new Touch({
            identifier: 1,
            target: el,
            clientX: midX,
            clientY: sy,
            radiusX: 1,
            radiusY: 1,
            force: 1,
            rotationAngle: 0,
          });
          el.dispatchEvent(
            new TouchEvent('touchmove', {
              bubbles: true,
              cancelable: true,
              touches: [t],
              changedTouches: [t],
            })
          );
        },
        { sx: startX, sy: startY, dist: swipeDistance }
      );

      await page.waitForTimeout(50);

      // 3) touchend — final position past threshold
      await page.evaluate(
        ({ sx, sy, dist }) => {
          const el = document.querySelector('[data-drawer-content]') as HTMLElement;
          if (!el) throw new Error('[data-drawer-content] not found');
          const endX = sx + dist;
          const t = new Touch({
            identifier: 1,
            target: el,
            clientX: endX,
            clientY: sy,
            radiusX: 1,
            radiusY: 1,
            force: 1,
            rotationAngle: 0,
          });
          el.dispatchEvent(
            new TouchEvent('touchend', {
              bubbles: true,
              cancelable: true,
              touches: [],
              changedTouches: [t],
            })
          );
        },
        { sx: startX, sy: startY, dist: swipeDistance }
      );

      // Wait for drawer to close
      await expect(drawer).not.toHaveClass(/drawer-open/, { timeout: 3000 });
    });

    test('swipe right below threshold snaps drawer back', async ({ page }) => {
      const firstKebab = page
        .locator('[data-transaction-actions] button[aria-haspopup="menu"]')
        .first();
      await firstKebab.click();
      const editMenuItem = page
        .locator('[data-transaction-actions] [data-edit-transaction]')
        .first();
      await editMenuItem.click();

      const drawer = page.locator('[data-drawer]').first();
      await expect(drawer).toHaveClass(/drawer-open/, { timeout: 5000 });

      const drawerContent = page.locator('[data-drawer-content]').first();
      const box = await drawerContent.boundingBox();
      if (!box) throw new Error('Drawer content not visible');

      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      const swipeDistance = box.width * 0.1; // Below 25% threshold

      await page.evaluate(
        ({ sx, sy, dist }) => {
          const el = document.elementFromPoint(sx, sy);
          if (!el) return;
          el.dispatchEvent(
            new TouchEvent('touchstart', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchmove', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx + dist, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchend', {
              bubbles: true,
              changedTouches: [
                new Touch({ identifier: 0, target: el, clientX: sx + dist, clientY: sy }),
              ],
            })
          );
        },
        { sx: startX, sy: startY, dist: swipeDistance }
      );

      // Drawer should still be open
      await expect(drawer).toHaveClass(/drawer-open/);
    });
  });

  test.describe('Transaction Row — swipe-to-reveal', () => {
    test.use({ viewport: { width: 393, height: 851 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/transactions');
      await page.waitForSelector('[data-swipe-container]', { timeout: 10000 });
    });

    test('swipe left reveals Edit and Delete buttons', async ({ page }) => {
      const firstContainer = page.locator('[data-swipe-container]').first();
      const content = firstContainer.locator('[data-swipe-content]');
      const box = await content.boundingBox();
      if (!box) throw new Error('Swipe content not visible');

      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      await page.evaluate(
        ({ sx, sy }) => {
          const el = document.elementFromPoint(sx, sy);
          if (!el) return;
          el.dispatchEvent(
            new TouchEvent('touchstart', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchmove', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchend', {
              bubbles: true,
              changedTouches: [
                new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy }),
              ],
            })
          );
        },
        { sx: startX, sy: startY }
      );

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

      await page.evaluate(
        ({ sx, sy }) => {
          const el = document.elementFromPoint(sx, sy);
          if (!el) return;
          el.dispatchEvent(
            new TouchEvent('touchstart', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchmove', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchend', {
              bubbles: true,
              changedTouches: [
                new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy }),
              ],
            })
          );
        },
        { sx: box1.x + box1.width / 2, sy: box1.y + box1.height / 2 }
      );

      // Now swipe second row
      const second = containers.nth(1).locator('[data-swipe-content]');
      const box2 = await second.boundingBox();
      if (!box2) throw new Error('Second row not visible');

      await page.evaluate(
        ({ sx, sy }) => {
          const el = document.elementFromPoint(sx, sy);
          if (!el) return;
          el.dispatchEvent(
            new TouchEvent('touchstart', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchmove', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchend', {
              bubbles: true,
              changedTouches: [
                new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy }),
              ],
            })
          );
        },
        { sx: box2.x + box2.width / 2, sy: box2.y + box2.height / 2 }
      );

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
      await page.evaluate(
        ({ sx, sy }) => {
          const el = document.elementFromPoint(sx, sy);
          if (!el) return;
          el.dispatchEvent(
            new TouchEvent('touchstart', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchmove', {
              bubbles: true,
              touches: [new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy })],
            })
          );
          el.dispatchEvent(
            new TouchEvent('touchend', {
              bubbles: true,
              changedTouches: [
                new Touch({ identifier: 0, target: el, clientX: sx - 140, clientY: sy }),
              ],
            })
          );
        },
        { sx: box.x + box.width / 2, sy: box.y + box.height / 2 }
      );

      // Click somewhere outside
      await page.click('body', { position: { x: 10, y: 10 } });

      // Row should snap back
      const transform = await content.evaluate((el) => el.style.transform);
      expect(transform === '' || transform === 'translateX(0px)').toBeTruthy();
    });
  });
}); // end: Swipe gestures on transactions page
