// Navigation client-side initialization
// Handles sidebar collapse, mobile logout, and drawer close controls

import { performLogout } from '@/lib/utils/client';

const STORAGE_KEY = 'ff.sidebar.collapsed';
const CONTROLLER_KEY = '__navigationController';

// Window interface augmentation for type safety
declare global {
  interface Window {
    [CONTROLLER_KEY]?: AbortController;
  }
}

function initNavigation() {
  // Cleanup previous listeners
  window[CONTROLLER_KEY]?.abort();

  const controller = new AbortController();
  window[CONTROLLER_KEY] = controller;
  const { signal } = controller;

  initSidebarCollapse(signal);
  initDrawerCloseControl(signal);
  initMobileLogout(signal);
}

function initSidebarCollapse(signal: AbortSignal) {
  const root = document.querySelector('[data-sidebar-root]');
  if (!root) return;

  const toggles = document.querySelectorAll('[data-sidebar-toggle]');
  if (!toggles.length) return;

  let isCollapsed = root.getAttribute('data-sidebar-collapsed') === 'true';

  const applyCollapsedState = () => {
    root.setAttribute('data-sidebar-collapsed', isCollapsed ? 'true' : 'false');
    toggles.forEach((toggle) => {
      toggle.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
      toggle.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
      toggle.setAttribute('title', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
      toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    });
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      isCollapsed = stored === 'true';
    }
  } catch {
    // localStorage unavailable
  }

  applyCollapsedState();

  toggles.forEach((toggle) => {
    if (!(toggle instanceof HTMLElement)) return;
    toggle.addEventListener(
      'click',
      () => {
        isCollapsed = !isCollapsed;
        applyCollapsedState();
        try {
          localStorage.setItem(STORAGE_KEY, String(isCollapsed));
        } catch {
          // localStorage unavailable
        }
      },
      { signal }
    );
  });
}

function initDrawerCloseControl(signal: AbortSignal) {
  // Use event delegation on document to avoid stale element references
  document.addEventListener(
    'click',
    (e) => {
      if (!(e.target instanceof Element)) return;
      const button = e.target.closest('[data-drawer-close]');
      if (!button) return;

      const drawerToggle = document.getElementById('drawer-toggle');
      if (!(drawerToggle instanceof HTMLInputElement)) return;

      drawerToggle.checked = false;
      drawerToggle.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { signal }
  );
}

function initMobileLogout(signal: AbortSignal) {
  // Use event delegation for mobile logout buttons
  document.addEventListener(
    'click',
    async (e) => {
      if (!(e.target instanceof Element)) return;
      const button = e.target.closest('[data-mobile-logout-button]');
      if (!button) return;

      e.preventDefault();
      await performLogout();
    },
    { signal }
  );
}

// Initialize on initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigation, { once: true });
} else {
  initNavigation();
}

// Re-initialize after ViewTransitions navigation
document.addEventListener('astro:page-load', initNavigation);
