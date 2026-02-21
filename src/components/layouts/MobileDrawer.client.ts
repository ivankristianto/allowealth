/**
 * Mobile Drawer Performance Fix
 *
 * Replaces DaisyUI's CSS checkbox-based drawer with a JS-controlled toggle
 * to avoid the expensive :root:has(.drawer-toggle:checked) style recalculation
 * that causes ~472ms INP on mobile.
 *
 * Instead of the checkbox :checked state, uses a data-mobile-open attribute
 * on .drawer-side. The existing DaisyUI CSS transitions (translate, opacity,
 * visibility) still animate smoothly via attribute-targeted CSS overrides.
 *
 * Strategy: On mobile, we remove the `for` attribute from all labels that
 * target #drawer-toggle, severing the native label→checkbox coupling entirely.
 * This guarantees the checkbox never gets :checked, so :root:has() never fires.
 * Direct click handlers on each label manage the drawer state via JS.
 *
 * @see https://github.com/saadeghi/daisyui/issues/3804
 */

const LG_BREAKPOINT = 1024;

let controller: AbortController | null = null;
let closeDrawer: (() => void) | null = null;

function initMobileDrawer(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const checkbox = document.getElementById('drawer-toggle') as HTMLInputElement | null;
  const drawerSide = document.querySelector('.drawer-side') as HTMLElement | null;
  if (!checkbox || !drawerSide) {
    closeDrawer = null;
    return;
  }
  drawerSide.setAttribute('data-mobile-drawer-js', 'true');

  let isOpen = false;
  let previousOverflow = '';

  const isMobile = (): boolean => window.innerWidth < LG_BREAKPOINT;

  function open(): void {
    if (isOpen) return;
    isOpen = true;
    drawerSide.setAttribute('data-mobile-open', 'true');
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    drawerSide.removeAttribute('data-mobile-open');
    document.body.style.overflow = previousOverflow;
  }

  closeDrawer = close;

  // Sever the native label→checkbox coupling on mobile.
  // Removing the `for` attribute guarantees labels cannot toggle the checkbox,
  // preventing DaisyUI's :root:has(.drawer-toggle:checked) from ever evaluating.
  // Using preventDefault() on a delegated handler does NOT work — the label's
  // activation behavior fires during event dispatch, not as a post-dispatch
  // default action, so the checkbox toggles before preventDefault() takes effect.
  if (isMobile()) {
    document.querySelectorAll<HTMLLabelElement>('label[for="drawer-toggle"]').forEach((label) => {
      label.removeAttribute('for');
      label.setAttribute('data-drawer-toggle', '');
    });
  }

  // Handle drawer toggle via delegated click on the re-attributed labels.
  document.addEventListener(
    'click',
    (e: Event) => {
      if (!isMobile()) return;

      const target = e.target as HTMLElement;
      const label = target.closest('[data-drawer-toggle]');
      if (!label) return;

      isOpen ? close() : open();
    },
    { signal }
  );

  // Safety net: if checkbox somehow gets checked, immediately reset it.
  checkbox.addEventListener(
    'change',
    () => {
      if (isMobile()) checkbox.checked = false;
    },
    { signal }
  );

  // Close on Escape key
  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    },
    { signal }
  );

  // Close drawer when resizing from mobile to desktop
  window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`).addEventListener(
    'change',
    (e) => {
      if (e.matches && isOpen) close();
    },
    { signal }
  );

  signal.addEventListener(
    'abort',
    () => {
      close();
      closeDrawer = null;
    },
    { once: true }
  );
}

initMobileDrawer();
document.addEventListener('astro:page-load', initMobileDrawer);
document.addEventListener('astro:before-swap', () => {
  closeDrawer?.();
});
