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
 * @see https://github.com/saadeghi/daisyui/issues/3804
 */

const LG_BREAKPOINT = 1024;

const initializedDrawers = new WeakSet<HTMLElement>();

function initMobileDrawer(): void {
  const checkbox = document.getElementById('drawer-toggle') as HTMLInputElement | null;
  const drawerSide = document.querySelector('.drawer-side') as HTMLElement | null;
  if (!checkbox || !drawerSide) return;
  if (initializedDrawers.has(drawerSide)) return;
  initializedDrawers.add(drawerSide);

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

  // Intercept label clicks that toggle the drawer checkbox.
  // preventDefault() stops the label's default action (toggling the checkbox),
  // which avoids DaisyUI's :root:has(.drawer-toggle:checked) evaluation entirely.
  document.addEventListener('click', (e: Event) => {
    if (!isMobile()) return;

    const target = e.target as HTMLElement;
    const label = target.closest('label[for="drawer-toggle"]');
    if (!label) return;

    e.preventDefault();
    isOpen ? close() : open();
  });

  // Safety net: if checkbox somehow gets checked, immediately reset it
  // to prevent the expensive :root:has() cascade.
  checkbox.addEventListener('change', () => {
    if (isMobile()) checkbox.checked = false;
  });

  // Close on Escape key
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  });

  // Close drawer when resizing from mobile to desktop
  window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`).addEventListener('change', (e) => {
    if (e.matches && isOpen) close();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileDrawer, { once: true });
} else {
  initMobileDrawer();
}

document.addEventListener('astro:page-load', initMobileDrawer);
