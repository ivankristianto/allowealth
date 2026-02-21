/**
 * PublicAuthCta - Client-side auth detection for static public pages
 *
 * Reads the `auth_hint` cookie (set by auth middleware, non-httpOnly)
 * and swaps CTA elements to authenticated variants via data-* attributes:
 *
 * - [data-auth-cta]      → swap href to value of data-auth-href
 * - [data-auth-cta-text] → swap textContent to value of data-auth-text
 * - [data-auth-hide]     → hide element (display: none)
 */
let controller: AbortController | null = null;

function isAuthenticated(): boolean {
  return document.cookie.split('; ').some((c) => c === 'auth_hint=1');
}

function applyAuthState(): void {
  const authed = isAuthenticated();

  // Swap href on CTA links
  document.querySelectorAll<HTMLElement>('[data-auth-cta]').forEach((el) => {
    if (!(el instanceof HTMLAnchorElement)) return;
    if (authed && el.dataset.authHref) {
      // Store original href for reversal on bfcache restore
      if (!el.dataset.guestHref) el.dataset.guestHref = el.href;
      el.href = el.dataset.authHref;
    } else if (!authed && el.dataset.guestHref) {
      el.href = el.dataset.guestHref;
    }
  });

  // Swap text content on CTA text spans
  document.querySelectorAll<HTMLElement>('[data-auth-cta-text]').forEach((el) => {
    if (authed && el.dataset.authText) {
      if (!el.dataset.guestText) el.dataset.guestText = el.textContent || '';
      el.textContent = el.dataset.authText;
    } else if (!authed && el.dataset.guestText) {
      el.textContent = el.dataset.guestText;
    }
  });

  // Toggle visibility of guest-only elements
  document.querySelectorAll<HTMLElement>('[data-auth-hide]').forEach((el) => {
    el.style.display = authed ? 'none' : '';
  });
}

function initPublicAuthCta(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  applyAuthState();

  // Re-evaluate on bfcache restore (user may have logged in/out in another tab)
  window.addEventListener(
    'pageshow',
    (e) => {
      if (e.persisted) applyAuthState();
    },
    { signal }
  );
}

initPublicAuthCta();
document.addEventListener('astro:page-load', initPublicAuthCta);
