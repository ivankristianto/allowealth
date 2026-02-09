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
 * - Idempotent — safe to call multiple times
 */

const EXPAND_INIT_KEY = '__expandableTextInit';
const SELECTOR = '[data-expandable-text]';

/** Toggle expand/collapse on a target element. */
function toggleExpand(target: HTMLElement, e: Event): void {
  const isTruncated = target.scrollWidth > target.clientWidth;
  const isExpanded = target.dataset.expanded === 'true';

  if (!isTruncated && !isExpanded) return;

  e.stopPropagation();
  e.preventDefault();

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

/** Register document-level click and keyboard listeners (runs once). */
export function initExpandableText(): void {
  const docAny = document as unknown as Record<string, unknown>;
  if (docAny[EXPAND_INIT_KEY]) return;
  docAny[EXPAND_INIT_KEY] = true;

  document.addEventListener('click', (e: Event) => {
    const target = (e.target as HTMLElement).closest(SELECTOR) as HTMLElement | null;
    if (target) toggleExpand(target, e);
  });

  document.addEventListener('keydown', (e: Event) => {
    const event = e as KeyboardEvent;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const target = (event.target as HTMLElement).closest(SELECTOR) as HTMLElement | null;
    if (target) toggleExpand(target, event);
  });
}

/** Mark truncated elements as interactive (role, tabindex, cursor). */
export function markTruncated(): void {
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    const isTruncated = el.scrollWidth > el.clientWidth;
    const isExpanded = el.dataset.expanded === 'true';

    if (isTruncated || isExpanded) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.classList.add('cursor-pointer');
      if (!el.hasAttribute('aria-expanded')) {
        el.setAttribute('aria-expanded', 'false');
      }
    } else {
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
      el.removeAttribute('aria-expanded');
      el.classList.remove('cursor-pointer');
    }
  });
}

/** Observe containers that may inject TransactionCards dynamically. */
export function observeExpandableContainers(): void {
  const containerSelectors = [
    '#transaction-list',
    '[data-modal-content]',
    '[data-category-drilldown-content]',
  ];

  for (const selector of containerSelectors) {
    const container = document.querySelector(selector);
    if (container) {
      new MutationObserver(markTruncated).observe(container, {
        childList: true,
        subtree: true,
      });
    }
  }
}
