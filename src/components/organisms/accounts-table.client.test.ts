import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Window } from 'happy-dom';

describe('accounts-table client sorting', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalEvent: typeof globalThis.Event | undefined;
  let originalHTMLElement: typeof globalThis.HTMLElement | undefined;
  let originalHTMLTableRowElement: typeof globalThis.HTMLTableRowElement | undefined;
  let originalLocalStorage: typeof globalThis.localStorage | undefined;
  let initAccountsTableClient: typeof import('./accounts-table.client').initAccountsTableClient;

  beforeEach(async () => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalEvent = globalThis.Event;
    originalHTMLElement = globalThis.HTMLElement;
    originalHTMLTableRowElement = globalThis.HTMLTableRowElement;
    originalLocalStorage = globalThis.localStorage;

    const window = new Window({ url: 'http://localhost/accounts' });
    const { document } = window;
    (window as unknown as { SyntaxError: typeof SyntaxError }).SyntaxError = SyntaxError;

    (globalThis as Record<string, unknown>).window = window;
    (globalThis as Record<string, unknown>).document = document;
    (globalThis as Record<string, unknown>).Event = window.Event;
    (globalThis as Record<string, unknown>).HTMLElement = window.HTMLElement;
    (globalThis as Record<string, unknown>).HTMLTableRowElement = window.HTMLTableRowElement;

    document.body.innerHTML = `
      <section>
        <div data-account-filter-controls data-default-view="table">
          <div data-view-toggle>
            <button type="button" data-view-mode="card" aria-pressed="false"></button>
            <button type="button" data-view-mode="table" aria-pressed="true"></button>
          </div>
        </div>
        <div data-view="card" class="hidden"></div>
        <div data-view="table">
          <div data-account-table>
            <table>
              <thead>
                <tr>
                  <th data-sort-key="balance" aria-sort="none">
                    <span data-sort-indicator="balance">^v</span>
                  </th>
                  <th data-sort-key="updated" aria-sort="none">
                    <span data-sort-indicator="updated">^v</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr data-group-header="liquid"></tr>
                <tr data-account-table-row="high" data-sort-balance="100" data-sort-updated="200"></tr>
                <tr data-account-table-row="mid" data-sort-balance="50" data-sort-updated="100"></tr>
                <tr data-account-table-row="low" data-sort-balance="10" data-sort-updated="300"></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    ({ initAccountsTableClient } = await import('./accounts-table.client'));
  });

  afterEach(() => {
    document.dispatchEvent(new Event('astro:before-swap'));
    (globalThis as Record<string, unknown>).window = originalWindow;
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).Event = originalEvent;
    (globalThis as Record<string, unknown>).HTMLElement = originalHTMLElement;
    (globalThis as Record<string, unknown>).HTMLTableRowElement = originalHTMLTableRowElement;
    (globalThis as Record<string, unknown>).localStorage = originalLocalStorage;
  });

  function getRowOrder(): string[] {
    return Array.from(document.querySelectorAll('[data-account-table-row]')).map(
      (row) => row.getAttribute('data-account-table-row') || ''
    );
  }

  it('applies balance descending as the default table sort on init', () => {
    initAccountsTableClient();

    expect(getRowOrder()).toEqual(['high', 'mid', 'low']);
    expect(document.querySelector('[data-sort-key="balance"]')?.getAttribute('aria-sort')).toBe(
      'descending'
    );
  });

  it('sorts updated ascending on the first click', () => {
    initAccountsTableClient();

    const updatedHeader = document.querySelector('[data-sort-key="updated"]');
    if (!updatedHeader) {
      throw new Error('Expected updated sort header');
    }

    updatedHeader.dispatchEvent(new Event('click', { bubbles: true }));

    expect(getRowOrder()).toEqual(['mid', 'high', 'low']);
    expect(updatedHeader.getAttribute('aria-sort')).toBe('ascending');
  });
});
