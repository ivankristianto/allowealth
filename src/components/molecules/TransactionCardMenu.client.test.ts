import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';
import { initTransactionCardMenuNav } from './TransactionCardMenu.client';

// Mirrors TransactionCard.astro for a card without edit history (aria-disabled, not disabled).
const CARD_HTML = `
  <div class="dropdown dropdown-end" data-transaction-actions>
    <button type="button" tabindex="0" aria-label="Transaction actions" aria-haspopup="menu">...</button>
    <ul tabindex="0" class="dropdown-content menu" role="menu">
      <li role="none" class="disabled opacity-40">
        <button type="button" role="menuitem" aria-label="No edit history available" aria-disabled="true">History</button>
      </li>
      <li role="none"><button type="button" role="menuitem" aria-disabled="false">Edit</button></li>
      <li role="none"><button type="button" role="menuitem">Convert to recurring</button></li>
      <li role="none"><button type="button" role="menuitem">Delete</button></li>
    </ul>
  </div>
  <button type="button" data-outside>Next card</button>
`;

describe('transaction card actions menu keyboard handling', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let testWindow: Window;
  let dropdown: HTMLElement;
  let trigger: HTMLButtonElement;
  let items: HTMLButtonElement[];
  let outside: HTMLButtonElement;

  const press = (target: Element, key: string): KeyboardEvent => {
    const event = new testWindow.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    }) as unknown as KeyboardEvent;
    target.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;

    testWindow = new Window({ url: 'http://localhost/transactions' });
    (globalThis as Record<string, unknown>).window = testWindow;
    (globalThis as Record<string, unknown>).document = testWindow.document;

    document.body.innerHTML = CARD_HTML;
    initTransactionCardMenuNav();

    dropdown = document.querySelector<HTMLElement>('[data-transaction-actions]')!;
    trigger = dropdown.querySelector<HTMLButtonElement>('button[aria-haspopup]')!;
    items = Array.from(dropdown.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    outside = document.querySelector<HTMLButtonElement>('[data-outside]')!;
  });

  afterEach(() => {
    window.__transactionCardMenuController?.abort();
    testWindow.close();
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
  });

  it('closes a just-opened menu when Escape is pressed on the trigger', () => {
    trigger.focus();

    const event = press(trigger, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(dropdown.classList.contains('dropdown-close')).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes the menu and returns focus to the trigger when Escape is pressed on an item', () => {
    items[1]!.focus();

    press(items[1]!, 'Escape');

    expect(dropdown.classList.contains('dropdown-close')).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it('lets Escape through once the menu is already closed', () => {
    trigger.focus();
    press(trigger, 'Escape');

    const second = press(trigger, 'Escape');

    expect(second.defaultPrevented).toBe(false);
  });

  it('reopens the menu when the trigger is clicked again', () => {
    trigger.focus();
    press(trigger, 'Escape');

    trigger.click();

    expect(dropdown.classList.contains('dropdown-close')).toBe(false);
  });

  it('clears the closed state when focus moves outside the dropdown', () => {
    trigger.focus();
    press(trigger, 'Escape');

    outside.focus();

    expect(dropdown.classList.contains('dropdown-close')).toBe(false);
  });

  it('keeps the menu closed when the window loses focus', () => {
    trigger.focus();
    press(trigger, 'Escape');

    trigger.dispatchEvent(
      new testWindow.FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: null,
      }) as unknown as FocusEvent
    );

    expect(dropdown.classList.contains('dropdown-close')).toBe(true);
  });

  it('cycles through enabled items with the arrow keys, skipping aria-disabled ones', () => {
    items[1]!.focus();

    press(items[1]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[2]);

    press(items[2]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[3]);

    press(items[3]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);

    press(items[1]!, 'ArrowUp');
    expect(document.activeElement).toBe(items[3]);
  });

  it('moves one item per key press after being initialized again', () => {
    initTransactionCardMenuNav();
    items[1]!.focus();

    press(items[1]!, 'ArrowDown');

    expect(document.activeElement).toBe(items[2]);
  });

  it('ignores Escape outside a transaction menu', () => {
    outside.focus();

    const event = press(outside, 'Escape');

    expect(event.defaultPrevented).toBe(false);
    expect(dropdown.classList.contains('dropdown-close')).toBe(false);
  });
});
