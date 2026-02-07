import { animate } from 'motion';
import { DRAWER_ANIMATION_CONFIG, DRAWER_CONTENT_INITIAL_STYLES } from '@/lib/animations';

const initializedDrawers = new WeakSet<HTMLElement>();

function initDrawer(drawerElement: Element): void {
  if (!(drawerElement instanceof HTMLElement)) return;
  if (initializedDrawers.has(drawerElement)) return;
  initializedDrawers.add(drawerElement);

  const drawer = drawerElement;
  const backdropClose = drawer.dataset.backdropClose === 'true';

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = motionQuery.matches;
  const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
    prefersReducedMotion = event.matches;
  };
  motionQuery.addEventListener('change', handleMotionPreferenceChange);

  const getBackdrop = () => drawer.querySelector('[data-drawer-backdrop]') as HTMLElement | null;
  const getContent = () => drawer.querySelector('[data-drawer-content]') as HTMLElement | null;
  const getCloseButton = () => drawer.querySelector('[data-close-drawer]') as HTMLElement | null;
  const getFocusableElements = (): HTMLElement[] => {
    const selector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(drawer.querySelectorAll(selector)).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.hasAttribute('disabled') &&
        element.getAttribute('aria-hidden') !== 'true'
    );
  };

  const focusFirstElement = (): void => {
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
      return;
    }
    drawer.focus();
  };

  let isAnimating = false;
  let lastFocusedElement: HTMLElement | null = null;
  let previousBodyOverflow: string | null = null;

  const openDrawer = async (): Promise<void> => {
    if (isAnimating || drawer.classList.contains('drawer-open')) return;
    isAnimating = true;
    lastFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    try {
      drawer.classList.remove('hidden');
      drawer.classList.add('drawer-open');
      if (previousBodyOverflow === null) {
        previousBodyOverflow = document.body.style.overflow;
      }
      document.body.style.overflow = 'hidden';

      const backdrop = getBackdrop();
      const content = getContent();

      if (prefersReducedMotion) {
        if (backdrop) backdrop.style.opacity = '1';
        if (content) content.style.transform = 'translateX(0%)';
      } else {
        if (backdrop) backdrop.style.opacity = '0';
        if (content) {
          Object.assign(content.style, DRAWER_CONTENT_INITIAL_STYLES);
        }

        const enterKeyframes = {
          transform: [...DRAWER_ANIMATION_CONFIG.content.enter.keyframes.transform],
        } as Parameters<typeof animate>[1];

        await Promise.all([
          backdrop
            ? animate(backdrop, { opacity: [0, 1] }, DRAWER_ANIMATION_CONFIG.backdrop.options)
            : Promise.resolve(),
          content
            ? animate(content, enterKeyframes, DRAWER_ANIMATION_CONFIG.content.enter.options)
            : Promise.resolve(),
        ]);
      }

      requestAnimationFrame(focusFirstElement);
      drawer.dispatchEvent(new CustomEvent('drawer-opened'));
    } finally {
      isAnimating = false;
    }
  };

  const closeDrawer = async (): Promise<void> => {
    if (isAnimating || !drawer.classList.contains('drawer-open')) return;
    isAnimating = true;

    const backdrop = getBackdrop();
    const content = getContent();

    try {
      if (!prefersReducedMotion) {
        const exitKeyframes = {
          transform: [...DRAWER_ANIMATION_CONFIG.content.exit.keyframes.transform],
        } as Parameters<typeof animate>[1];

        await Promise.all([
          backdrop
            ? animate(backdrop, { opacity: [1, 0] }, DRAWER_ANIMATION_CONFIG.backdrop.options)
            : Promise.resolve(),
          content
            ? animate(content, exitKeyframes, DRAWER_ANIMATION_CONFIG.content.exit.options)
            : Promise.resolve(),
        ]);
      }
    } finally {
      drawer.classList.remove('drawer-open');
      drawer.classList.add('hidden');
      document.body.style.overflow = previousBodyOverflow ?? '';
      previousBodyOverflow = null;
      isAnimating = false;
    }

    drawer.dispatchEvent(new CustomEvent('drawer-closed'));

    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  };

  drawer.addEventListener('drawer:open', openDrawer);
  drawer.addEventListener('drawer:close', closeDrawer);

  const backdrop = getBackdrop();
  if (backdropClose && backdrop) {
    backdrop.addEventListener('click', closeDrawer);
  }

  const closeButton = getCloseButton();
  if (closeButton) {
    closeButton.addEventListener('click', closeDrawer);
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!drawer.classList.contains('drawer-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      drawer.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', handleKeydown);

  const cleanup = (): void => {
    motionQuery.removeEventListener('change', handleMotionPreferenceChange);
    document.removeEventListener('keydown', handleKeydown);
  };

  const removalObserver = new MutationObserver(() => {
    if (!document.contains(drawer)) {
      cleanup();
      removalObserver.disconnect();
    }
  });
  removalObserver.observe(document.body, { childList: true, subtree: true });
}

function initAllDrawers(): void {
  document.querySelectorAll('[data-drawer]').forEach(initDrawer);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllDrawers);
} else {
  initAllDrawers();
}

document.addEventListener('astro:page-load', initAllDrawers);
