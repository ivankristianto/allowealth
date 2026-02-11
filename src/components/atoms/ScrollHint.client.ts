/**
 * ScrollHint – creates gradient overlay elements on .table-scroll-hint
 * wrappers and toggles their visibility based on horizontal scroll position.
 *
 * Pseudo-elements can't reliably paint above composited scroll containers,
 * so we inject real DOM overlay divs instead. CSS classes for the overlays
 * are defined in globals.css (.scroll-hint-fade, -left, -right).
 *
 * The wrapper must contain a child with the class .overflow-x-auto
 * (the actual horizontally-scrollable element).
 */

const INIT_ATTR = 'data-scroll-hint-init';

/** Track active observers so we can disconnect on page transitions. */
const activeObservers: ResizeObserver[] = [];

function initScrollHints() {
  document.querySelectorAll<HTMLElement>('.table-scroll-hint').forEach((hint) => {
    if (hint.hasAttribute(INIT_ATTR)) return;

    const scroller = hint.querySelector<HTMLElement>('.overflow-x-auto');
    if (!scroller) return;

    hint.setAttribute(INIT_ATTR, '');

    // Create overlay elements
    const left = document.createElement('div');
    left.className = 'scroll-hint-fade scroll-hint-fade-left';
    left.setAttribute('aria-hidden', 'true');

    const right = document.createElement('div');
    right.className = 'scroll-hint-fade scroll-hint-fade-right';
    right.setAttribute('aria-hidden', 'true');

    hint.appendChild(left);
    hint.appendChild(right);

    function update() {
      if (!scroller) return;
      const { scrollLeft, scrollWidth, clientWidth } = scroller;
      left.style.opacity = scrollLeft > 0 ? '1' : '0';
      right.style.opacity = scrollLeft + clientWidth < scrollWidth - 1 ? '1' : '0';
    }

    update();
    scroller.addEventListener('scroll', update, { passive: true });

    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    activeObservers.push(observer);
  });
}

/** Disconnect all ResizeObservers (called before page swap). */
function cleanupObservers() {
  for (const observer of activeObservers) {
    observer.disconnect();
  }
  activeObservers.length = 0;
}

document.addEventListener('DOMContentLoaded', initScrollHints);
document.addEventListener('astro:page-load', initScrollHints);
// Re-init after HTML partial refresh (e.g., budget table sort/filter)
document.addEventListener('budget-content-updated', initScrollHints);
// Disconnect observers before Astro page transitions
document.addEventListener('astro:before-swap', cleanupObservers);
