/**
 * Month Navigator Client Script
 *
 * Handles month navigation interactions and dispatches events.
 * Separated from component for explicit initialization after HTML injection.
 */

interface MonthOption {
  key: string;
  label: string;
}

// Track initialized navigators to avoid duplicate handlers
const initializedNavigators = new WeakSet<Element>();

export function initMonthNavigator() {
  document.querySelectorAll('[data-month-navigator]').forEach((navigator) => {
    // Skip if already initialized
    if (initializedNavigators.has(navigator)) return;
    initializedNavigators.add(navigator);

    const monthInput = navigator.querySelector('[data-month-input]') as HTMLInputElement;
    const monthLabel = navigator.querySelector('[data-month-label]');
    const prevBtn = navigator.querySelector('[data-month-nav="prev"]') as HTMLButtonElement;
    const nextBtn = navigator.querySelector('[data-month-nav="next"]') as HTMLButtonElement;

    if (!monthInput || !monthLabel) return;

    // Get available months from data attribute
    const monthsData = navigator.getAttribute('data-available-months');
    const availableMonths: MonthOption[] = monthsData ? JSON.parse(monthsData) : [];

    // Update navigation button states
    function updateNavButtons() {
      const currentMonth = monthInput.value;
      const currentIndex = availableMonths.findIndex((m) => m.key === currentMonth);

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
        const hasNext = currentIndex < availableMonths.length - 1;
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

    // Handle month dropdown selection
    navigator.querySelectorAll('[data-month-option]').forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const el = btn as HTMLElement;
        const value = el.dataset.monthOption || '';
        const displayLabel = el.dataset.monthLabel || value;

        monthInput.value = value;
        monthLabel.textContent = displayLabel;

        // Close dropdown
        (document.activeElement as HTMLElement)?.blur();

        // Update nav button states
        updateNavButtons();

        // Dispatch custom event
        window.dispatchEvent(
          new CustomEvent('monthChange', {
            detail: { month: value, label: displayLabel },
          })
        );
      });
    });

    // Handle navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();

        const currentMonth = monthInput.value;
        const currentIndex = availableMonths.findIndex((m) => m.key === currentMonth);

        if (currentIndex > 0) {
          const prevMonth = availableMonths[currentIndex - 1];
          monthInput.value = prevMonth.key;
          monthLabel.textContent = prevMonth.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent('monthChange', {
              detail: { month: prevMonth.key, label: prevMonth.label },
            })
          );
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();

        const currentMonth = monthInput.value;
        const currentIndex = availableMonths.findIndex((m) => m.key === currentMonth);

        if (currentIndex < availableMonths.length - 1) {
          const nextMonth = availableMonths[currentIndex + 1];
          monthInput.value = nextMonth.key;
          monthLabel.textContent = nextMonth.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent('monthChange', {
              detail: { month: nextMonth.key, label: nextMonth.label },
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
  document.addEventListener('DOMContentLoaded', initMonthNavigator);
} else {
  initMonthNavigator();
}

// Re-initialize on Astro page transitions
document.addEventListener('astro:page-load', initMonthNavigator);
