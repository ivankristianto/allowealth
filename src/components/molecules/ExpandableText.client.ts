/**
 * Expandable Text
 *
 * Click-to-expand for truncated text elements marked with [data-expandable-text].
 * Uses document-level event delegation so it works with dynamically injected
 * HTML (e.g. server-rendered partials, modal content).
 *
 * Features:
 * - Click/keyboard toggle between truncated and expanded states
 * - Dynamic role/tabindex/aria-expanded only when text actually overflows
 * - MutationObserver to re-scan when new elements are injected
 * - Idempotent lifecycle with cleanup for view transitions
 */

const SELECTOR = '[data-expandable-text]';

let initialized = false;
let controller: AbortController | null = null;
let observers: MutationObserver[] = [];

/** Toggle expand/collapse on a target element. */
function toggleExpand(target: HTMLElement, event: Event): void {
  const isTruncated = target.scrollWidth > target.clientWidth;
  const isExpanded = target.dataset.expanded === 'true';

  if (!isTruncated && !isExpanded) return;

  event.stopPropagation();
  event.preventDefault();

  if (isExpanded) {
    target.classList.add('truncate');
    target.classList.remove('break-words');
    target.dataset.expanded = 'false';
    target.setAttribute('aria-expanded', 'false');
  } else {
    target.classList.remove('truncate');
    target.classList.add('break-words');
    target.dataset.expanded = 'true';
    target.setAttribute('aria-expanded', 'true');
  }
}

/** Register document-level click and keyboard listeners (runs once per init cycle). */
export function initExpandableText(): void {
  if (initialized) return;
  initialized = true;

  controller = new AbortController();
  const { signal } = controller;

  document.addEventListener(
    'click',
    (event: Event) => {
      const target = (event.target as HTMLElement).closest(SELECTOR) as HTMLElement | null;
      if (target) toggleExpand(target, event);
    },
    { signal }
  );

  document.addEventListener(
    'keydown',
    (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') return;

      const target = (keyboardEvent.target as HTMLElement).closest(SELECTOR) as HTMLElement | null;
      if (target) toggleExpand(target, keyboardEvent);
    },
    { signal }
  );
}

/** Mark truncated elements as interactive (role, tabindex, cursor). */
export function markTruncated(): void {
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((element) => {
    const isTruncated = element.scrollWidth > element.clientWidth;
    const isExpanded = element.dataset.expanded === 'true';

    if (isTruncated || isExpanded) {
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.classList.add('cursor-pointer');
      if (!element.hasAttribute('aria-expanded')) {
        element.setAttribute('aria-expanded', 'false');
      }
    } else {
      element.removeAttribute('role');
      element.removeAttribute('tabindex');
      element.removeAttribute('aria-expanded');
      element.classList.remove('cursor-pointer');
    }
  });
}

/** Observe containers that may inject TransactionCards dynamically. */
export function observeExpandableContainers(): void {
  observers.forEach((observer) => observer.disconnect());
  observers = [];

  const containerSelectors = [
    '#transaction-list',
    '[data-modal-content]',
    '[data-category-drilldown-content]',
  ];

  for (const selector of containerSelectors) {
    const container = document.querySelector(selector);
    if (!container) continue;

    const observer = new MutationObserver(markTruncated);
    observer.observe(container, {
      childList: true,
      subtree: true,
    });
    observers.push(observer);
  }
}

function cleanupExpandableText(): void {
  controller?.abort();
  controller = null;
  initialized = false;
  observers.forEach((observer) => observer.disconnect());
  observers = [];
}

function initExpandableTextLifecycle(): void {
  initExpandableText();
  markTruncated();
  observeExpandableContainers();
}

initExpandableTextLifecycle();
document.addEventListener('astro:page-load', initExpandableTextLifecycle);
document.addEventListener('astro:before-swap', cleanupExpandableText);
