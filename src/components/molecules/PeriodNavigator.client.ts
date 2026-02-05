/**
 * Period Navigator Client Script
 *
 * Handles period navigation interactions and dispatches events.
 * Separated from component for explicit initialization after HTML injection.
 */

interface PeriodOption {
  value: string;
  label: string;
}

// Track initialized navigators to avoid duplicate handlers
const initializedNavigators = new WeakSet<Element>();

export function initPeriodNavigator() {
  document.querySelectorAll('[data-period-navigator]').forEach((navigator) => {
    // Skip if already initialized
    if (initializedNavigators.has(navigator)) return;
    initializedNavigators.add(navigator);

    const periodInput = navigator.querySelector('[data-period-input]') as HTMLInputElement;
    const periodLabel = navigator.querySelector('[data-period-label]');
    const prevBtn = navigator.querySelector('[data-period-nav="prev"]') as HTMLButtonElement;
    const nextBtn = navigator.querySelector('[data-period-nav="next"]') as HTMLButtonElement;

    if (!periodInput || !periodLabel) return;

    // Get available periods from data attribute
    const optionsData = navigator.getAttribute('data-period-options');
    const availableOptions: PeriodOption[] = optionsData ? JSON.parse(optionsData) : [];

    // Update navigation button states
    function updateNavButtons() {
      const currentPeriod = periodInput.value;
      const currentIndex = availableOptions.findIndex((option) => option.value === currentPeriod);

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
        const hasNext = currentIndex < availableOptions.length - 1;
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

    // Handle period dropdown selection
    navigator.querySelectorAll('[data-period-option]').forEach((btn) => {
      btn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const el = btn as HTMLElement;
        const value = el.dataset.periodOption || '';
        const displayLabel = el.dataset.periodLabel || value;

        periodInput.value = value;
        periodLabel.textContent = displayLabel;

        // Close dropdown
        (document.activeElement as HTMLElement)?.blur();

        // Update nav button states
        updateNavButtons();

        // Dispatch custom event
        window.dispatchEvent(
          new CustomEvent('periodChange', {
            detail: { period: value, label: displayLabel },
          })
        );
      });
    });

    // Handle navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        if (prevBtn.disabled) return;

        const currentPeriod = periodInput.value;
        const currentIndex = availableOptions.findIndex((option) => option.value === currentPeriod);

        if (currentIndex > 0) {
          const prevOption = availableOptions[currentIndex - 1];
          periodInput.value = prevOption.value;
          periodLabel.textContent = prevOption.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent('periodChange', {
              detail: { period: prevOption.value, label: prevOption.label },
            })
          );
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e: Event) => {
        e.preventDefault();
        if (nextBtn.disabled) return;

        const currentPeriod = periodInput.value;
        const currentIndex = availableOptions.findIndex((option) => option.value === currentPeriod);

        if (currentIndex < availableOptions.length - 1) {
          const nextOption = availableOptions[currentIndex + 1];
          periodInput.value = nextOption.value;
          periodLabel.textContent = nextOption.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent('periodChange', {
              detail: { period: nextOption.value, label: nextOption.label },
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
  document.addEventListener('DOMContentLoaded', initPeriodNavigator);
} else {
  initPeriodNavigator();
}

// Re-initialize on Astro page transitions
document.addEventListener('astro:page-load', initPeriodNavigator);
