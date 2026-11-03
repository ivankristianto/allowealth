import { beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';
import { initTransactionCardMenuNav } from './TransactionCardMenu.client';

const CARD_HTML = `
  <div class="dropdown" data-transaction-actions>
    <button type="button" tabindex="0" aria-label="Transaction actions" aria-haspopup="menu">...</button>
    <ul tabindex="0" class="dropdown-content menu" role="menu">
      <li role="none"><button type="button" role="menuitem" disabled>History</button></li>
      <li role="none"><button type="button" role="menuitem">Edit</button></li>
      <li role="none"><button type="button" role="menuitem">Duplicate</button></li>
      <li role="none"><button type="button" role="menuitem">Delete</button></li>
    </ul>
  </div>
  <button type="button" data-outside>Next card</button>
`;

describe('transaction card actions menu keyboard handling', () => {
  let window: Window;
  let document: Document;
  let dropdown: HTMLElement;
  let trigger: HTMLButtonElement;
  let items: HTMLButtonElement[];

  const press = (target: Element, key: string): KeyboardEvent => {
    const event = new window.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    }) as unknown as KeyboardEvent;
    target.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    window = new Window({ url: 'http://localhost/transactions' });
    document = window.document as unknown as Document;
    document.body.innerHTML = CARD_HTML;
    initTransactionCardMenuNav(document);

    dropdown = document.querySelector<HTMLElement>('[data-transaction-actions]')!;
    trigger = dropdown.querySelector<HTMLButtonElement>('button[aria-haspopup]')!;
    items = Array.from(dropdown.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
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

  it('clears the closed state when focus leaves the dropdown', () => {
    trigger.focus();
    press(trigger, 'Escape');

    document.querySelector<HTMLButtonElement>('[data-outside]')!.focus();

    expect(dropdown.classList.contains('dropdown-close')).toBe(false);
  });

  it('cycles through enabled items with the arrow keys, skipping disabled ones', () => {
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

  it('ignores Escape outside a transaction menu', () => {
    const outside = document.querySelector<HTMLButtonElement>('[data-outside]')!;
    outside.focus();

    const event = press(outside, 'Escape');

    expect(event.defaultPrevented).toBe(false);
    expect(dropdown.classList.contains('dropdown-close')).toBe(false);
  });
});
