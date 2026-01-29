/**
 * Year Navigator Client Script
 *
 * Handles year navigation interactions and dispatches events.
 * Separated from component for explicit initialization after HTML injection.
 */

interface YearOption {
  key: string;
  label: string;
}

// Track initialized navigators to avoid duplicate handlers
const initializedNavigators = new WeakSet<Element>();

export function initYearNavigator() {
  document.querySelectorAll('[data-year-navigator]').forEach((navigator) => {
    // Skip if already initialized
    if (initializedNavigators.has(navigator)) return;
    initializedNavigators.add(navigator);

    const yearInput = navigator.querySelector('[data-year-input]') as HTMLInputElement;
    const yearLabel = navigator.querySelector('[data-year-label]');
    const prevBtn = navigator.querySelector('[data-year-nav="prev"]') as HTMLButtonElement;
    const nextBtn = navigator.querySelector('[data-year-nav="next"]') as HTMLButtonElement;

    if (!yearInput || !yearLabel) return;

    // Get available years from data attribute
    const yearsData = navigator.getAttribute('data-available-years');
    const availableYears: YearOption[] = yearsData ? JSON.parse(yearsData) : [];

    // Update navigation button states
    function updateNavButtons() {
      const currentYear = yearInput.value;
      const currentIndex = availableYears.findIndex((y) => y.key === currentYear);

      if (prevBtn) {
        const hasPrev = currentIndex > 0;
        prevBtn.disabled = !hasPrev;
        prevBtn.setAttribute('aria-disabled', hasPrev ? 'false' : 'true');
        prevBtn.setAttribute('data-has-prev', hasPrev ? 'true' : 'false');

        if (hasPrev) {
          prevBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
        } else {
          prevBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
        }
      }

      if (nextBtn) {
        const hasNext = currentIndex < availableYears.length - 1;
        nextBtn.disabled = !hasNext;
        nextBtn.setAttribute('aria-disabled', hasNext ? 'false' : 'true');
        nextBtn.setAttribute('data-has-next', hasNext ? 'true' : 'false');

        if (hasNext) {
          nextBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
        } else {
          nextBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
        }
      }
    }

    // Handle year dropdown selection
    navigator.querySelectorAll('[data-year-option]').forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const el = btn as HTMLElement;
        const value = el.dataset.yearOption || '';
        const displayLabel = el.dataset.yearLabel || value;

        yearInput.value = value;
        yearLabel.textContent = displayLabel;

        // Close dropdown
        (document.activeElement as HTMLElement)?.blur();

        // Update nav button states
        updateNavButtons();

        // Dispatch custom event
        window.dispatchEvent(
          new CustomEvent('yearChange', {
            detail: { year: value, label: displayLabel },
          })
        );
      });
    });

    // Handle navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();

        const currentYear = yearInput.value;
        const currentIndex = availableYears.findIndex((y) => y.key === currentYear);

        if (currentIndex > 0) {
          const prevYear = availableYears[currentIndex - 1];
          yearInput.value = prevYear.key;
          yearLabel.textContent = prevYear.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent('yearChange', {
              detail: { year: prevYear.key, label: prevYear.label },
            })
          );
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();

        const currentYear = yearInput.value;
        const currentIndex = availableYears.findIndex((y) => y.key === currentYear);

        if (currentIndex < availableYears.length - 1) {
          const nextYear = availableYears[currentIndex + 1];
          yearInput.value = nextYear.key;
          yearLabel.textContent = nextYear.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent('yearChange', {
              detail: { year: nextYear.key, label: nextYear.label },
            })
          );
        }
      });
    }

    // Initialize button states
    updateNavButtons();
  });
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initYearNavigator);
} else {
  initYearNavigator();
}

// Re-initialize on Astro page transitions
document.addEventListener('astro:page-load', initYearNavigator);
