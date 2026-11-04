const DROPDOWN_SELECTOR = '[data-transaction-actions]';
const TRIGGER_SELECTOR = 'button[aria-haspopup]';
const MENU_SELECTOR = '[role="menu"]';
// The card marks a missing history entry with aria-disabled, not the disabled attribute.
const ENABLED_ITEM_SELECTOR = '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])';
// DaisyUI opens `.dropdown` on :focus-within, so closing it while focus stays on the trigger needs this override class.
const CLOSED_CLASS = 'dropdown-close';

declare global {
  interface Window {
    __transactionCardMenuController?: AbortController;
  }
}

function closestFromTarget(target: EventTarget | null, selector: string): HTMLElement | null {
  if (!target || !('closest' in target)) return null;
  return (target as Element).closest<HTMLElement>(selector);
}

function nextItemIndex(key: string, currentIndex: number, itemCount: number): number {
  const lastIndex = itemCount - 1;
  if (key === 'ArrowDown') {
    return currentIndex < lastIndex ? currentIndex + 1 : 0;
  }
  return currentIndex > 0 ? currentIndex - 1 : lastIndex;
}

function moveFocusWithinMenu(event: KeyboardEvent, menu: HTMLElement): void {
  const items = Array.from(menu.querySelectorAll<HTMLElement>(ENABLED_ITEM_SELECTOR));
  if (items.length === 0) return;

  event.preventDefault();
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  items[nextItemIndex(event.key, currentIndex, items.length)]?.focus();
}

function closeMenu(event: KeyboardEvent, dropdown: HTMLElement): void {
  if (dropdown.classList.contains(CLOSED_CLASS)) return;

  event.preventDefault();
  dropdown.classList.add(CLOSED_CLASS);
  dropdown.querySelector<HTMLElement>(TRIGGER_SELECTOR)?.focus();
}

function handleKeydown(event: KeyboardEvent): void {
  const dropdown = closestFromTarget(event.target, DROPDOWN_SELECTOR);
  if (!dropdown) return;

  if (event.key === 'Escape') {
    closeMenu(event, dropdown);
    return;
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

  const menu = closestFromTarget(event.target, MENU_SELECTOR);
  if (menu) moveFocusWithinMenu(event, menu);
}

function handleTriggerClick(event: MouseEvent): void {
  const trigger = closestFromTarget(event.target, TRIGGER_SELECTOR);
  trigger?.closest(DROPDOWN_SELECTOR)?.classList.remove(CLOSED_CLASS);
}

function handleFocusOut(event: FocusEvent): void {
  // A null relatedTarget means the window lost focus; the browser refocuses the trigger on return, which must not reopen the menu.
  if (!event.relatedTarget) return;

  const dropdown = closestFromTarget(event.target, DROPDOWN_SELECTOR);
  if (!dropdown || dropdown.contains(event.relatedTarget as Node)) return;
  dropdown.classList.remove(CLOSED_CLASS);
}

/** Delegated listeners so cards injected after load get keyboard support without re-binding. */
export function initTransactionCardMenuNav(): void {
  window.__transactionCardMenuController?.abort();
  const controller = new AbortController();
  window.__transactionCardMenuController = controller;
  const { signal } = controller;

  document.addEventListener('keydown', handleKeydown, { signal });
  document.addEventListener('click', handleTriggerClick, { signal });
  document.addEventListener('focusout', handleFocusOut, { signal });
}
