const DROPDOWN_SELECTOR = '[data-transaction-actions]';
const TRIGGER_SELECTOR = 'button[aria-haspopup]';
// DaisyUI opens `.dropdown` on :focus-within, so closing it while focus stays on the trigger needs this override class.
const CLOSED_CLASS = 'dropdown-close';

const initializedDocuments = new WeakSet<Document>();

function asElement(target: EventTarget | null): Element | null {
  return target && 'closest' in target ? (target as Element) : null;
}

function findDropdown(target: EventTarget | null): HTMLElement | null {
  return asElement(target)?.closest<HTMLElement>(DROPDOWN_SELECTOR) ?? null;
}

function moveFocusWithinMenu(event: KeyboardEvent, menu: HTMLElement, doc: Document): void {
  const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
  if (items.length === 0) return;

  event.preventDefault();
  const currentIndex = items.indexOf(doc.activeElement as HTMLElement);
  const lastIndex = items.length - 1;
  const nextIndex =
    event.key === 'ArrowDown'
      ? currentIndex < lastIndex
        ? currentIndex + 1
        : 0
      : currentIndex > 0
        ? currentIndex - 1
        : lastIndex;
  items[nextIndex]?.focus();
}

function closeMenu(event: KeyboardEvent, dropdown: HTMLElement): void {
  if (dropdown.classList.contains(CLOSED_CLASS)) return;

  event.preventDefault();
  dropdown.classList.add(CLOSED_CLASS);
  dropdown.querySelector<HTMLElement>(TRIGGER_SELECTOR)?.focus();
}

function handleKeydown(event: KeyboardEvent, doc: Document): void {
  const dropdown = findDropdown(event.target);
  if (!dropdown) return;

  if (event.key === 'Escape') {
    closeMenu(event, dropdown);
    return;
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

  const menu = asElement(event.target)?.closest<HTMLElement>('[role="menu"]');
  if (menu) moveFocusWithinMenu(event, menu, doc);
}

function handleTriggerClick(event: MouseEvent): void {
  if (!asElement(event.target)?.closest(TRIGGER_SELECTOR)) return;
  findDropdown(event.target)?.classList.remove(CLOSED_CLASS);
}

function handleFocusOut(event: FocusEvent): void {
  const dropdown = findDropdown(event.target);
  if (!dropdown || dropdown.contains(event.relatedTarget as Node | null)) return;
  dropdown.classList.remove(CLOSED_CLASS);
}

/** Delegated listeners so cards injected after load get keyboard support without re-binding. */
export function initTransactionCardMenuNav(doc: Document = document): void {
  if (initializedDocuments.has(doc)) return;
  initializedDocuments.add(doc);

  doc.addEventListener('keydown', (event) => handleKeydown(event, doc));
  doc.addEventListener('click', handleTriggerClick);
  doc.addEventListener('focusout', handleFocusOut);
}
