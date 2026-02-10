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

function initScrollHints() {
  document.querySelectorAll<HTMLElement>('.table-scroll-hint').forEach((hint) => {
    if (hint.hasAttribute(INIT_ATTR)) return;
    hint.setAttribute(INIT_ATTR, '');

    const scroller = hint.querySelector<HTMLElement>('.overflow-x-auto');
    if (!scroller) return;

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
      const { scrollLeft, scrollWidth, clientWidth } = scroller!;
      left.style.opacity = scrollLeft > 0 ? '1' : '0';
      right.style.opacity = scrollLeft + clientWidth < scrollWidth - 1 ? '1' : '0';
    }

    update();
    scroller.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(scroller);
  });
}

document.addEventListener('DOMContentLoaded', initScrollHints);
document.addEventListener('astro:page-load', initScrollHints);
