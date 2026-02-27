/**
 * Transaction Selection Store
 *
 * Manages selected transaction IDs for bulk operations.
 * Selection is page-scoped and should be cleared on filter/pagination/navigation changes.
 */

import { atom, computed } from 'nanostores';

/** Set of currently selected transaction IDs. */
export const selectedTransactionIds = atom<Set<string>>(new Set());

/** Number of selected transactions. */
export const selectedCount = computed(selectedTransactionIds, (ids) => ids.size);

/** Whether there is at least one selected transaction. */
export const hasSelection = computed(selectedTransactionIds, (ids) => ids.size > 0);

/** Toggle selection for one transaction ID. */
export function toggleSelection(id: string): void {
  const current = new Set(selectedTransactionIds.get());
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  selectedTransactionIds.set(current);
}

/** Select all given transaction IDs. */
export function selectAll(ids: string[]): void {
  selectedTransactionIds.set(new Set(ids));
}

/** Clear all selected transaction IDs. */
export function clearSelection(): void {
  selectedTransactionIds.set(new Set());
}

/** Check whether the given ID is currently selected. */
export function isSelected(id: string): boolean {
  return selectedTransactionIds.get().has(id);
}

/** Get selected IDs as an array. */
export function getSelectedIds(): string[] {
  return Array.from(selectedTransactionIds.get());
}
