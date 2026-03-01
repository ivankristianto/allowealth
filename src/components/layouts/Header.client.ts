import { FILTERS_RESET_EVENT, PERIOD_CHANGE_EVENT } from '@/lib/constants/events';

let controller: AbortController | null = null;

function dispatchDrawerOpenEvent(): void {
  document.dispatchEvent(new CustomEvent('open-transaction-drawer'));
}

function getDrawerToggle(): HTMLInputElement | null {
  const drawerToggle = document.getElementById('drawer-toggle');
  return drawerToggle instanceof HTMLInputElement ? drawerToggle : null;
}

function syncDrawerToggleState(isOpen: boolean): void {
  const drawerButtons = document.querySelectorAll<HTMLElement>('[data-drawer-open]');
  drawerButtons.forEach((button) => {
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

function handleHeaderClick(event: Event): void {
  const target = event.target as HTMLElement | null;
  const trigger =
    target?.closest('[data-open-transaction-drawer]') ?? target?.closest('#bulk-entry-button');
  if (!trigger) return;

  dispatchDrawerOpenEvent();
}

function setHeaderSubtitle(label: string): void {
  const subtitle = document.querySelector('[data-header-subtitle]');
  if (subtitle) subtitle.textContent = label;
}

function resolvePeriodLabel(period: string): string | null {
  const periodOption = document.querySelector<HTMLElement>(`[data-period-option="${period}"]`);
  if (!periodOption) return null;
  return periodOption.dataset.periodLabel || periodOption.textContent?.trim() || null;
}

function initHeaderListeners(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  const drawerToggle = getDrawerToggle();
  if (drawerToggle) {
    syncDrawerToggleState(drawerToggle.checked);
    drawerToggle.addEventListener('change', () => syncDrawerToggleState(drawerToggle.checked), {
      signal,
    });
  }

  const drawerOpenButtons = document.querySelectorAll<HTMLElement>('[data-drawer-open]');
  drawerOpenButtons.forEach((button) => {
    button.addEventListener(
      'click',
      () => {
        const toggle = getDrawerToggle();
        if (!toggle) return;
        toggle.checked = true;
        syncDrawerToggleState(true);
      },
      { signal }
    );
  });

  document.addEventListener('click', handleHeaderClick, { signal });

  // Update subtitle when period changes (e.g., month navigation)
  window.addEventListener(
    PERIOD_CHANGE_EVENT,
    (e: Event) => {
      const { label } = (e as CustomEvent).detail;
      if (!label) return;
      setHeaderSubtitle(label);
    },
    { signal }
  );

  // Reset filters emits month key only; resolve to human-readable label for subtitle.
  window.addEventListener(
    FILTERS_RESET_EVENT,
    (e: Event) => {
      const { month } = (e as CustomEvent).detail || {};
      if (!month) return;
      const label = resolvePeriodLabel(month);
      if (label) setHeaderSubtitle(label);
    },
    { signal }
  );
}

initHeaderListeners();
document.addEventListener('astro:page-load', initHeaderListeners);
