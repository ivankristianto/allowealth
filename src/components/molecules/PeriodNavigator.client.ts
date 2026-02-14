/**
 * Period Navigator Client Script
 *
 * Handles period navigation interactions and dispatches events.
 * Separated from component for explicit initialization after HTML injection.
 */

import { PERIOD_CHANGE_EVENT, FILTERS_RESET_EVENT } from '@/lib/constants/events';

interface PeriodOption {
  value: string;
  label: string;
}

// Track initialized navigators to avoid duplicate handlers
const initializedNavigators = new WeakSet<Element>();
const resetSyncControllers = new Set<AbortController>();

function cleanupPeriodNavigatorListeners(): void {
  resetSyncControllers.forEach((controller) => {
    controller.abort();
  });
  resetSyncControllers.clear();
}

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
    const newestFirst = navigator.getAttribute('data-newest-first') === 'true';

    const hasPrevAt = (index: number): boolean =>
      newestFirst ? index < availableOptions.length - 1 : index > 0;
    const hasNextAt = (index: number): boolean =>
      newestFirst ? index > 0 : index < availableOptions.length - 1;
    const prevIndexAt = (index: number): number => (newestFirst ? index + 1 : index - 1);
    const nextIndexAt = (index: number): number => (newestFirst ? index - 1 : index + 1);

    // Update dropdown active highlight to match current selection
    function updateDropdownHighlight() {
      const currentValue = periodInput.value;
      navigator.querySelectorAll('[data-period-option]').forEach((btn) => {
        const el = btn as HTMLElement;
        if (el.dataset.periodOption === currentValue) {
          el.classList.add('bg-primary/10', 'text-primary');
        } else {
          el.classList.remove('bg-primary/10', 'text-primary');
        }
      });
    }

    // Update navigation button states
    function updateNavButtons() {
      const currentPeriod = periodInput.value;
      const currentIndex = availableOptions.findIndex((option) => option.value === currentPeriod);

      if (prevBtn) {
        const hasPrev = hasPrevAt(currentIndex);
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
        const hasNext = hasNextAt(currentIndex);
        nextBtn.disabled = !hasNext;
        nextBtn.setAttribute('aria-disabled', hasNext ? 'false' : 'true');
        nextBtn.setAttribute('data-has-next', hasNext ? 'true' : 'false');

        if (hasNext) {
          nextBtn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
        } else {
          nextBtn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
        }
      }

      updateDropdownHighlight();
    }

    // Set period programmatically (used by filtersReset)
    function setPeriod(value: string) {
      const option = availableOptions.find((o) => o.value === value);
      if (!option) return;
      periodInput.value = option.value;
      periodLabel.textContent = option.label;
      updateNavButtons();
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
          new CustomEvent(PERIOD_CHANGE_EVENT, {
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
        const prevIndex = prevIndexAt(currentIndex);

        if (prevIndex >= 0 && prevIndex < availableOptions.length) {
          const prevOption = availableOptions[prevIndex];
          periodInput.value = prevOption.value;
          periodLabel.textContent = prevOption.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent(PERIOD_CHANGE_EVENT, {
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
        const nextIndex = nextIndexAt(currentIndex);

        if (nextIndex >= 0 && nextIndex < availableOptions.length) {
          const nextOption = availableOptions[nextIndex];
          periodInput.value = nextOption.value;
          periodLabel.textContent = nextOption.label;

          // Update nav button states
          updateNavButtons();

          // Dispatch custom event
          window.dispatchEvent(
            new CustomEvent(PERIOD_CHANGE_EVENT, {
              detail: { period: nextOption.value, label: nextOption.label },
            })
          );
        }
      });
    }

    // Listen for filters reset to restore current month
    const resetSyncController = new AbortController();
    resetSyncControllers.add(resetSyncController);
    window.addEventListener(
      FILTERS_RESET_EVENT,
      (e: Event) => {
        const { month } = (e as CustomEvent).detail || {};
        if (month) setPeriod(month);
      },
      { signal: resetSyncController.signal }
    );

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
document.addEventListener('astro:before-swap', cleanupPeriodNavigatorListeners);
