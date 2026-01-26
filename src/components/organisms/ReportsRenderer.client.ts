/**
 * Reports Renderer
 *
 * Client-side module for rendering HTML fragments into the reports page.
 * Handles HTML injection and animations for smooth transitions.
 *
 * Following the pattern from docs/architecture/002-interactive-pages.md
 */

import { animate } from 'motion';

/**
 * Parse HTML partials from API response
 * Extracts partials marked with <!-- PARTIAL:name --> comments
 */
export function parseHtmlPartials(html: string): {
  summary?: string;
  charts?: string;
  table?: string;
} {
  const partials: { summary?: string; charts?: string; table?: string } = {};

  // Extract summary partial
  const summaryMatch = html.match(/<!-- PARTIAL:summary -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  if (summaryMatch) partials.summary = summaryMatch[1].trim();

  // Extract charts partial
  const chartsMatch = html.match(/<!-- PARTIAL:charts -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  if (chartsMatch) partials.charts = chartsMatch[1].trim();

  // Extract table partial
  const tableMatch = html.match(/<!-- PARTIAL:table -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
  if (tableMatch) partials.table = tableMatch[1].trim();

  return partials;
}

/**
 * Render summary cards with fade-in animation
 */
export function renderSummaryHtml(html: string): void {
  const container = document.querySelector('[data-summary-container]') as HTMLElement;
  if (!container) return;

  // Fade out existing content
  // @ts-expect-error - Motion library type definition issue
  animate(container, { opacity: [1, 0] }, { duration: 0.2, easing: 'ease-out' }).finished.then(
    () => {
      // Inject new HTML
      container.innerHTML = html;

      // Fade in new content
      // @ts-expect-error - Motion library type definition issue
      animate(container, { opacity: [0, 1] }, { duration: 0.3, easing: 'ease-in' });

      // Animate individual cards with stagger
      const cards = container.querySelectorAll('[data-stat-card]');
      cards.forEach((card, i) => {
        // Motion library animation with keyframes
        animate(
          card,
          { opacity: [0, 1], y: [20, 0] } as any,
          { delay: i * 0.1, duration: 0.4, easing: [0.22, 1, 0.36, 1] } as any
        );
      });
    }
  );
}

/**
 * Render charts with fade-in animation
 */
export function renderChartsHtml(html: string): void {
  const container = document.querySelector('[data-charts-container]') as HTMLElement;
  if (!container) return;

  // Fade out existing content
  // @ts-expect-error - Motion library type definition issue
  animate(container, { opacity: [1, 0] }, { duration: 0.2, easing: 'ease-out' }).finished.then(
    () => {
      // Inject new HTML
      container.innerHTML = html;

      // Fade in new content
      // @ts-expect-error - Motion library type definition issue
      animate(container, { opacity: [0, 1] }, { duration: 0.3, easing: 'ease-in' });

      // Re-initialize charts after HTML injection
      // Small delay to ensure DOM is fully updated
      requestAnimationFrame(() => {
        document.dispatchEvent(new CustomEvent('charts:reinit'));
      });
    }
  );
}

/**
 * Render category table with fade-in animation
 */
export function renderTableHtml(html: string): void {
  const container = document.querySelector('[data-table-container]') as HTMLElement;
  if (!container) return;

  // Fade out existing content
  // @ts-expect-error - Motion library type definition issue
  animate(container, { opacity: [1, 0] }, { duration: 0.2, easing: 'ease-out' }).finished.then(
    () => {
      // Inject new HTML
      container.innerHTML = html;

      // Fade in new content
      // @ts-expect-error - Motion library type definition issue
      animate(container, { opacity: [0, 1] }, { duration: 0.3, easing: 'ease-in' });
    }
  );
}

/**
 * Show loading state for a container
 */
export function showLoadingState(containerSelector: string): void {
  const container = document.querySelector(containerSelector) as HTMLElement;
  if (!container) return;

  container.style.opacity = '0.5';
  container.style.pointerEvents = 'none';
  container.setAttribute('aria-busy', 'true');
}

/**
 * Hide loading state for a container
 */
export function hideLoadingState(containerSelector: string): void {
  const container = document.querySelector(containerSelector) as HTMLElement;
  if (!container) return;

  container.style.opacity = '1';
  container.style.pointerEvents = '';
  container.removeAttribute('aria-busy');
}

/**
 * Announce to screen readers
 */
export function announceToScreenReader(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
