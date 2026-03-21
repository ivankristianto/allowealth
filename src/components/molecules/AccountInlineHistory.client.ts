import { csrfFetch } from '@/lib/csrf-client';

let activeControl: HTMLElement | null = null;
const initializedRows = new WeakSet<Element>();
const initializedInlineHistoryButtons = new WeakSet<Element>();

function getControlAccountId(control: HTMLElement): string | null {
  return (
    control.getAttribute('data-history-account') ||
    control.getAttribute('data-account-row') ||
    control.getAttribute('data-account-id')
  );
}

function getControlledContainer(control: HTMLElement): HTMLElement | null {
  const containerId = control.getAttribute('aria-controls');
  if (!containerId) return null;

  const controlledElement = document.getElementById(containerId);
  if (!controlledElement) return null;

  if (controlledElement.hasAttribute('data-history-wrapper')) {
    return controlledElement.querySelector<HTMLElement>('[data-history-container]');
  }

  return controlledElement;
}

function getHistoryWrapper(container: HTMLElement): HTMLElement {
  return container.closest<HTMLElement>('[data-history-wrapper]') || container;
}

function setExpandedState(control: HTMLElement, expanded: boolean) {
  control.setAttribute('aria-expanded', String(expanded));

  const accountId = getControlAccountId(control);
  if (!accountId || !control.hasAttribute('data-account-row')) return;

  document
    .querySelectorAll<HTMLElement>(`[data-expand-chevron="${CSS.escape(accountId)}"]`)
    .forEach((chevron) => {
      chevron.classList.toggle('rotate-180', expanded);
    });
}

function collapseHistory(control: HTMLElement): void {
  const container = getControlledContainer(control);
  if (!container) return;

  const wrapper = getHistoryWrapper(container);
  wrapper.classList.add('hidden');
  setExpandedState(control, false);
}

async function toggleHistory(control: HTMLElement) {
  const accountId = getControlAccountId(control);
  const container = getControlledContainer(control);

  if (!accountId || !container) return;

  const wrapper = getHistoryWrapper(container);

  // Toggle: collapse if same account clicked again
  if (activeControl === control) {
    collapseHistory(control);
    activeControl = null;
    return;
  }

  // Collapse previous
  if (activeControl) {
    collapseHistory(activeControl);
  }

  // Show loading skeleton
  container.innerHTML =
    '<div class="flex justify-center py-4"><span class="loading loading-spinner loading-md"></span></div>';
  wrapper.classList.remove('hidden');
  setExpandedState(control, true);
  activeControl = control;

  try {
    // Fetch server-rendered HTML
    const res = await csrfFetch(`/api/accounts/${accountId}/history?limit=10&_render=html`);
    const html = await res.text();

    // Inject server-rendered HTML directly
    container.innerHTML = html;
  } catch {
    container.innerHTML =
      '<p class="text-sm text-error text-center py-2">Failed to load history.</p>';
  }
}

export function initInlineHistory() {
  // Reset stale state from previous page navigations
  if (activeControl) {
    collapseHistory(activeControl);
  }
  activeControl = null;

  // Row click/keyboard to toggle history (skip if clicking buttons/links/dropdown menus)
  document.querySelectorAll<HTMLElement>('[data-account-row]').forEach((row) => {
    if (initializedRows.has(row)) return;
    initializedRows.add(row);

    const accountId = row.dataset.accountId;
    const historyContainerId = accountId ? `account-history-${accountId}` : undefined;

    row.classList.add('cursor-pointer');
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', `Toggle ${row.dataset.accountName || 'account'} history`);
    if (historyContainerId) {
      row.setAttribute('aria-controls', historyContainerId);
      // Set matching id on the history container
      const container = document.querySelector(
        `[data-history-container][data-account-id="${CSS.escape(accountId!)}"]`
      );
      if (container) container.id = historyContainerId;
    }

    row.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if clicking a button, link, dropdown menu, or within one
      if (target.closest('button, a, [data-dropdown-menu]')) return;

      toggleHistory(row);
    });

    row.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      // Don't toggle if key event originated from a child interactive element
      if (
        target !== row &&
        target.closest('button, a, input, select, textarea, [data-dropdown-menu]')
      )
        return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleHistory(row);
      } else if (e.key === 'Escape') {
        if (activeControl === row) toggleHistory(row);
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-inline-history-toggle]').forEach((button) => {
    if (initializedInlineHistoryButtons.has(button)) return;
    initializedInlineHistoryButtons.add(button);

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleHistory(button);
    });
  });
}

function cleanupInlineHistoryState(): void {
  if (activeControl) {
    collapseHistory(activeControl);
  }
  activeControl = null;
}

document.addEventListener('astro:page-load', initInlineHistory);
document.addEventListener('astro:before-swap', cleanupInlineHistoryState);
