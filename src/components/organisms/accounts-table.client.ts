const VIEW_STORAGE_KEY = 'accounts-view-mode';
const SORT_ICON_TYPES = ['neutral', 'asc', 'desc'] as const;

type ViewMode = 'card' | 'table';
type SortColumn = 'name' | 'type' | 'category' | 'owner' | 'balance' | 'updated';
type SortDirection = 'asc' | 'desc';

type SortState = {
  column: SortColumn;
  direction: SortDirection;
};

const NUMERIC_SORT_COLUMNS = new Set<SortColumn>(['balance', 'updated']);
const SORT_COLUMNS: SortColumn[] = ['name', 'type', 'category', 'owner', 'balance', 'updated'];
const DEFAULT_SORT: SortState = { column: 'balance', direction: 'desc' };

let controller: AbortController | null = null;
let currentSort: SortState = { ...DEFAULT_SORT };

function isSortColumn(value: string | undefined): value is SortColumn {
  return SORT_COLUMNS.includes(value as SortColumn);
}

function readStoredViewMode(): ViewMode | null {
  try {
    const value = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return value === 'card' || value === 'table' ? value : null;
  } catch {
    return null;
  }
}

function writeStoredViewMode(mode: ViewMode): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    // Ignore storage failures in restricted browsing contexts.
  }
}

function findViewScope(toggle: HTMLElement): ParentNode {
  let current: HTMLElement | null = toggle;

  while (current) {
    const hasCardView = !!current.querySelector('[data-view="card"]');
    const hasTableView = !!current.querySelector('[data-view="table"]');

    if (hasCardView && hasTableView) {
      return current;
    }

    current = current.parentElement;
  }

  return document;
}

function getViewContainer(scope: ParentNode, mode: ViewMode): HTMLElement | null {
  return scope.querySelector<HTMLElement>(`[data-view="${mode}"]`);
}

function getDefaultViewMode(toggle: HTMLElement): ViewMode {
  const controls = toggle.closest<HTMLElement>('[data-account-filter-controls]');
  const defaultView = controls?.dataset.defaultView;
  return defaultView === 'table' ? 'table' : 'card';
}

function reapplyActiveSearch(scope: ParentNode): void {
  const searchInput = scope.querySelector<HTMLInputElement>('[data-account-search]');
  if (!searchInput) return;

  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function applyViewMode(toggle: HTMLElement, mode: ViewMode): void {
  const scope = findViewScope(toggle);
  const cardView = getViewContainer(scope, 'card');
  const tableView = getViewContainer(scope, 'table');

  if (cardView) {
    cardView.classList.toggle('hidden', mode !== 'card');
  }

  if (tableView) {
    tableView.classList.toggle('hidden', mode !== 'table');
  }

  toggle.querySelectorAll<HTMLButtonElement>('[data-view-mode]').forEach((button) => {
    const isActive = button.dataset.viewMode === mode;
    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('btn-active', isActive);
  });

  writeStoredViewMode(mode);
  reapplyActiveSearch(scope);
}

function getInitialViewMode(toggle: HTMLElement): ViewMode {
  return readStoredViewMode() ?? getDefaultViewMode(toggle);
}

function getComparableValue(row: HTMLTableRowElement, column: SortColumn): number | string {
  const rawValue = row.dataset[`sort${column.charAt(0).toUpperCase()}${column.slice(1)}`] ?? '';

  if (NUMERIC_SORT_COLUMNS.has(column)) {
    const numericValue = Number.parseFloat(rawValue);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  return rawValue;
}

function compareRows(
  left: HTMLTableRowElement,
  right: HTMLTableRowElement,
  sort: SortState
): number {
  const leftValue = getComparableValue(left, sort.column);
  const rightValue = getComparableValue(right, sort.column);

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return sort.direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
  }

  const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
    sensitivity: 'base',
    numeric: true,
  });

  return sort.direction === 'asc' ? comparison : -comparison;
}

function updateSortIndicators(table: HTMLElement, sort: SortState): void {
  table.querySelectorAll<HTMLElement>('[data-sort-indicator]').forEach((indicator) => {
    const indicatorColumn = indicator.dataset.sortIndicator;
    const isActive = indicatorColumn === sort.column;
    const activeIcon = isActive ? sort.direction : 'neutral';

    for (const iconType of SORT_ICON_TYPES) {
      const icon = indicator.querySelector<HTMLElement>(`[data-sort-icon="${iconType}"]`);
      if (icon) icon.classList.toggle('hidden', iconType !== activeIcon);
    }

    indicator.classList.toggle('text-base-content/20', !isActive);
    indicator.classList.toggle('text-base-content/60', isActive);
  });

  table.querySelectorAll<HTMLElement>('[data-sort-key]').forEach((header) => {
    const headerColumn = header.dataset.sortKey;
    const ariaSort =
      headerColumn === sort.column
        ? sort.direction === 'asc'
          ? 'ascending'
          : 'descending'
        : 'none';

    header.setAttribute('aria-sort', ariaSort);
  });
}

function sortTableGroups(table: HTMLElement, sort: SortState): void {
  const tbody = table.querySelector<HTMLTableSectionElement>('tbody');
  if (!tbody) return;

  const rows = Array.from(tbody.children).filter(
    (child): child is HTMLTableRowElement => child instanceof HTMLTableRowElement
  );

  let index = 0;

  while (index < rows.length) {
    const headerRow = rows[index];
    if (!headerRow?.hasAttribute('data-group-header')) {
      index += 1;
      continue;
    }

    index += 1;
    const groupRows: Array<{
      row: HTMLTableRowElement;
      historyWrapper?: HTMLTableRowElement;
    }> = [];

    while (index < rows.length && !rows[index]?.hasAttribute('data-group-header')) {
      const candidateRow = rows[index];
      if (candidateRow?.hasAttribute('data-account-table-row')) {
        const historyWrapper = rows[index + 1];
        const candidateAccountId = candidateRow.getAttribute('data-account-table-row');
        const matchingWrapper =
          historyWrapper?.hasAttribute('data-history-wrapper') &&
          historyWrapper.getAttribute('data-account-id') === candidateAccountId
            ? historyWrapper
            : undefined;

        groupRows.push({ row: candidateRow, historyWrapper: matchingWrapper });

        if (matchingWrapper) {
          index += 1;
        }
      }
      index += 1;
    }

    const sortedRows = [...groupRows].sort((left, right) => compareRows(left.row, right.row, sort));
    let insertAfter: ChildNode | null = headerRow;

    for (const entry of sortedRows) {
      tbody.insertBefore(entry.row, insertAfter?.nextSibling ?? null);
      insertAfter = entry.row;

      if (entry.historyWrapper) {
        tbody.insertBefore(entry.historyWrapper, insertAfter?.nextSibling ?? null);
        insertAfter = entry.historyWrapper;
      }
    }
  }

  updateSortIndicators(table, sort);
}

function getNextSortState(column: SortColumn): SortState {
  if (currentSort.column === column) {
    return {
      column,
      direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
    };
  }

  return {
    column,
    direction: column === 'balance' ? 'desc' : 'asc',
  };
}

function initViewToggle(signal: AbortSignal): void {
  document.querySelectorAll<HTMLElement>('[data-view-toggle]').forEach((toggle) => {
    const buttons = toggle.querySelectorAll<HTMLButtonElement>('[data-view-mode]');
    if (buttons.length === 0) return;

    applyViewMode(toggle, getInitialViewMode(toggle));

    buttons.forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          const mode = button.dataset.viewMode === 'table' ? 'table' : 'card';
          applyViewMode(toggle, mode);
        },
        { signal }
      );
    });
  });
}

function initColumnSorting(signal: AbortSignal): void {
  document.querySelectorAll<HTMLElement>('[data-account-table]').forEach((table) => {
    sortTableGroups(table, currentSort);

    table.querySelectorAll<HTMLElement>('[data-sort-key]').forEach((header) => {
      const column = header.dataset.sortKey;
      if (!isSortColumn(column)) return;

      header.addEventListener(
        'click',
        () => {
          currentSort = getNextSortState(column);
          sortTableGroups(table, currentSort);
        },
        { signal }
      );
    });
  });
}

function initAccountsTableClient(): void {
  controller?.abort();
  controller = new AbortController();

  currentSort = { ...DEFAULT_SORT };

  initViewToggle(controller.signal);
  initColumnSorting(controller.signal);
}

function cleanupAccountsTableClient(): void {
  controller?.abort();
  controller = null;
}

export { initAccountsTableClient };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccountsTableClient, { once: true });
} else {
  initAccountsTableClient();
}

document.addEventListener('astro:page-load', initAccountsTableClient);
document.addEventListener('astro:before-swap', cleanupAccountsTableClient);
